/**
 * CareConnect — Doctor Video Consultation Room
 *
 * Full-screen immersive layout adapted from the patient side:
 *   - Dark slate background simulating patient's video feed
 *   - Floating header with back button, call timer, patient name
 *   - Picture-in-Picture self-view (Doctor's camera, bottom right)
 *   - Floating translucent pill with 5 controls:
 *     Mic | Video | Patient Chart | Prescribe | End Call
 *   - PatientChartModal + NewPrescriptionModal rendered over the call
 *
 * Uses doctorColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    doctorColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getAppointments, getPatients, getDoctorProfile, startVideoSession, getJoinToken, updateAppointmentStatus } from '@/services/doctor';
import type { PatientProfile, Appointment, DoctorProfile } from '@/services/types';
import PatientChartModal from '@/components/doctor/PatientChartModal';
import NewPrescriptionModal from '@/components/doctor/NewPrescriptionModal';

// LiveKit — conditional import for Expo Go compatibility
import { LIVEKIT_AVAILABLE } from '@/services/livekit';

let LiveKitRoom: any = null;
let VideoTrack: any = null;
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
        VideoTrack = lk.VideoTrack;
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

// ─── Video Call Colors ──────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    '#E8D5C4', '#C4D7E8', '#D5E8C4', '#E8C4D5', '#C4E8D7',
    '#D7C4E8', '#E8E2C4', '#C4CEE8', '#E8C4C4', '#C4E8E8',
];

function hashName(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

function avatarColor(name: string): string {
    return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatType(type: string): string {
    switch (type) {
        case 'VIDEO': return 'Video Consultation';
        case 'FOLLOW_UP': return 'Follow-up';
        case 'NEW_PATIENT': return 'New Patient';
        default: return 'In-Person';
    }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DoctorConsultationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { token } = useAuth();

    // ── Real data from API ──
    const [patient, setPatient] = useState<PatientProfile | null>(null);
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // ── State ──
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);

    // ── Patient-joined tracking (for COMPLETED status) ──
    const patientJoinedRef = useRef(false);

    // ── Duration notification state ──
    const [durationNotifShown, setDurationNotifShown] = useState(false);
    const [showDurationNotif, setShowDurationNotif] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    // ── LiveKit connection state ──
    const [joinToken, setJoinToken] = useState<string | null>(null);
    const [lkError, setLkError] = useState<string | null>(null);

    // ── Fetch appointment + patient from API ──
    useEffect(() => {
        if (!token || !id) return;
        (async () => {
            try {
                const [allAppts, allPatients, profile] = await Promise.all([
                    getAppointments(token),
                    getPatients(token),
                    getDoctorProfile(token),
                ]);
                const appt = allAppts.find((a) => a.id === id) ?? null;
                setAppointment(appt);
                setDoctorProfile(profile);
                if (appt) {
                    const p = allPatients.find((pt) => pt.id === appt.patient_id) ?? null;
                    setPatient(p);
                }
            } catch (e) {
                console.error('[Consultation] Failed to load data:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [token, id]);

    // ── LiveKit: start/join session after data loads ──
    useEffect(() => {
        if (!token || !id) return;
        let cancelled = false;
        (async () => {
            // Start audio session for mobile
            await AudioSession.startAudioSession();
            try {
                const session = await startVideoSession(token, id);
                if (!cancelled) setJoinToken(session.join_token);
            } catch (err: any) {
                if (err?.message?.includes('409')) {
                    try {
                        const join = await getJoinToken(token, id);
                        if (!cancelled) setJoinToken(join.join_token);
                    } catch (e2: any) {
                        if (!cancelled) setLkError(e2.message);
                    }
                } else {
                    if (!cancelled) setLkError(err.message);
                }
            }
        })();
        return () => {
            cancelled = true;
            AudioSession.stopAudioSession();
        };
    }, [token, id]);

    const patientName = patient?.full_name ?? 'Patient';
    const appointmentType = appointment ? formatType(appointment.appointment_type) : 'Consultation';
    const doctorInitials = doctorProfile ? getInitials(doctorProfile.full_name) : 'DR';

    // ── Call timer ──
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setElapsed((e) => e + 1);
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ── Duration notification ──
    const durationMinutes = appointment?.duration_minutes || 30;
    useEffect(() => {
        if (!durationNotifShown && elapsed >= durationMinutes * 60) {
            setDurationNotifShown(true);
            setShowDurationNotif(true);
            const timeout = setTimeout(() => setShowDurationNotif(false), 10000);
            return () => clearTimeout(timeout);
        }
    }, [elapsed, durationMinutes, durationNotifShown]);

    // ── Actions ──
    const handleEndCall = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        // Mark appointment as COMPLETED only if the patient actually joined
        if (patientJoinedRef.current && token && id) {
            try {
                await updateAppointmentStatus(token, id, 'COMPLETED');
            } catch (e) {
                console.error('Failed to complete appointment:', e);
            }
        }

        await AudioSession.stopAudioSession();
        router.back();
    }, [router, token, id]);

    if (loading) {
        return (
            <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
                <StatusBar barStyle="light-content" backgroundColor={VC.bg} />
                <ActivityIndicator size="large" color={VC.green} />
                <Text style={{ color: VC.textMuted, marginTop: spacing.md }}>Connecting…</Text>
            </View>
        );
    }

    const content = (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={VC.bg} />

            {/* ── Patient's Video Background ── */}
            <View style={styles.videoBackground}>
                {joinToken ? (
                    <RemoteVideoView patientName={patientName} patientJoinedRef={patientJoinedRef} />
                ) : (
                    <>
                        <View style={[styles.patientAvatarLarge, { backgroundColor: avatarColor(patientName) }]}>
                            <Feather name="user" size={56} color="#374151" />
                        </View>
                        <Text style={styles.videoLabel}>
                            {lkError ? 'Failed to connect' : 'Connecting…'}
                        </Text>
                    </>
                )}
            </View>

            {/* ── Floating Header ── */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']}>
                {/* Back */}
                <Pressable
                    style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => router.back()}
                >
                    <Feather name="chevron-left" size={22} color={VC.text} />
                </Pressable>

                {/* Center: timer + patient name */}
                <View style={styles.headerCenter}>
                    <View style={styles.timerPill}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
                    </View>
                    <Text style={styles.headerName}>{patientName}</Text>
                    <Text style={styles.headerCondition}>{appointmentType}</Text>
                </View>

                {/* Spacer to balance */}
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {/* ── PiP Self-View (Doctor) ── */}
            {joinToken ? (
                <LocalPiPView isCameraOn={isCameraOn} doctorInitials={doctorInitials} />
            ) : (
                <View style={styles.pip}>
                    <View style={styles.pipInner}>
                        <Text style={styles.pipInitials}>{doctorInitials}</Text>
                    </View>
                </View>
            )}

            {/* ── Floating Call Controls (5 buttons) ── */}
            <SafeAreaView style={styles.controlsOverlay} edges={['bottom']}>
                <View style={styles.controlPill}>
                    {/* Mic */}
                    <MicControl isMicOn={isMicOn} setIsMicOn={setIsMicOn} hasToken={!!joinToken} />

                    {/* Video */}
                    <CameraControl isCameraOn={isCameraOn} setIsCameraOn={setIsCameraOn} hasToken={!!joinToken} />

                    {/* Patient Chart */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.controlBtn,
                            isChartOpen && styles.controlBtnActive,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => setIsChartOpen(true)}
                    >
                        <Feather name="clipboard" size={20} color={VC.text} />
                    </Pressable>

                    {/* Prescribe */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.controlBtn,
                            isPrescriptionOpen && styles.controlBtnActive,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => setIsPrescriptionOpen(true)}
                    >
                        <Feather name="file-plus" size={20} color={VC.text} />
                    </Pressable>

                    {/* End Call */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.endCallBtn,
                            pressed && { opacity: 0.8 },
                        ]}
                        onPress={handleEndCall}
                    >
                        <Feather name="phone-off" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
            </SafeAreaView>

            {/* ── Duration Notification Toast ── */}
            {showDurationNotif && (
                <View style={styles.durationToast}>
                    <Feather name="clock" size={18} color="#FCD34D" />
                    <Text style={styles.durationToastText}>
                        {durationMinutes} minutes have elapsed for this consultation
                    </Text>
                    <Pressable
                        onPress={() => setShowDurationNotif(false)}
                        hitSlop={8}
                    >
                        <Feather name="x" size={14} color="#FCD34D" />
                    </Pressable>
                </View>
            )}

            {/* ── Modals (rendered over the call without unmounting) ── */}
            <PatientChartModal
                visible={isChartOpen}
                patient={patient}
                onClose={() => setIsChartOpen(false)}
                onNewPrescription={() => {
                    setIsChartOpen(false);
                    setIsPrescriptionOpen(true);
                }}
            />
            <NewPrescriptionModal
                visible={isPrescriptionOpen}
                onClose={() => setIsPrescriptionOpen(false)}
                patientId={patient?.id}
                patientName={patientName}
                patientGender={patient?.gender ?? ''}
            />
        </View>
    );

    // Wrap in LiveKitRoom when token is ready and native modules are available
    if (!joinToken || !LIVEKIT_AVAILABLE || !LiveKitRoom) return content;

    return (
        <LiveKitRoom
            serverUrl={LIVEKIT_URL}
            token={joinToken ?? undefined}
            connect={true}
            audio={true}
            video={true}
        >
            {content}
        </LiveKitRoom>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: VC.bg,
    },

    // Patient's video background
    videoBackground: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    patientAvatarLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    videoLabel: {
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
    headerName: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: VC.text,
        marginTop: spacing.xxs,
    },
    headerCondition: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: VC.textMuted,
    },

    // PiP self-view (Doctor)
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
        gap: spacing.md,
        backgroundColor: VC.controlPill,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 40,
    },
    controlBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
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
    // Duration notification toast
    durationToast: {
        position: 'absolute',
        bottom: 100,
        left: spacing.xl,
        right: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: 'rgba(120, 53, 15, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(180, 83, 9, 0.5)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radii.lg,
        zIndex: 40,
    },
    durationToastText: {
        flex: 1,
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: '#FEF3C7',
    },
    endCallBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: VC.red,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// LiveKit sub-components — must be children of <LiveKitRoom>
// ═══════════════════════════════════════════════════════════════════════════════

function RemoteVideoView({ patientName, patientJoinedRef }: { patientName: string; patientJoinedRef: React.MutableRefObject<boolean> }) {
    const tracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: true }],
        { onlySubscribed: true }
    );
    const remoteParticipants = useRemoteParticipants();

    // Track if patient ever joined (lifted to parent via ref)
    useEffect(() => {
        if (remoteParticipants.length > 0) {
            patientJoinedRef.current = true;
        }
    }, [remoteParticipants.length, patientJoinedRef]);

    // @ts-ignore – dynamic require types
    const remoteTrack = tracks.find(
        (t: any) => !t.participant.isLocal && t.source === Track.Source.Camera
    );

    if (remoteTrack && isTrackReference(remoteTrack) && remoteTrack.publication?.track) {
        return (
            <VideoTrack
                trackRef={remoteTrack}
                style={{ flex: 1, width: '100%', height: '100%', objectFit: 'contain' } as any}
            />
        );
    }

    return (
        <>
            <View style={[{ width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8D5C4' }]}>
                <Feather name="user" size={56} color="#374151" />
            </View>
            <Text style={{ color: VC.textMuted, marginTop: spacing.md, fontFamily: typography.fontFamily.regular, fontSize: 14 }}>
                Waiting for {patientName} to join…
            </Text>
        </>
    );
}

function LocalPiPView({ isCameraOn, doctorInitials }: { isCameraOn: boolean; doctorInitials: string }) {
    const tracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: true }],
        { onlySubscribed: false }
    );
    // @ts-ignore – dynamic require types
    const localTrack = tracks.find(
        (t: any) => t.participant.isLocal && t.source === Track.Source.Camera
    );

    return (
        <View style={styles.pip}>
            {isCameraOn && localTrack && isTrackReference(localTrack) && localTrack.publication?.track ? (
                <VideoTrack
                    trackRef={localTrack}
                    style={{ width: '100%', height: '100%', borderRadius: radii.lg, objectFit: 'contain' } as any}
                    mirror={false}
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
        </View>
    );
}

function MicControl({ isMicOn, setIsMicOn, hasToken }: { isMicOn: boolean; setIsMicOn: (v: boolean) => void; hasToken: boolean }) {
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
            <Feather name={isMicOn ? 'mic' : 'mic-off'} size={20} color={isMicOn ? VC.text : VC.red} />
        </Pressable>
    );
}

function CameraControl({ isCameraOn, setIsCameraOn, hasToken }: { isCameraOn: boolean; setIsCameraOn: (v: boolean) => void; hasToken: boolean }) {
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
            <Feather name={isCameraOn ? 'video' : 'video-off'} size={20} color={isCameraOn ? VC.text : VC.red} />
        </Pressable>
    );
}
