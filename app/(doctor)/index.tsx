/**
 * CareConnect — Doctor Dashboard (Home Tab)
 *
 * Utility-first Point-of-Care tool. Prioritises the doctor's immediate
 * schedule and quick actions over vanity stats.
 */

import { useState } from 'react';

import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';
import {
    mockDoctorAppointments,
    mockRecentPatients,
    DoctorAppointment,
    MockPatient,
} from '@/services/mock-data';
import PatientChartModal from '@/components/doctor/PatientChartModal';
import NewPrescriptionModal from '@/components/doctor/NewPrescriptionModal';
import AvailabilityModal from '@/components/doctor/AvailabilityModal';
import ActivityHistoryModal from '@/components/doctor/ActivityHistoryModal';
import AddPatientModal from '@/components/doctor/AddPatientModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Muted, professional background colors for the silhouette circles
const AVATAR_COLORS = [
    '#C7D2FE', // indigo-200
    '#A5B4FC', // indigo-300
    '#BAE6FD', // sky-200
    '#99F6E4', // teal-200
    '#D9F99D', // lime-200
    '#FDE68A', // amber-200
    '#FECACA', // red-200
    '#DDD6FE', // violet-200
];

const getAvatarColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const nextAppointment = mockDoctorAppointments.find(
    (a) => a.status === 'upcoming',
);

const scheduleAppointments = mockDoctorAppointments.filter(
    (a) => a.id !== nextAppointment?.id,
);

// ─── Quick Action Data ──────────────────────────────────────────────────────

type QuickAction = {
    label: string;
    icon: keyof typeof Feather.glyphMap;
};

const quickActions: QuickAction[] = [
    { label: 'New Prescription', icon: 'file-text' },
    { label: 'Add Patient', icon: 'user-plus' },
    { label: 'Availability', icon: 'clock' },
    { label: 'History', icon: 'archive' },
];

// ─── Sub-Components ─────────────────────────────────────────────────────────

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
    const bg = getAvatarColor(name);
    return (
        <View
            style={[
                styles.avatar,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: bg,
                },
            ]}
        >
            <Feather name="user" size={size * 0.48} color="#374151" />
        </View>
    );
}

function HeroCard({ appointment, onStartCall }: { appointment: DoctorAppointment; onStartCall: () => void }) {
    return (
        <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>NEXT APPOINTMENT</Text>
            <View style={styles.heroBody}>
                <Avatar name={appointment.patientName} size={52} />
                <View style={styles.heroInfo}>
                    <Text style={styles.heroPatient}>{appointment.patientName}</Text>
                    <Text style={styles.heroMeta}>
                        {appointment.time}  •  {appointment.type}
                    </Text>
                </View>
            </View>
            <Pressable
                style={({ pressed }) => [
                    styles.heroCta,
                    pressed && styles.heroCtaPressed,
                ]}
                onPress={onStartCall}
            >
                <Feather name="video" size={18} color="#fff" />
                <Text style={styles.heroCtaText}>Start Video Call</Text>
            </Pressable>
        </View>
    );
}

function ActionPill({ action, onPress }: { action: QuickAction; onPress?: () => void }) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.actionPill,
                pressed && { opacity: 0.7 },
            ]}
            onPress={onPress}
        >
            <View style={styles.actionPillIcon}>
                <Feather name={action.icon} size={20} color={doctorColors.primary} />
            </View>
            <Text style={styles.actionPillLabel}>{action.label}</Text>
        </Pressable>
    );
}

function ScheduleRow({ appointment, onPress, onJoin }: { appointment: DoctorAppointment; onPress: () => void; onJoin: () => void }) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.scheduleRow,
                pressed && { opacity: 0.7 },
            ]}
            onPress={onPress}
        >
            <Avatar name={appointment.patientName} size={40} />
            <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleName}>{appointment.patientName}</Text>
                <Text style={styles.scheduleMeta}>
                    {appointment.time}  •  {appointment.type}
                </Text>
            </View>
            <Pressable
                style={({ pressed }) => [
                    styles.joinBtn,
                    pressed && { opacity: 0.7 },
                ]}
                onPress={onJoin}
            >
                <Feather name="video" size={14} color={doctorColors.primary} />
                <Text style={styles.joinBtnText}>Join</Text>
            </Pressable>
        </Pressable>
    );
}

function PatientRow({ patient, onPress }: { patient: MockPatient; onPress: () => void }) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.patientRow,
                pressed && { opacity: 0.7 },
            ]}
            onPress={onPress}
        >
            <Avatar name={patient.name} size={40} />
            <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientCondition}>{patient.condition}</Text>
            </View>
            <Text style={styles.patientLastVisit}>{patient.lastVisit}</Text>
        </Pressable>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function DoctorHomeScreen() {
    const router = useRouter();
    const [selectedPatient, setSelectedPatient] = useState<MockPatient | null>(null);
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [isRxOpen, setIsRxOpen] = useState(false);
    const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

    const openChart = (patient: MockPatient) => {
        setSelectedPatient(patient);
        setIsChartOpen(true);
    };

    // Bridge an appointment to a MockPatient for the chart
    const openChartFromAppointment = (appt: DoctorAppointment) => {
        const found = mockRecentPatients.find((p) => p.name === appt.patientName);
        openChart(found ?? {
            id: appt.id,
            name: appt.patientName,
            condition: appt.type,
            lastVisit: 'Today',
            avatar: '',
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Header ─────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoBox}>
                            <Feather name="activity" size={20} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.greeting}>Welcome,</Text>
                            <Text style={styles.doctorName}>Dr. Rohan Mehta</Text>
                        </View>
                    </View>
                    <Avatar name="Rohan Mehta" size={42} />
                </View>

                {/* ── Hero Card ───────────────────────────────────────── */}
                {nextAppointment && (
                    <HeroCard
                        appointment={nextAppointment}
                        onStartCall={() => router.push(`/(doctor)/consultation/${nextAppointment.id}`)}
                    />
                )}

                {/* ── Action Toolbox ──────────────────────────────────── */}
                <View style={styles.actionsRow}>
                    {quickActions.map((action) => (
                        <ActionPill
                            key={action.label}
                            action={action}
                            onPress={
                                action.label === 'New Prescription'
                                    ? () => setIsRxOpen(true)
                                    : action.label === 'Availability'
                                        ? () => setIsAvailabilityOpen(true)
                                        : action.label === 'History'
                                            ? () => setIsHistoryOpen(true)
                                            : action.label === 'Add Patient'
                                                ? () => setIsAddPatientOpen(true)
                                                : undefined
                            }
                        />
                    ))}
                </View>

                {/* ── Today's Schedule ─────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Schedule</Text>
                        {scheduleAppointments.length > 5 && (
                            <Pressable
                                onPress={() => router.push('/(doctor)/appointments')}
                                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                            >
                                <Text style={styles.showMore}>Show More</Text>
                            </Pressable>
                        )}
                    </View>
                    <View style={styles.card}>
                        {scheduleAppointments.slice(0, 5).map((appt, idx, arr) => (
                            <View key={appt.id}>
                                <ScheduleRow
                                    appointment={appt}
                                    onPress={() => openChartFromAppointment(appt)}
                                    onJoin={() => router.push(`/(doctor)/consultation/${appt.id}`)}
                                />
                                {idx < arr.length - 1 && (
                                    <View style={styles.divider} />
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Recent Patients ──────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Patients</Text>
                        {mockRecentPatients.length > 5 && (
                            <Pressable
                                onPress={() => router.push('/(doctor)/patients')}
                                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                            >
                                <Text style={styles.showMore}>Show More</Text>
                            </Pressable>
                        )}
                    </View>
                    <View style={styles.card}>
                        {mockRecentPatients.slice(0, 5).map((patient, idx, arr) => (
                            <View key={patient.id}>
                                <PatientRow
                                    patient={patient}
                                    onPress={() => openChart(patient)}
                                />
                                {idx < arr.length - 1 && (
                                    <View style={styles.divider} />
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <PatientChartModal
                visible={isChartOpen}
                patient={selectedPatient}
                onClose={() => setIsChartOpen(false)}
                onNewPrescription={() => {
                    setIsChartOpen(false);
                    setIsRxOpen(true);
                }}
            />
            <NewPrescriptionModal
                visible={isRxOpen}
                onClose={() => setIsRxOpen(false)}
            />
            <AvailabilityModal
                visible={isAvailabilityOpen}
                onClose={() => setIsAvailabilityOpen(false)}
            />
            <ActivityHistoryModal
                visible={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
            <AddPatientModal
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
            />
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: doctorColors.background,
    },
    scrollContent: {
        paddingBottom: spacing.lg,
    },

    // ── Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    logoBox: {
        width: 38,
        height: 38,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    greeting: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
    },
    doctorName: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.lg,
        color: doctorColors.textPrimary,
    },

    // ── Avatar (shared)
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: doctorColors.surfaceMuted,
    },

    // ── Hero Card
    heroCard: {
        marginHorizontal: spacing.xl,
        marginTop: spacing.sm,
        padding: spacing.xl,
        backgroundColor: doctorColors.surface,
        borderRadius: radii.lg,
        ...shadows.elevated,
    },
    heroLabel: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.xs,
        color: doctorColors.textMuted,
        letterSpacing: 1.2,
        marginBottom: spacing.md,
    },
    heroBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        marginBottom: spacing.xl,
    },
    heroInfo: {
        flex: 1,
    },
    heroPatient: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
    },
    heroMeta: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
        marginTop: spacing.xxs,
    },
    heroCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: doctorColors.primary,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
    },
    heroCtaPressed: {
        backgroundColor: doctorColors.primaryDark,
    },
    heroCtaText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },

    // ── Action Toolbox
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        marginTop: spacing['3xl'],
    },
    actionPill: {
        alignItems: 'center',
        flex: 1,
        gap: spacing.sm,
    },
    actionPillIcon: {
        width: 52,
        height: 52,
        borderRadius: radii.lg,
        backgroundColor: doctorColors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionPillLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.xs,
        color: doctorColors.textSecondary,
        textAlign: 'center',
    },

    // ── Sections
    section: {
        marginTop: spacing['3xl'],
        paddingHorizontal: spacing.xl,
    },
    sectionTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.lg,
        color: doctorColors.textPrimary,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    showMore: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
    },
    card: {
        backgroundColor: doctorColors.surface,
        borderRadius: radii.lg,
        padding: spacing.lg,
        ...shadows.card,
    },
    divider: {
        height: 1,
        backgroundColor: doctorColors.borderLight,
        marginVertical: spacing.md,
    },

    // ── Schedule Row
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    scheduleInfo: {
        flex: 1,
    },
    scheduleName: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    scheduleMeta: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginTop: spacing.xxs,
    },
    joinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: doctorColors.primary,
    },
    joinBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.primary,
    },

    // ── Patient Row
    patientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    patientCondition: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginTop: spacing.xxs,
    },
    patientLastVisit: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
});
