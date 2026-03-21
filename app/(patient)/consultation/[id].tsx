/**
 * CareConnect — Video Consultation Room
 *
 * Full-screen immersive layout:
 *   - Dark slate background simulating doctor's video feed
 *   - Floating header with back button, call timer, doctor name
 *   - Picture-in-Picture self-view (bottom right)
 *   - Floating translucent pill with call controls (mic, video, notes, end)
 *   - "Live Notes" bottom sheet modal (50% screen)
 *
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    Modal,
    TextInput,
    StyleSheet,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    patientColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import { mockDoctors } from '@/services/mock-data';

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

    // Pull mock doctor (first one for now)
    const doctor = mockDoctors[0];

    // -- State --
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [elapsed, setElapsed] = useState(0);

    // -- Call timer --
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

    // -- Actions --
    const handleEndCall = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        console.log('Call Ended');
        router.replace('/(patient)/post-call-summary');
    };

    const getInitials = (name: string) =>
        name.split(' ').map((n) => n[0]).join('');

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={VC.bg} />

            {/* ── Doctor's Video Background ── */}
            <View style={styles.videoBackground}>
                <View style={styles.docAvatarLarge}>
                    <Feather name="user" size={56} color={VC.textMuted} />
                </View>
                <Text style={styles.docVideoLabel}>{doctor.full_name}</Text>
            </View>

            {/* ── Floating Header ── */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']}>
                {/* Back button */}
                <Pressable
                    style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => router.back()}
                >
                    <Feather name="chevron-left" size={22} color={VC.text} />
                </Pressable>

                {/* Center: timer + name */}
                <View style={styles.headerCenter}>
                    <View style={styles.timerPill}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
                    </View>
                    <Text style={styles.headerDocName}>{doctor.full_name}</Text>
                    <Text style={styles.headerDocSpec}>{doctor.specialization}</Text>
                </View>

                {/* Spacer to balance the back button */}
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {/* ── PiP Self-View ── */}
            <View style={styles.pip}>
                {isCameraOn ? (
                    <View style={styles.pipInner}>
                        <Text style={styles.pipInitials}>JD</Text>
                    </View>
                ) : (
                    <View style={styles.pipInner}>
                        <Feather name="video-off" size={20} color={VC.textMuted} />
                        <Text style={styles.pipLabel}>Camera off</Text>
                    </View>
                )}
            </View>

            {/* ── Floating Call Controls ── */}
            <SafeAreaView style={styles.controlsOverlay} edges={['bottom']}>
                <View style={styles.controlPill}>
                    {/* Mic */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.controlBtn,
                            !isMicOn && styles.controlBtnOff,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => setIsMicOn((v) => !v)}
                    >
                        <Feather
                            name={isMicOn ? 'mic' : 'mic-off'}
                            size={22}
                            color={isMicOn ? VC.text : VC.red}
                        />
                    </Pressable>

                    {/* Video */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.controlBtn,
                            !isCameraOn && styles.controlBtnOff,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => setIsCameraOn((v) => !v)}
                    >
                        <Feather
                            name={isCameraOn ? 'video' : 'video-off'}
                            size={22}
                            color={isCameraOn ? VC.text : VC.red}
                        />
                    </Pressable>

                    {/* Notes */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.controlBtn,
                            isNotesOpen && styles.controlBtnActive,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => setIsNotesOpen(true)}
                    >
                        <Feather name="message-square" size={22} color={VC.text} />
                    </Pressable>

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

            {/* ── Live Notes Bottom Sheet ── */}
            <Modal
                animationType="slide"
                transparent
                visible={isNotesOpen}
                onRequestClose={() => setIsNotesOpen(false)}
            >
                {/* Top half — tap to dismiss, still see video */}
                <Pressable style={ns.topHalf} onPress={() => setIsNotesOpen(false)} />

                {/* Bottom sheet */}
                <View style={ns.sheet}>
                    <View style={ns.handleBar} />

                    {/* Header */}
                    <View style={ns.header}>
                        <Text style={ns.title}>Session Notes</Text>
                        <Pressable
                            onPress={() => setIsNotesOpen(false)}
                            style={ns.closeBtn}
                        >
                            <Feather name="x" size={20} color={patientColors.textMuted} />
                        </Pressable>
                    </View>

                    {/* Input */}
                    <TextInput
                        style={ns.input}
                        multiline
                        autoFocus
                        placeholder="Type your notes here…"
                        placeholderTextColor={patientColors.textMuted}
                        value={notes}
                        onChangeText={setNotes}
                        textAlignVertical="top"
                    />

                    {/* Save */}
                    <Pressable
                        style={({ pressed }) => [ns.saveBtn, pressed && { opacity: 0.85 }]}
                        onPress={() => {
                            console.log('Notes saved:', notes);
                            setIsNotesOpen(false);
                        }}
                    >
                        <Feather name="save" size={18} color="#FFFFFF" />
                        <Text style={ns.saveBtnText}>Save Notes</Text>
                    </Pressable>
                </View>
            </Modal>
        </View>
    );
}

// ─── Main Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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

// ─── Notes Sheet Styles ─────────────────────────────────────────────────────

const ns = StyleSheet.create({
    topHalf: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    sheet: {
        height: NOTES_SHEET_HEIGHT,
        backgroundColor: patientColors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.lg,
        ...shadows.elevated,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: patientColors.border,
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
        color: patientColors.textPrimary,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: radii.full,
        backgroundColor: patientColors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: patientColors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.md,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: patientColors.textPrimary,
        marginBottom: spacing.md,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: patientColors.primary,
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
