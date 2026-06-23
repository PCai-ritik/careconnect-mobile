/**
 * CareConnect — Video Consultation Room (Caregiver)
 *
 * Full-screen immersive layout:
 *   - Dark slate background with remote doctor's video feed
 *   - Floating header with back button, call timer, doctor name
 *   - Picture-in-Picture self-view (bottom right)
 *   - Floating translucent pill with call controls (mic, video, notes, end)
 *   - "Live Notes" bottom sheet modal (50% screen)
 *
 * Wired to LiveKit via @livekit/react-native.
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    Modal,
    TextInput,
    StyleSheet,
    Dimensions,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useActiveCall } from '@/providers/ActiveCallProvider';
import {
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { getJoinToken, getMyAppointments } from '@/services/caregiver';
import { Camera } from 'expo-camera';

// LiveKit — conditional import for Expo Go compatibility
import { LIVEKIT_AVAILABLE } from '@/services/livekit';

let LiveKitRoom: any = null;
let VideoView: any = null;
let useTracks: any = () => [];
let useLocalParticipant: any = () => ({ localParticipant: null });
let useRemoteParticipants: any = () => [];
let AudioSession: any = { startAudioSession: async () => { }, stopAudioSession: async () => { } };
let isTrackReference: any = () => false;
let Track: any = { Source: { Camera: 'camera', Microphone: 'microphone' } };

if (LIVEKIT_AVAILABLE) {
    try {
        const lk = require('@livekit/react-native');
        LiveKitRoom = lk.LiveKitRoom;
        VideoView = lk.VideoView
        useTracks = lk.useTracks;
        useLocalParticipant = lk.useLocalParticipant;
        useRemoteParticipants = lk.useRemoteParticipants;
        AudioSession = lk.AudioSession;
        isTrackReference = lk.isTrackReference;
        Track = require('livekit-client').Track;
    } catch { }
}

const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL ?? '';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const NOTES_SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

// ─── Colors (video-specific) ────────────────────────────────────────────────

const VC = {
    bg: '#0F172A',
    surface: '#1E293B',
    surfaceLight: '#334155',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    green: '#22C55E',
    red: '#EF4444',
    controlPill: 'rgba(15, 23, 42, 0.75)',
    controlBg: 'rgba(255,255,255,0.12)',
    controlBgActive: 'rgba(255,255,255,0.22)',
    pipBg: '#1E293B',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ConsultationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const { token } = useAuth();
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const statusStyles = useStatusStyles(colors);
    const { activeCall, minimizeCall, clearCall } = useActiveCall();
    const activeCallRef = useRef(activeCall);
    useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

    const [hasPermissions, setHasPermissions] = useState(false);
    const [audioReady, setAudioReady] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync();
            setHasPermissions(status === 'granted' && audioStatus === 'granted');
        })();
    }, []);

    // -- State --
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const [doctorName, setDoctorName] = useState('Doctor');

    // -- LiveKit connection --
    const [joinTokenStr, setJoinTokenStr] = useState<string | null>(null);
    const [lkError, setLkError] = useState<string | null>(null);
    const [waitingForDoctor, setWaitingForDoctor] = useState(false);

    // ── Triggers a fresh LiveKit token fetch on re-entry after an ended call ──
    const [sessionKey, setSessionKey] = useState(0);
    const isFirstFocusRef = useRef(true);

    // -- Fetch doctor name from appointment data --
    useEffect(() => {
        if (!token || !id) return;
        (async () => {
            try {
                const appts = await getMyAppointments(token);
                const appt = appts.find((a) => a.id === id);
                if (appt) {
                    const { getDoctorsByHospital } = await import('@/services/caregiver');
                    const docs = await getDoctorsByHospital(appt.hospital_id);
                    const doc = docs.find((d) => d.id === appt.doctor_id);
                    if (doc) setDoctorName(doc.full_name);
                }
            } catch { }
        })();
    }, [token, id]);

    // -- Fetch appointment data + join token with retry polling --
    useEffect(() => {
        if (!token || !id) return;
        let cancelled = false;
        let retryCount = 0;
        const MAX_RETRIES = 12;
        const RETRY_INTERVAL = 5000;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        (async () => {
            const attemptJoin = async () => {
                if (cancelled) return;
                try {
                    const join = await getJoinToken(token, id);
                    if (!cancelled) {
                        setJoinTokenStr(join.join_token);
                        setWaitingForDoctor(false);
                    }
                } catch (err: any) {
                    if (cancelled) return;
                    retryCount++;
                    if (retryCount < MAX_RETRIES) {
                        setWaitingForDoctor(true);
                        retryTimer = setTimeout(attemptJoin, RETRY_INTERVAL);
                    } else {
                        setWaitingForDoctor(false);
                        setLkError('Doctor has not started the session yet. Please try again later.');
                    }
                }
            };

            attemptJoin();
        })();

        return () => {
            cancelled = true;
            if (retryTimer) clearTimeout(retryTimer);
        };
    }, [token, id, sessionKey]);

    // -- Boot Audio Hardware ONLY after permissions are granted --
    // -- Boot Audio Hardware ONLY after permissions are granted --
    useEffect(() => {
        if (hasPermissions && LIVEKIT_AVAILABLE) {
            const startAudio = async () => {
                try {
                    await AudioSession.startAudioSession();
                    setAudioReady(true); // 👈 Hardware is fully online!
                } catch (e) {
                    console.error("Audio session failed to start", e);
                }
            };
            startAudio();
        }

        return () => {
            if (LIVEKIT_AVAILABLE) {
                AudioSession.stopAudioSession();
            }
        };
    }, [hasPermissions]);

    // -- Call timer — managed entirely through useFocusEffect --
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ── Navigation exit control ──
    const intentionalExitRef = useRef(false);
    const minimizingRef = useRef(false);

    // ── Refs to always capture latest mic/elapsed without stale closures ──
    const isMicOnRef = useRef(isMicOn);
    useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);
    const elapsedRef = useRef(elapsed);
    useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

    // ── Track whether the doctor (remote) ever joined ──
    const doctorJoinedRef = useRef(false);

    // ── Focus lifecycle: reset state for fresh calls, restore state after minimize ──
    useFocusEffect(useCallback(() => {
        const prev = activeCallRef.current;

        if (prev) {
            // Returning from the floating bar → restore exactly where we left off
            setElapsed(prev.elapsed);
            setIsMicOn(prev.isMicOn);
        } else if (!isFirstFocusRef.current) {
            // Re-entering after ending a previous call → full clean slate
            setElapsed(0);
            setIsMicOn(true);
            setIsCameraOn(true);
            setJoinTokenStr(null);
            setLkError(null);
            setWaitingForDoctor(false);
            doctorJoinedRef.current = false;
            // Bump sessionKey so the getJoinToken effect re-runs for the new session
            setSessionKey((k) => k + 1);
        }
        isFirstFocusRef.current = false;

        clearCall();
        intentionalExitRef.current = false;
        minimizingRef.current = false;

        // Start (or restart) the call timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

        // On blur (minimize or navigate away) stop the timer
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []));

    // ── Intercept back navigation → minimize instead of ending the call ──
    const handleMinimize = useCallback(() => {
        if (minimizingRef.current) return;
        minimizingRef.current = true;
        minimizeCall({
            appointmentId: id as string,
            name: doctorName,
            role: 'caregiver',
            elapsed: elapsedRef.current,
            isMicOn: isMicOnRef.current,
        });
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(caregiver)' as any);
        }
    }, [id, doctorName, minimizeCall, router]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (intentionalExitRef.current || minimizingRef.current) return;
            e.preventDefault();
            handleMinimize();
        });
        return unsubscribe;
    }, [navigation, handleMinimize]);

    // -- Actions --
    const handleEndCall = useCallback(() => {
        intentionalExitRef.current = true;
        clearCall();
        if (timerRef.current) clearInterval(timerRef.current);

        // Unmount LiveKitRoom for a graceful client-side disconnect
        setJoinTokenStr(null);

        // Navigate INSTANTLY
        router.replace({
            pathname: '/(caregiver)/post-call-summary',
            params: { appointmentId: id },
        } as any);

        // Background: stop audio after LiveKit has disconnected
        setTimeout(async () => {
            try { await AudioSession.stopAudioSession(); } catch { /* ignore */ }
        }, 300);
    }, [router, id, clearCall]);

    const getInitials = (name: string) =>
        name.split(' ').map((n) => n[0]).join('');

    const content = (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={VC.bg} />

            {/* ── Doctor's Video Background ── */}
            <View style={styles.videoBackground}>
                {joinTokenStr ? (
                    <RemoteVideoView doctorName={doctorName} doctorJoinedRef={doctorJoinedRef} />
                ) : (
                    <>
                        <View style={styles.docAvatarLarge}>
                            <Feather name="user" size={56} color={VC.textMuted} />
                        </View>
                        <Text style={styles.docVideoLabel}>
                            {lkError ? lkError : waitingForDoctor ? 'Waiting for doctor to start the session…' : 'Connecting…'}
                        </Text>
                    </>
                )}
            </View>

            {/* ── Floating Header ── */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']}>
                {/* Back button — minimizes the call */}
                <Pressable
                    style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
                    onPress={handleMinimize}
                >
                    <Feather name="chevron-left" size={22} color={VC.text} />
                </Pressable>

                {/* Center: timer + name + mute indicator */}
                <View style={styles.headerCenter}>
                    <View style={styles.timerPill}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
                    </View>
                    <Text style={styles.headerDocName}>{doctorName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.headerDocSpec}>Video Consultation</Text>
                        {joinTokenStr && <DoctorMuteIndicator />}
                    </View>
                </View>

                {/* Spacer to balance the back button */}
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {/* ── PiP Self-View ── */}
            {joinTokenStr ? (
                <LocalPiPView isCameraOn={isCameraOn} isMicOn={isMicOn} />
            ) : (
                <View style={styles.pip}>
                    <View style={styles.pipInner}>
                        <Text style={styles.pipInitials}>You</Text>
                    </View>
                </View>
            )}

            {/* ── Floating Call Controls ── */}
            <SafeAreaView style={styles.controlsOverlay} edges={['bottom']}>
                <View style={styles.controlPill}>
                    {/* Mic */}
                    <MicControl isMicOn={isMicOn} setIsMicOn={setIsMicOn} hasToken={!!joinTokenStr} />

                    {/* Video */}
                    <CameraControl isCameraOn={isCameraOn} setIsCameraOn={setIsCameraOn} hasToken={!!joinTokenStr} />


                    {/* End Call */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.endCallBtn,
                            pressed && { opacity: 0.8 },
                        ]}
                        onPress={handleEndCall}
                    >
                        <Feather name="phone-off" size={22} color="#FFFFFF" />
                    </Pressable>
                </View>
            </SafeAreaView>


        </View>
    );

    // Wrap in LiveKitRoom when token is ready and native modules are available
    if (!joinTokenStr || !LIVEKIT_AVAILABLE || !LiveKitRoom) return content;

    if (!hasPermissions) {
        return (
            <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: VC.text, marginTop: 10 }}>Requesting camera access...</Text>
            </View>
        );
    }

    if (!hasPermissions || !audioReady) {
        return (
            <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: VC.text, marginTop: 10 }}>
                    {!hasPermissions ? 'Requesting permissions...' : 'Initializing audio hardware...'}
                </Text>
            </View>
        );
    }

    return (
        <LiveKitRoom
            serverUrl={LIVEKIT_URL}
            token={joinTokenStr}
            connect={true}
            audio={isMicOn}
            video={isCameraOn}
        >
            {content}
        </LiveKitRoom>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LiveKit sub-components — must be children of <LiveKitRoom>
// ═══════════════════════════════════════════════════════════════════════════════

function RemoteVideoView({ doctorName, doctorJoinedRef }: { doctorName: string; doctorJoinedRef: React.MutableRefObject<boolean> }) {
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const statusStyles = useStatusStyles(colors);
    const tracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: true }],
        { onlySubscribed: true }
    );
    const remoteParticipants = useRemoteParticipants();
    const remote = remoteParticipants[0];

    useEffect(() => {
        if (remoteParticipants.length > 0) {
            doctorJoinedRef.current = true;
        }
    }, [remoteParticipants.length, doctorJoinedRef]);

    const remoteTrack = tracks.find(
        (t: any) => !t.participant.isLocal && t.source === Track.Source.Camera
    );

    const trackToRender = remoteTrack?.publication?.videoTrack || remoteTrack?.publication?.track;
    const isCameraOn = remote?.isCameraEnabled ?? false;
    const isMicOn = remote?.isMicrophoneEnabled ?? true;

    // Remote has joined but camera is off
    if (remote && !isCameraOn) {
        return (
            <>
                <View style={styles.docAvatarLarge}>
                    <Feather name="video-off" size={48} color={VC.textMuted} />
                </View>
                <Text style={styles.docVideoLabel}>{doctorName} turned off their camera</Text>
            </>
        );
    }

    // Remote has joined and camera is on
    if (remoteTrack && isTrackReference(remoteTrack) && trackToRender) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%' }}>
                <VideoView
                    videoTrack={trackToRender}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    objectFit="contain"
                />
            </View>
        );
    }

    // Remote not joined yet
    return (
        <>
            <View style={styles.docAvatarLarge}>
                <Feather name="user" size={56} color={VC.textMuted} />
            </View>
            <Text style={styles.docVideoLabel}>Waiting for {doctorName} to join…</Text>
        </>
    );
}

// Renders an inline muted pill when the doctor's mic is off.
// Must be its own component so it can call useRemoteParticipants() inside LiveKitRoom.
function DoctorMuteIndicator() {
    const remoteParticipants = useRemoteParticipants();
    const remote = remoteParticipants[0];
    const isMicOn = remote?.isMicrophoneEnabled ?? true;
    if (isMicOn || !remote) return null;
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'rgba(239,68,68,0.18)',
            borderRadius: 10,
            paddingHorizontal: 7,
            paddingVertical: 3,
            marginTop: 2,
        }}>
            <Feather name="mic-off" size={11} color={VC.red} />
            <Text style={{ color: VC.red, fontSize: 11, fontWeight: '600' }}>Muted</Text>
        </View>
    );
}

function LocalPiPView({ isCameraOn, isMicOn }: { isCameraOn: boolean; isMicOn: boolean }) {
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const statusStyles = useStatusStyles(colors);
    const tracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: true }],
        { onlySubscribed: false }
    );

    const localTrack = tracks.find(
        (t: any) => t.participant.isLocal && t.source === Track.Source.Camera
    );

    const trackToRender = localTrack?.publication?.videoTrack || localTrack?.publication?.track;

    return (
        <View style={styles.pip}>
            {isCameraOn && localTrack && isTrackReference(localTrack) && trackToRender ? (
                <VideoView
                    videoTrack={trackToRender}
                    style={{ flex: 1, width: '100%', height: '100%', borderRadius: 12 }}
                    objectFit="contain"
                    mirror={true}
                />
            ) : (
                <View style={styles.pipInner}>
                    {isCameraOn ? (
                        <ActivityIndicator size="small" color={VC.textMuted} />
                    ) : (
                        <>
                            <Feather name="video-off" size={20} color={VC.textMuted} />
                            <Text style={styles.pipLabel}>Camera off</Text>
                        </>
                    )}
                </View>
            )}
            {!isMicOn && (
                <View style={statusStyles.pipMicBadge}>
                    <Feather name="mic-off" size={10} color="#FFFFFF" />
                </View>
            )}
        </View>
    );
}

function MicControl({ isMicOn, setIsMicOn, hasToken }: { isMicOn: boolean; setIsMicOn: (v: boolean) => void; hasToken: boolean }) {
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const lp = hasToken ? useLocalParticipant() : null;
    const toggle = useCallback(async () => {
        const next = !isMicOn;
        setIsMicOn(next);
        if (lp?.localParticipant) {
            await lp.localParticipant.setMicrophoneEnabled(next);
        }
    }, [isMicOn, lp, setIsMicOn]);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.controlBtn,
                !isMicOn && styles.controlBtnOff,
                pressed && { opacity: 0.7 },
            ]}
            onPress={toggle}
        >
            <Feather name={isMicOn ? 'mic' : 'mic-off'} size={22} color={isMicOn ? VC.text : VC.red} />
        </Pressable>
    );
}

function CameraControl({ isCameraOn, setIsCameraOn, hasToken }: { isCameraOn: boolean; setIsCameraOn: (v: boolean) => void; hasToken: boolean }) {
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const lp = hasToken ? useLocalParticipant() : null;
    const toggle = useCallback(async () => {
        const next = !isCameraOn;
        setIsCameraOn(next);
        if (lp?.localParticipant) {
            await lp.localParticipant.setCameraEnabled(next);
        }
    }, [isCameraOn, lp, setIsCameraOn]);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.controlBtn,
                !isCameraOn && styles.controlBtnOff,
                pressed && { opacity: 0.7 },
            ]}
            onPress={toggle}
        >
            <Feather name={isCameraOn ? 'video' : 'video-off'} size={22} color={isCameraOn ? VC.text : VC.red} />
        </Pressable>
    );
}

// ─── Main Styles ────────────────────────────────────────────────────────────

const useStyles = (colors: any) => StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: VC.bg,
    },

    // Doctor's video background
    videoBackground: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docAvatarLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: VC.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    docVideoLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.lg,
        color: VC.textMuted,
    },

    // Floating header
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: radii.full,
        backgroundColor: VC.controlBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        alignItems: 'center',
        gap: spacing.xxs,
    },
    timerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: VC.controlBg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: VC.green,
    },
    timerText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: VC.text,
        fontVariant: ['tabular-nums'],
    },
    headerDocName: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: VC.text,
        marginTop: spacing.xxs,
    },
    headerDocSpec: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: VC.textMuted,
    },

    // PiP self-view
    pip: {
        position: 'absolute',
        bottom: 120,
        right: spacing.lg,
        width: 100,
        height: 140,
        borderRadius: radii.lg,
        backgroundColor: VC.pipBg,
        overflow: 'hidden',
        ...shadows.elevated,
        borderWidth: 2,
        borderColor: VC.surfaceLight,
    },
    pipInner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    pipInitials: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 28,
        color: VC.text,
    },
    pipLabel: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: VC.textMuted,
    },

    // Floating controls
    controlsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: spacing.lg,
    },
    controlPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: VC.controlPill,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 40,
    },
    controlBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: VC.controlBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlBtnOff: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    controlBtnActive: {
        backgroundColor: VC.controlBgActive,
    },
    endCallBtn: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: VC.red,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ─── Status Indicator Styles ────────────────────────────────────────────────

const useStatusStyles = (colors: any) => StyleSheet.create({
    remoteMicBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: VC.red,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    pipMicBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: VC.red,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
});

// ─── Notes Sheet Styles ─────────────────────────────────────────────────────

const useNs = (colors: any) => StyleSheet.create({
    topHalf: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    sheet: {
        height: NOTES_SHEET_HEIGHT,
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.lg,
        ...shadows.elevated,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    title: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.lg,
        color: colors.textPrimary,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.md,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.xl,
    },
    saveBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});