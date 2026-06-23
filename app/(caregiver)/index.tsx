/**
 * CareConnect — Caregiver Dashboard + 4-Step Booking Wizard
 *
 * Dashboard layout:
 *   1. Header: logo + user avatar with notification dot
 *   2. Welcome greeting
 *   3. "Next Up" contextual card
 *   4. "Book New Consultation" CTA → opens booking modal
 *   5. Recent Medical Records scrollable list
 *
 * Booking Modal (bottom sheet):
 *   Step 1: Choose Specialty (icon + color per specialty)
 *   Step 2: Select Doctor
 *   Step 3: Pick Date & Time (month calendar + 3×n time grid)
 *   Step 4: Confirm, select payment method & pay
 *
 * Uses patientColors design tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
    Pressable,
    ScrollView,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    Linking,
    Alert,
    RefreshControl,
    Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
    spacing,
    typography,
    radii,
    shadows,
    getBranding,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { getMyAppointments, getDoctorsByHospital, getPatientRecords, getLinkedPatients, addPatient, updatePatient, getJoinToken } from '@/services/caregiver';
import type { DoctorProfile, Appointment, MedicalRecord, PatientProfile } from '@/services/types';
import MedicalRecordSheet from '@/components/MedicalRecordSheet';
import PatientThemedAlert from '@/components/patient/PatientThemedAlert';
import AddPatientSheet from '@/components/caregiver/AddPatientSheet';
import PatientChartSheet from '@/components/caregiver/PatientChartSheet';
import BookingWizard from '@/components/caregiver/BookingWizard';
import SmartJoinButton from '@/components/SmartJoinButton';
import { ThemedView, ThemedText } from '@/components/shared/Themed';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

// ─── Avatar Pastel Colors (same palette as doctor dashboard) ─────────────────

const AVATAR_COLORS = [
    '#FBCFE8', '#FED7AA', '#A5F3FC', '#BBF7D0',
    '#A5B4FC', '#BAE6FD', '#99F6E4', '#D9F99D',
    '#FDE68A', '#FECACA', '#DDD6FE',
];

const getAvatarColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CaregiverDashboardScreen() {
    const router = useRouter();
    const { user, token, logout } = useAuth();
    const { colors } = useTheme();
    const styles = useStyles(colors);

    // -- API data --
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // -- UI state --
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
    const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
    const [isPatientChartOpen, setIsPatientChartOpen] = useState(false);
    const [showNoPatientsAlert, setShowNoPatientsAlert] = useState(false);
    const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);

    // -- Calendar month navigation --
    const now = new Date();
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [calYear, setCalYear] = useState(now.getFullYear());

    const [refreshing, setRefreshing] = useState(false);

    // -- Fetch data from API --
    const fetchAll = useCallback(async () => {
        if (!token) return;
        try {
            const [appts, pts] = await Promise.all([
                getMyAppointments(token),
                getLinkedPatients(token),
            ]);
            setAppointments(appts);
            setPatients(pts);
            // Fetch doctors for name resolution in Next Up card
            const hospitalId = user?.hospitalId ?? pts[0]?.hospital_id ?? '';
            if (hospitalId) {
                try {
                    const docs = await getDoctorsByHospital(hospitalId);
                    setDoctors(docs);
                } catch { }
            }
            // Fetch records for the first linked patient (if any)
            if (pts.length > 0) {
                const recs = await getPatientRecords(token, pts[0].id);
                setRecords(recs);
            }
        } catch (e: any) {
            console.error('Caregiver dashboard fetch error:', e);
            
            // If authentication failed (401 or similar), show alert and logout
            if (e?.status === 401 || e?.name === 'ApiError') {
                Alert.alert(
                    'Session Expired',
                    'Your session has expired. Please log in again.',
                    [
                        {
                            text: 'Log In',
                            onPress: async () => {
                                await logout();
                                router.replace('/(auth)/login' as any);
                            },
                        },
                    ]
                );
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, user?.hospitalId, logout, router]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAll();
    }, [fetchAll]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Derived data ──
    const upcomingAppointment = appointments.find(
        (a) => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS',
    ) ?? null;

    const isProcessingSummary = useMemo(() => {
        if (!upcomingAppointment) return false;
        if (upcomingAppointment.status !== 'IN_PROGRESS') return false;
        const endTimeMs = new Date(upcomingAppointment.scheduled_time).getTime() + ((upcomingAppointment.duration_minutes || 30) * 60 * 1000);
        return Date.now() > endTimeMs;
    }, [upcomingAppointment]);

    const hasNotifications = records.length > 0;

    const STEP_TITLES = [
        '1. Choose Specialty',
        '2. Select Doctor',
        '3. Pick Date & Time',
        '4. Confirm & Pay',
    ];

    // ── Main render ──

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* ── 1. Header ── */}
                <ThemedView style={styles.header}>
                    <ThemedView style={styles.headerLeft}>
                        {getBranding().logoUrl ? (
                            <Image
                                source={{ uri: getBranding().logoUrl as string }}
                                style={styles.logoImage}
                            />
                        ) : (
                            <Image
                                source={require('@/assets/images/stethescope.png')}
                                style={styles.logoImage}
                            />
                        )}
                        <ThemedText weight="bold" size="xl" style={styles.brandText}>{getBranding().name || 'CareConnect'}</ThemedText>
                    </ThemedView>
                    <Pressable style={styles.avatarWrapper} onPress={() => router.push('/(caregiver)/profile' as any)}>
                        <ThemedView style={[styles.avatar, { backgroundColor: getAvatarColor('Caregiver') }]}>
                            <Feather name="user" size={20} color="#374151" />
                        </ThemedView>
                        {hasNotifications && <ThemedView style={styles.notificationDot} />}
                    </Pressable>
                </ThemedView>

                {/* ── 2. Welcome ── */}
                <ThemedView style={styles.welcomeSection}>
                    <ThemedText weight="bold" size="2xl" style={styles.greeting}>Welcome back</ThemedText>
                    <ThemedText color="secondary" style={styles.subtitle}>Manage your health appointments and records</ThemedText>
                </ThemedView>

                {/* ── Book an Appointment CTA ── */}
                <Pressable style={({ pressed }) => [styles.bookCta, pressed && { opacity: 0.9 }]} onPress={() => setIsBookingWizardOpen(true)}>
                    <ThemedView style={styles.bookCtaIconCircle}>
                        <Feather name="plus" size={24} color={colors.primary} />
                    </ThemedView>
                    <ThemedView style={styles.bookCtaTextBlock}>
                        <ThemedText style={styles.bookCtaTitle}>Book an Appointment</ThemedText>
                        <ThemedText style={styles.bookCtaSubtitle}>Schedule a new video or in-person visit</ThemedText>
                    </ThemedView>
                    <Feather name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>

                {/* ── 3. Next Up Card ── */}
                {upcomingAppointment && (
                    <ThemedView style={styles.nextUpCard}>
                        <ThemedText weight="semiBold" size="xs" style={styles.nextUpLabel}>NEXT UP</ThemedText>
                        <ThemedView style={styles.nextUpBody}>
                            <ThemedView style={styles.nextUpRow}>
                                <ThemedView style={[styles.doctorAvatar, { backgroundColor: getAvatarColor(upcomingAppointment.doctor_id) }]}>
                                    <Feather name="user" size={20} color="#374151" />
                                </ThemedView>
                                <ThemedView style={styles.nextUpInfo}>
                                    <ThemedText weight="semiBold" size="base" style={styles.nextUpDoctor}>{doctors.find(d => d.id === upcomingAppointment.doctor_id)?.full_name ?? 'Doctor'}'s Appointment</ThemedText>
                                    <ThemedText size="sm" color="muted" style={styles.nextUpSpec}>{upcomingAppointment.appointment_type}</ThemedText>
                                </ThemedView>
                            </ThemedView>
                            <ThemedView style={styles.nextUpTimeRow}>
                                <Feather name="clock" size={14} color={colors.textMuted} />
                                <ThemedText weight="medium" size="sm" style={styles.nextUpTime}>{new Date(upcomingAppointment.scheduled_time).toLocaleString()}</ThemedText>
                            </ThemedView>
                        </ThemedView>
                        <ThemedView style={{ flexDirection: 'row', gap: spacing.sm }}>
                            {isProcessingSummary ? (
                                <ThemedView style={[styles.nextUpJoinBtn, { backgroundColor: colors.primaryLight, flex: 1 }]}>
                                    <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.sm }} />
                                    <ThemedText weight="semiBold" size="sm" style={[styles.nextUpJoinText, { color: colors.primaryDark }]}>Processing Summary...</ThemedText>
                                </ThemedView>
                            ) : (
                                <>
                                    <Pressable
                                        style={({ pressed }) => [styles.nextUpShareBtn, pressed && { opacity: 0.7 }]}
                                        onPress={async () => {
                                            if (!token || !upcomingAppointment) return;
                                            const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://careconnect.app';
                                            try {
                                                const res = await getJoinToken(token, upcomingAppointment.id);
                                                if (!res.patient_join_token) {
                                                    Alert.alert('Not ready', 'The doctor needs to start the call first.');
                                                    return;
                                                }
                                                const joinUrl = `${WEB_URL}/join/${upcomingAppointment.id}?token=${encodeURIComponent(res.patient_join_token)}`;
                                                const msg = `Hi! Your CareConnect video consultation is ready.\n\nJoin here: ${joinUrl}`;
                                                await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
                                            } catch (err: any) {
                                                Alert.alert('Share failed', err.message);
                                            }
                                        }}
                                    >
                                        <Feather name="share-2" size={18} color={colors.primary} />
                                    </Pressable>
                                    <SmartJoinButton
                                        scheduledTime={upcomingAppointment.scheduled_time}
                                        durationMinutes={upcomingAppointment.duration_minutes || 30}
                                        appointmentStatus={upcomingAppointment.status}
                                        role="caregiver"
                                        onPress={() => router.push(`/(caregiver)/consultation/${upcomingAppointment.id}` as any)}
                                        style={{ flex: 1 }}
                                    />
                                </>
                            )}
                        </ThemedView>
                    </ThemedView>
                )}

                {/* ── 4. Patients Under Care ── */}
                <ThemedView style={styles.sectionHeader}>
                    <ThemedText weight="semiBold" size="lg" style={styles.sectionTitle}>Patients Under Care</ThemedText>
                </ThemedView>
                {patients.length > 0 ? (
                    patients.map((pt) => {
                        const age = pt.date_of_birth
                            ? Math.floor((Date.now() - new Date(pt.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                            : null;
                        return (
                            <Pressable
                                key={pt.id}
                                style={({ pressed }) => [styles.patientCard, pressed && { opacity: 0.85 }]}
                                onPress={() => { setSelectedPatient(pt); setIsPatientChartOpen(true); }}
                            >
                                <ThemedView style={[styles.patientAvatar, { backgroundColor: getAvatarColor(pt.full_name) }]}>
                                    <ThemedText weight="bold" size="lg" style={styles.patientAvatarText}>
                                        {pt.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </ThemedText>
                                </ThemedView>
                                <ThemedView style={styles.patientInfo}>
                                    <ThemedText weight="semiBold" size="base" style={styles.patientName} numberOfLines={1}>{pt.full_name}</ThemedText>
                                    <ThemedText size="sm" color="muted" style={styles.patientMeta}>
                                        {age ? `${age} yrs` : ''}{age && pt.blood_group ? ' • ' : ''}{pt.blood_group ?? ''}
                                        {pt.existing_conditions && pt.existing_conditions.length > 0
                                            ? ` • ${pt.existing_conditions.join(', ')}`
                                            : ''}
                                    </ThemedText>
                                </ThemedView>
                                <Feather name="chevron-right" size={18} color={colors.textMuted} />
                            </Pressable>
                        );
                    })
                ) : (
                    <Pressable
                        style={({ pressed }) => [styles.emptyPatientCard, pressed && { opacity: 0.85 }]}
                        onPress={() => setIsAddPatientOpen(true)}
                    >
                        <Feather name="user-plus" size={20} color={colors.textMuted} />
                        <ThemedText size="sm" color="muted" style={styles.emptyPatientText}>No patients added yet. Tap to add your first patient.</ThemedText>
                    </Pressable>
                )}

                {/* ── 5. Recent Records ── */}
                <ThemedView style={styles.sectionHeader}>
                    <ThemedText weight="semiBold" size="lg" style={styles.sectionTitle}>Recent Records</ThemedText>
                    {records.length > 0 && (
                        <Pressable onPress={() => router.push('/(caregiver)/records' as any)}>
                            <ThemedText weight="medium" size="sm" color="primary" style={styles.viewAllLink}>View All</ThemedText>
                        </Pressable>
                    )}
                </ThemedView>
                {records.length > 0 ? (
                    records.slice(0, 5).map((record) => (
                        <Pressable key={record.id}
                            style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.85 }]}
                            onPress={() => { setSelectedRecord(record); setIsRecordSheetOpen(true); }}>
                            <ThemedView style={styles.recordContent}>
                                <ThemedText weight="semiBold" size="base" style={styles.recordDiagnosis}>{record.diagnosis}</ThemedText>
                                <ThemedText size="sm" color="muted" style={styles.recordMeta}>Doctor  •  {new Date(record.created_at).toLocaleDateString()}</ThemedText>
                            </ThemedView>
                            <Feather name="chevron-right" size={18} color={colors.textMuted} />
                        </Pressable>
                    ))
                ) : (
                    <ThemedView style={styles.emptyDataCard}>
                        <Feather name="file-text" size={24} color={colors.textMuted} />
                        <ThemedText size="sm" color="muted" style={styles.emptyDataText}>No recent medical records found.</ThemedText>
                    </ThemedView>
                )}

                {/* ── 6. Past Consultations ── */}
                <ThemedView style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                    <ThemedText weight="semiBold" size="lg" style={styles.sectionTitle}>Past Consultations</ThemedText>
                </ThemedView>
                {appointments.filter(a => a.status === 'COMPLETED').slice(0, 5).map((appt) => (
                    <Pressable
                        key={appt.id}
                        style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.85 }]}
                        onPress={() => router.push({ pathname: '/(caregiver)/post-call-summary', params: { appointmentId: appt.id } } as any)}
                    >
                        <ThemedView style={styles.recordContent}>
                            <ThemedText weight="semiBold" size="base" style={styles.recordDiagnosis}>
                                Dr. {doctors.find(d => d.id === appt.doctor_id)?.full_name ?? 'Unknown'}
                            </ThemedText>
                            <ThemedText size="sm" color="muted" style={styles.recordMeta}>
                                {new Date(appt.scheduled_time).toLocaleDateString()} • Video Consultation
                            </ThemedText>
                        </ThemedView>
                        <Feather name="chevron-right" size={18} color={colors.textMuted} />
                    </Pressable>
                ))}
                {appointments.filter(a => a.status === 'COMPLETED').length === 0 && (
                    <ThemedText size="sm" color="muted" style={{ textAlign: 'center', marginTop: spacing.sm }}>
                        No past consultations yet.
                    </ThemedText>
                )}

                <ThemedView style={{ height: spacing['3xl'] }} />
            </ScrollView>

            {/* ═══ MEDICAL RECORD SHEET ═══ */}
            <MedicalRecordSheet
                visible={isRecordSheetOpen}
                record={selectedRecord}
                onClose={() => setIsRecordSheetOpen(false)}
                patient={patients[0] ?? null}
            />

            {/* ═══ NO PATIENTS ALERT ═══ */}
            <PatientThemedAlert
                visible={showNoPatientsAlert}
                variant="warning"
                icon="user-plus"
                title="No Patients Yet"
                message="You need to add at least one patient before booking a consultation. Add a patient to get started."
                confirmLabel="Add Patient"
                cancelLabel="Cancel"
                onConfirm={() => {
                    setShowNoPatientsAlert(false);
                    setIsAddPatientOpen(true);
                }}
                onCancel={() => setShowNoPatientsAlert(false)}
            />

            {/* ═══ ADD PATIENT SHEET ═══ */}
            <AddPatientSheet
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
                onPatientAdded={fetchAll}
                onSubmit={async (data) => {
                    if (!token) return;
                    await addPatient(token, data);
                }}
            />

            {/* ═══ PATIENT CHART SHEET ═══ */}
            <PatientChartSheet
                visible={isPatientChartOpen}
                patient={selectedPatient}
                onClose={() => setIsPatientChartOpen(false)}
                onSave={async (patientId, data) => {
                    if (!token) return;
                    await updatePatient(token, patientId, data);
                    fetchAll();
                }}
            />

            {/* ═══ BOOKING WIZARD ═══ */}
            <BookingWizard
                visible={isBookingWizardOpen}
                onClose={() => setIsBookingWizardOpen(false)}
                onSuccess={fetchAll}
                token={token ?? ''}
                hospitalId={user?.hospitalId ?? ''}
                patients={patients}
                onRequireAddPatient={() => {
                    setIsBookingWizardOpen(false);
                    setIsAddPatientOpen(true);
                }}
            />
            {/* FAB removed as action is handled via navigation popover */}
        </SafeAreaView>
    );
}

// ─── Dashboard Styles ───────────────────────────────────────────────────────

const useStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    logoImage: { width: 34, height: 34, resizeMode: 'contain' },
    brandText: { fontFamily: typography.fontFamily.bold, ...typography.size.lg, color: colors.textPrimary },
    avatarWrapper: { position: 'relative' },

    // Dropdown (Removed)
    avatar: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: '#FFFFFF' },
    notificationDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.background },
    welcomeSection: { marginBottom: spacing['2xl'] },
    greeting: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: colors.textPrimary, marginBottom: spacing.xs },
    subtitle: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textMuted },
    nextUpCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.borderLight, ...shadows.elevated },
    nextUpLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.xs, color: colors.primary, letterSpacing: 1, marginBottom: spacing.md },
    nextUpBody: { marginBottom: spacing.lg },
    nextUpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    doctorAvatar: { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    doctorAvatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: colors.primary },
    nextUpInfo: { flex: 1 },
    nextUpDoctor: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary },
    nextUpSpec: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textSecondary },
    nextUpTimeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 44 + spacing.md },
    nextUpTime: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.textMuted },
    nextUpJoinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, paddingVertical: spacing.md },
    nextUpJoinText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base },
    nextUpShareBtn: { width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    joinCallButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radii.md },
    joinCallText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    bookCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing['2xl'], gap: spacing.md },
    bookCtaIconCircle: { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.card },
    bookCtaTextBlock: { flex: 1 },
    bookCtaTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary },
    bookCtaSubtitle: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textSecondary, marginTop: spacing.xxs },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    sectionTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.lg, color: colors.textPrimary },
    viewAllLink: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.primary },
    recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight, ...shadows.card },
    recordContent: { flex: 1 },
    recordDiagnosis: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary, marginBottom: spacing.xxs },
    recordMeta: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textMuted },

    // Patient cards (full-width rows)
    patientCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radii.md,
        padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1,
        borderColor: colors.borderLight, gap: spacing.md, ...shadows.card,
    },
    patientAvatar: {
        width: 44, height: 44, borderRadius: radii.full,
        alignItems: 'center', justifyContent: 'center',
    },
    patientAvatarText: {
        fontFamily: typography.fontFamily.bold, ...typography.size.base, color: '#111827',
    },
    patientInfo: { flex: 1 },
    patientName: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base,
        color: colors.textPrimary, marginBottom: 2,
    },
    patientMeta: {
        fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: colors.textMuted,
    },
    emptyPatientCard: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.lg, marginBottom: spacing.xl,
        borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed',
    },
    emptyPatientText: {
        flex: 1, fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: colors.textMuted,
    },

    emptyDataCard: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.lg, marginBottom: spacing.xl,
        borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed',
    },
    emptyDataText: {
        flex: 1, fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: colors.textMuted,
    },
});

// ─── Modal Styles ───────────────────────────────────────────────────────────

const useMs = (colors: any) => StyleSheet.create({
    // Backdrop + sheet
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadows.elevated },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },

    // Header
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    navCircle: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.lg, color: colors.textPrimary, flex: 1, textAlign: 'center' },

    // Progress
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderLight },
    progressDotActive: { backgroundColor: colors.primary, width: 24, borderRadius: 4 },

    // Scroll
    sheetScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'] },
    stepBody: { paddingTop: spacing.md },

    // Step 1 — Specialty grid
    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    specCard: {
        width: '47%' as unknown as number,
        backgroundColor: colors.surfaceMuted, borderRadius: radii.lg,
        paddingVertical: spacing.xl, paddingHorizontal: spacing.md,
        alignItems: 'center', gap: spacing.sm,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    specIconCircle: { width: 48, height: 48, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    specName: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.textPrimary, textAlign: 'center' },

    // Step 2 — Doctor list
    doctorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
    doctorAvatar: { width: 48, height: 48, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    doctorAvatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm },
    doctorInfo: { flex: 1 },
    doctorName: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary },
    doctorMeta: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textMuted, marginTop: spacing.xxs },
    doctorFee: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.primary, marginTop: spacing.xs },

    // Step 3 — Calendar
    subLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    calMonthTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary },
    calNav: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    calDowRow: { flexDirection: 'row', marginBottom: spacing.xs },
    calDowText: { flex: 1, textAlign: 'center', fontFamily: typography.fontFamily.medium, ...typography.size.xs, color: colors.textMuted },
    calWeekRow: { flexDirection: 'row', marginBottom: spacing.xxs },
    calCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, margin: 1 },
    calCellToday: { borderWidth: 1.5, borderColor: colors.primary },
    calCellSelected: { backgroundColor: colors.primary },
    calCellDisabled: { opacity: 0.3 },
    calCellText: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.textPrimary },
    calCellTodayText: { color: colors.primary, fontFamily: typography.fontFamily.bold },
    calCellSelectedText: { color: '#FFFFFF', fontFamily: typography.fontFamily.bold },
    calCellDisabledText: { color: colors.textMuted },

    // Time grid — fixed 3 columns
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    timePill: { width: '31%' as unknown as number, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
    timePillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    timePillText: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.textPrimary },
    timePillTextSelected: { color: '#FFFFFF' },
    continueButton: { marginTop: spacing['2xl'], backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
    continueButtonDisabled: { backgroundColor: colors.border },
    continueText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    continueTextDisabled: { color: colors.textMuted },

    // Step 4 — Summary
    summaryCard: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.borderLight },
    summaryTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary, marginBottom: spacing.lg },
    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, gap: spacing.md },
    summaryDotContainer: { width: 20, paddingTop: spacing.xs, alignItems: 'center' },
    summaryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    summaryContent: { flex: 1 },
    summaryLabel: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textMuted },
    summaryValue: { fontFamily: typography.fontFamily.medium, ...typography.size.base, color: colors.textPrimary, marginTop: spacing.xxs },
    summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
    summaryFeeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryFeeLabel: { fontFamily: typography.fontFamily.medium, ...typography.size.base, color: colors.textPrimary },
    summaryFeeValue: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: colors.primary },

    // Step 4 — Payment method
    paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
    paymentCard: {
        width: '48%' as unknown as number,
        backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.md, borderWidth: 1.5, borderColor: colors.borderLight,
        alignItems: 'center', gap: spacing.xs, position: 'relative',
    },
    paymentCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    paymentIcon: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    paymentIconActive: { backgroundColor: colors.primary },
    paymentLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: colors.textPrimary, textAlign: 'center' },
    paymentLabelActive: { color: colors.primaryDark },
    paymentDesc: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textMuted, textAlign: 'center' },
    paymentDescActive: { color: colors.textSecondary },
    paymentCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

    // Pay button
    payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: radii.md, marginBottom: spacing.md },
    payButtonText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    payNote: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textMuted, textAlign: 'center' },

    // Success modal
    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
    successCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['3xl'], alignItems: 'center', width: '100%', ...shadows.elevated },
    successIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    successTitle: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
    successBody: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing['2xl'], lineHeight: 22 },
    successButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing['2xl'], borderRadius: radii.md, width: '100%' },
    successButtonText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },

    // Shared
    emptyText: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing['3xl'] },
});
