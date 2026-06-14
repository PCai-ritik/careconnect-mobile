/**
 * CareConnect — Doctor Dashboard (Home Tab)
 *
 * Utility-first Point-of-Care tool. Prioritises the doctor's immediate
 * schedule and quick actions over vanity stats.
 */

import { useState, useEffect, useCallback } from 'react';

import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Linking, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
    getBranding,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getDoctorProfile, getAppointments, getPatients, startVideoSession, getJoinToken } from '@/services/doctor';
import type { DoctorProfile, Appointment, PatientProfile } from '@/services/types';
import PatientChartModal from '@/components/doctor/PatientChartModal';
import NewPrescriptionModal from '@/components/doctor/NewPrescriptionModal';
import AvailabilityModal from '@/components/doctor/AvailabilityModal';
import ActivityHistoryModal from '@/components/doctor/ActivityHistoryModal';
import AddPatientModal from '@/components/doctor/AddPatientModal';
import SmartJoinButton from '@/components/SmartJoinButton';
import { ThemedText, ThemedView } from '@/components/shared/Themed';
import { useTheme } from '@/providers/ThemeProvider';

// ─── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    '#C7D2FE', '#A5B4FC', '#BAE6FD', '#99F6E4',
    '#D9F99D', '#FDE68A', '#FECACA', '#DDD6FE',
];

const getAvatarColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/** Enriched appointment with resolved patient name for display */
interface DisplayAppointment extends Appointment {
    patientName: string;
    displayTime: string;
    displayType: string;
}

/** Map real Appointment → DisplayAppointment by cross-referencing patients */
function enrichAppointments(
    appointments: Appointment[],
    patients: PatientProfile[],
): DisplayAppointment[] {
    const patientMap = new Map(patients.map((p) => [p.id, p.full_name]));
    return appointments.map((a) => ({
        ...a,
        patientName: patientMap.get(a.patient_id) ?? 'Unknown Patient',
        displayTime: new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        displayType: a.appointment_type === 'VIDEO' ? 'Video Consultation'
            : a.appointment_type === 'FOLLOW_UP' ? 'Follow-up'
                : a.appointment_type === 'NEW_PATIENT' ? 'New Patient'
                    : 'In-Person',
    }));
}

/** Check if appointment is today */
function isToday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
}

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

function HeroCard({ appointment, onStartCall, onShare }: { appointment: DisplayAppointment; onStartCall: () => void; onShare: () => void }) {
    return (
        <ThemedView bg="surface" rounded style={styles.heroCard}>
            <ThemedText color="muted" weight="semiBold" size="xs" style={styles.heroLabel}>NEXT APPOINTMENT</ThemedText>
            <View style={styles.heroBody}>
                <Avatar name={appointment.patientName} size={52} />
                <View style={styles.heroInfo}>
                    <ThemedText color="primary" weight="bold" size="xl" style={styles.heroPatient}>{appointment.patientName}</ThemedText>
                    <ThemedText color="secondary" size="sm" style={styles.heroMeta}>
                        {appointment.displayTime}  •  {appointment.displayType}
                    </ThemedText>
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable
                    style={({ pressed }) => [
                        styles.heroShareBtn,
                        pressed && { opacity: 0.7 },
                    ]}
                    onPress={onShare}
                >
                    <Feather name="share-2" size={18} color={doctorColors.primary} />
                </Pressable>
                <SmartJoinButton
                    scheduledTime={appointment.scheduled_time}
                    durationMinutes={appointment.duration_minutes || 30}
                    appointmentStatus={appointment.status}
                    role="doctor"
                    onPress={onStartCall}
                    style={{ flex: 1 }}
                />
            </View>
        </ThemedView>
    );
}

function ActionPill({ action, onPress }: { action: QuickAction; onPress?: () => void }) {
    const { colors } = useTheme();
    return (
        <Pressable
            style={({ pressed }) => [
                styles.actionPill,
                pressed && { opacity: 0.7 },
            ]}
            onPress={onPress}
        >
            <View style={[styles.actionPillIcon, { backgroundColor: colors.primaryLight }]}>
                <Feather name={action.icon} size={20} color={colors.primary} />
            </View>
            <ThemedText color="secondary" weight="medium" size="xs" style={styles.actionPillLabel}>{action.label}</ThemedText>
        </Pressable>
    );
}

function ScheduleRow({ appointment, onPress, onJoin, onShare }: { appointment: DisplayAppointment; onPress: () => void; onJoin: () => void; onShare: () => void }) {
    const { colors } = useTheme();
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
                <ThemedText color="primary" weight="semiBold" size="base" style={styles.scheduleName}>{appointment.patientName}</ThemedText>
                <ThemedText color="muted" size="sm" style={styles.scheduleMeta}>
                    {appointment.displayTime}  •  {appointment.displayType}
                </ThemedText>
            </View>
            <Pressable
                style={({ pressed }) => [
                    styles.shareBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    pressed && { opacity: 0.7 },
                ]}
                onPress={onShare}
            >
                <Feather name="share-2" size={14} color={colors.textMuted} />
            </Pressable>
            <SmartJoinButton
                scheduledTime={appointment.scheduled_time}
                durationMinutes={appointment.duration_minutes || 30}
                appointmentStatus={appointment.status}
                role="doctor"
                size="sm"
                onPress={onJoin}
            />
        </Pressable>
    );
}

function PatientRow({ patient, onPress }: { patient: PatientProfile; onPress: () => void }) {
    const condition = patient.existing_conditions?.join(', ') ?? '—';
    return (
        <Pressable
            style={({ pressed }) => [
                styles.patientRow,
                pressed && { opacity: 0.7 },
            ]}
            onPress={onPress}
        >
            <Avatar name={patient.full_name} size={40} />
            <View style={styles.patientInfo}>
                <ThemedText color="primary" weight="semiBold" size="base" style={styles.patientName}>{patient.full_name}</ThemedText>
                <ThemedText color="muted" size="sm" style={styles.patientCondition}>{condition}</ThemedText>
            </View>
            <ThemedText color="muted" size="xs" style={styles.patientLastVisit}>
                {new Date(patient.created_at).toLocaleDateString()}
            </ThemedText>
        </Pressable>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function DoctorHomeScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const { colors } = useTheme();
    const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [isRxOpen, setIsRxOpen] = useState(false);
    const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

    // Real data from API
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
    const [appointments, setAppointments] = useState<DisplayAppointment[]>([]);
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!token) return;
        try {
            const [profile, rawAppts, rawPatients] = await Promise.all([
                getDoctorProfile(token),
                getAppointments(token),
                getPatients(token),
            ]);
            setDoctorProfile(profile);
            setPatients(rawPatients);
            setAppointments(enrichAppointments(rawAppts, rawPatients));
        } catch (e) {
            console.error('Failed to load dashboard:', e);
        }
    }, [token]);

    useEffect(() => {
        fetchAll().finally(() => setLoading(false));
    }, [fetchAll]);

    // ── Share to WhatsApp ──
    const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://careconnect.app';

    const shareToWhatsApp = useCallback(async (appointmentId: string) => {
        if (!token) return;
        try {
            let patientToken: string | undefined;
            try {
                const res = await startVideoSession(token, appointmentId);
                patientToken = res.patient_join_token;
            } catch {
                const res = await getJoinToken(token, appointmentId);
                patientToken = res.patient_join_token;
            }
            if (!patientToken) {
                Alert.alert('Not ready', 'Start the call first to generate a share link.');
                return;
            }
            const joinUrl = `${WEB_URL}/join/${appointmentId}?token=${encodeURIComponent(patientToken)}`;
            const msg = `Hi! Your CareConnect video consultation is ready.\n\nJoin here: ${joinUrl}`;
            const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            await Linking.openURL(waUrl);
        } catch (err: any) {
            Alert.alert('Share failed', err.message);
        }
    }, [token, WEB_URL]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAll();
        setRefreshing(false);
    }, [fetchAll]);

    // Derived data
    const doctorName = doctorProfile?.full_name ?? 'Doctor';
    const now = new Date();
    const upcomingAppointments = appointments
        .filter((a) => new Date(a.scheduled_time) >= now && (a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS'))
        .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
    const nextAppointment = upcomingAppointments[0] ?? null;
    const todaySchedule = appointments
        .filter((a) => isToday(a.scheduled_time) && a.id !== nextAppointment?.id)
        .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

    const openChart = (patient: PatientProfile) => {
        setSelectedPatient(patient);
        setIsChartOpen(true);
    };

    // Find patient by ID from a DisplayAppointment
    const openChartFromAppointment = (appt: DisplayAppointment) => {
        const found = patients.find((p) => p.id === appt.patient_id);
        if (found) openChart(found);
    };
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* ── Header ─────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {getBranding().logoUrl ? (
                            <Image source={{ uri: getBranding().logoUrl as string }} style={styles.logoImage} resizeMode="contain" />
                        ) : (
                            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
                                <Feather name="activity" size={20} color="#fff" />
                            </View>
                        )}
                        <View>
                            <ThemedText color="secondary" size="sm" style={styles.greeting}>Welcome,</ThemedText>
                            <ThemedText color="primary" weight="bold" size="lg" style={styles.doctorName}>{doctorName}</ThemedText>
                        </View>
                    </View>
                    <Avatar name={doctorName} size={42} />
                </View>

                {loading ? (
                    <View style={{ paddingVertical: spacing['6xl'], alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <>
                        {/* ── Hero Card ───────────────────────────────────────── */}
                        {nextAppointment && (
                            <HeroCard
                                appointment={nextAppointment}
                                onStartCall={() => router.push(`/(doctor)/consultation/${nextAppointment.id}` as any)}
                                onShare={() => shareToWhatsApp(nextAppointment.id)}
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
                                <ThemedText color="primary" weight="bold" size="lg" style={styles.sectionTitle}>Today's Schedule</ThemedText>
                                {todaySchedule.length > 5 && (
                                    <Pressable
                                        onPress={() => router.push('/(doctor)/appointments' as any)}
                                        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                                    >
                                        <ThemedText color="brand" weight="medium" size="sm" style={styles.showMore}>Show More</ThemedText>
                                    </Pressable>
                                )}
                            </View>
                            <ThemedView bg="surface" rounded style={styles.card}>
                                {todaySchedule.length === 0 ? (
                                    <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                                        <ThemedText color="muted" weight="regular">
                                            No other appointments today
                                        </ThemedText>
                                    </View>
                                ) : (
                                    todaySchedule.slice(0, 5).map((appt, idx, arr) => (
                                        <View key={appt.id}>
                                            <ScheduleRow
                                                appointment={appt}
                                                onPress={() => openChartFromAppointment(appt)}
                                                onJoin={() => router.push(`/(doctor)/consultation/${appt.id}` as any)}
                                                onShare={() => shareToWhatsApp(appt.id)}
                                            />
                                            {idx < arr.length - 1 && (
                                                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                                            )}
                                        </View>
                                    ))
                                )}
                            </ThemedView>
                        </View>

                        {/* ── Recent Patients ──────────────────────────────────── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <ThemedText color="primary" weight="bold" size="lg" style={styles.sectionTitle}>Recent Patients</ThemedText>
                                {patients.length > 5 && (
                                    <Pressable
                                        onPress={() => router.push('/(doctor)/patients' as any)}
                                        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                                    >
                                        <ThemedText color="brand" weight="medium" size="sm" style={styles.showMore}>Show More</ThemedText>
                                    </Pressable>
                                )}
                            </View>
                            <ThemedView bg="surface" rounded style={styles.card}>
                                {patients.length === 0 ? (
                                    <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                                        <ThemedText color="muted" weight="regular">
                                            No patients yet
                                        </ThemedText>
                                    </View>
                                ) : (
                                    patients.slice(0, 5).map((patient, idx, arr) => (
                                        <View key={patient.id}>
                                            <PatientRow
                                                patient={patient}
                                                onPress={() => openChart(patient)}
                                            />
                                            {idx < arr.length - 1 && (
                                                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                                            )}
                                        </View>
                                    ))
                                )}
                            </ThemedView>
                        </View>
                    </>
                )}
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
                patientId={selectedPatient?.id}
                patientName={selectedPatient?.full_name ?? ''}
                patientAge={selectedPatient?.date_of_birth ?? ''}
                patientGender={selectedPatient?.gender ?? ''}
                onPrescriptionCreated={fetchAll}
            />
            <AvailabilityModal
                visible={isAvailabilityOpen}
                onClose={() => setIsAvailabilityOpen(false)}
                profile={doctorProfile}
                onSaved={fetchAll}
            />
            <ActivityHistoryModal
                visible={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
            <AddPatientModal
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
                onPatientAdded={fetchAll}
            />
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImage: {
        width: 38,
        height: 38,
    },
    greeting: {
    },
    doctorName: {
    },

    // ── Avatar (shared)
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Hero Card
    heroCard: {
        marginHorizontal: spacing.xl,
        marginTop: spacing.sm,
        padding: spacing.xl,
        ...shadows.elevated,
    },
    heroLabel: {
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
        // dynamic font/color handled by ThemedText
    },
    heroMeta: {
        marginTop: spacing.xxs,
    },
    heroCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
    },
    heroShareBtn: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.md,
        borderWidth: 1,
    },
    heroCtaPressed: {
    },
    heroCtaText: {
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionPillLabel: {
        textAlign: 'center',
    },

    // ── Sections
    section: {
        marginTop: spacing['3xl'],
        paddingHorizontal: spacing.xl,
    },
    sectionTitle: {
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    showMore: {
    },
    card: {
        padding: spacing.lg,
        ...shadows.card,
    },
    divider: {
        height: 1,
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
    },
    scheduleMeta: {
        marginTop: spacing.xxs,
    },
    shareBtn: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.sm,
        borderWidth: 1,
    },
    joinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.sm,
        borderWidth: 1,
    },
    joinBtnText: {
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
    },
    patientCondition: {
        marginTop: spacing.xxs,
    },
    patientLastVisit: {
    },
});
