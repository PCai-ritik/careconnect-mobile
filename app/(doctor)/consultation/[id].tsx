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

import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    StatusBar,
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
import {
    mockDoctorAppointments,
    mockRecentPatients,
    type MockPatient,
} from '@/services/mock-data';
import PatientChartModal from '@/components/doctor/PatientChartModal';
import NewPrescriptionModal from '@/components/doctor/NewPrescriptionModal';

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

// ─── Component ──────────────────────────────────────────────────────────────

export default function DoctorConsultationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    // ── Resolve patient from appointment ID ──
    const appointment = mockDoctorAppointments.find((a) => a.id === id);
    const patientFromDir = appointment
        ? mockRecentPatients.find((p) => p.name === appointment.patientName)
        : null;

    const patient: MockPatient = patientFromDir ?? {
        id: id ?? 'unknown',
        name: appointment?.patientName ?? 'Patient',
        condition: appointment?.type ?? 'Consultation',
        lastVisit: 'Today',
        avatar: '',
    };

    // ── State ──
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
    const [elapsed, setElapsed] = useState(0);

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

    // ── Actions ──
    const handleEndCall = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        console.log('[Doctor] Call ended with', patient.name);
        router.back();
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={VC.bg} />

            {/* ── Patient's Video Background ── */}
            <View style={styles.videoBackground}>
                <View
                    style={[
                        styles.patientAvatarLarge,
                        { backgroundColor: avatarColor(patient.name) },
                    ]}
                >
                    <Feather name="user" size={56} color="#374151" />
                </View>
                <Text style={styles.videoLabel}>{patient.name}</Text>
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
                    <Text style={styles.headerName}>{patient.name}</Text>
                    <Text style={styles.headerCondition}>{patient.condition}</Text>
                </View>

                {/* Spacer to balance */}
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {/* ── PiP Self-View (Doctor) ── */}
            <View style={styles.pip}>
                {isCameraOn ? (
                    <View style={styles.pipInner}>
                        <Text style={styles.pipInitials}>RM</Text>
                    </View>
                ) : (
                    <View style={styles.pipInner}>
                        <Feather name="video-off" size={20} color={VC.textMuted} />
                        <Text style={styles.pipLabel}>Camera off</Text>
                    </View>
                )}
            </View>

            {/* ── Floating Call Controls (5 buttons) ── */}
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
                            size={20}
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
                            size={20}
                            color={isCameraOn ? VC.text : VC.red}
                        />
                    </Pressable>

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
                patientName={patient.name}
            />
        </View>
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
    endCallBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: VC.red,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
