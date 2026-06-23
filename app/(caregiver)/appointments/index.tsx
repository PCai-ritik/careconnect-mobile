import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, FlatList, Pressable, RefreshControl, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { typography, spacing, radii, shadows } from '@/constants/theme';
import { ThemedView, ThemedText } from '@/components/shared/Themed';
import { useAuth } from '@/hooks/useAuth';
import { getMyAppointments, getLinkedPatients, addPatient, getDoctorsByHospital } from '@/services/caregiver';
import type { Appointment, PatientProfile, DoctorProfile } from '@/services/types';
import BookingWizard from '@/components/caregiver/BookingWizard';
import AddPatientSheet from '@/components/caregiver/AddPatientSheet';

const { width } = Dimensions.get('window');

// Format date: "Mon, 12 Oct"
function formatDateShort(isoStr: string) {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Format time: "10:30 AM"
function formatTime(isoStr: string) {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AppointmentsScreen() {
    const { token, user } = useAuth();
    const { colors } = useTheme();
    const styles = useStyles(colors);

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!token) return;
        try {
            const [appts, pts, docs] = await Promise.all([
                getMyAppointments(token),
                getLinkedPatients(token),
                getDoctorsByHospital(user?.hospitalId ?? ''),
            ]);
            setAppointments(appts);
            setPatients(pts);
            setDoctors(docs);
        } catch (e) {
            console.error('Failed to fetch appointments data:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAll();
    }, [fetchAll]);

    // Derived states
    const upcoming = useMemo(() => {
        return appointments
            .filter((a) => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status))
            .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
    }, [appointments]);

    const past = useMemo(() => {
        return appointments
            .filter((a) => ['COMPLETED', 'CANCELLED'].includes(a.status))
            .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
    }, [appointments]);

    // Data to list
    const listData = useMemo(() => {
        const data: any[] = [];
        if (upcoming.length > 0) {
            data.push({ type: 'header', title: 'Upcoming Appointments' });
            upcoming.forEach(a => data.push({ type: 'item', data: a }));
        }
        if (past.length > 0) {
            data.push({ type: 'header', title: 'Past Consultations' });
            past.forEach(a => data.push({ type: 'item', data: a }));
        }
        return data;
    }, [upcoming, past]);

    const renderItem = ({ item }: { item: any }) => {
        if (item.type === 'header') {
            return (
                <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md }}>
                    <ThemedText weight="semiBold" size="lg" style={{ color: colors.textPrimary }}>
                        {item.title}
                    </ThemedText>
                    {item.title === 'Upcoming Appointments' && (
                        <Pressable 
                            style={({ pressed }) => [
                                { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
                                pressed && { opacity: 0.85 }
                            ]}
                            onPress={() => setIsBookingWizardOpen(true)}
                        >
                            <Feather name="plus" size={16} color={colors.primary} />
                            <ThemedText weight="semiBold" size="sm" style={{ color: colors.primaryDark }}>New</ThemedText>
                        </Pressable>
                    )}
                </ThemedView>
            );
        }

        const appt: Appointment = item.data;
        const patient = patients.find((p) => p.id === appt.patient_id);
        const doctor = doctors.find((d) => d.id === appt.doctor_id);
        const isPast = ['COMPLETED', 'CANCELLED'].includes(appt.status);
        const isVideo = appt.appointment_type === 'VIDEO';

        return (
            <ThemedView style={[styles.apptCard, isPast && { opacity: 0.7 }]}>
                <ThemedView style={styles.apptHeaderRow}>
                    <ThemedView style={[styles.typeBadge, { backgroundColor: isVideo ? '#DBEAFE' : '#D1FAE5' }]}>
                        <Feather name={isVideo ? 'video' : 'map-pin'} size={14} color={isVideo ? '#3B82F6' : '#10B981'} />
                        <ThemedText weight="medium" size="sm" style={{ color: isVideo ? '#3B82F6' : '#10B981' }}>
                            {isVideo ? 'Video' : 'In-Person'}
                        </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.statusBadge, { backgroundColor: appt.status === 'CANCELLED' ? '#FEE2E2' : colors.surfaceMuted }]}>
                        <ThemedText weight="medium" size="xs" style={{ color: appt.status === 'CANCELLED' ? '#EF4444' : colors.textSecondary }}>
                            {appt.status}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>

                <ThemedView style={styles.apptBody}>
                    <ThemedText weight="semiBold" size="base" style={styles.apptDoctor}>Dr. {doctor?.full_name ?? appt.doctor_id.slice(0, 8)}</ThemedText>
                    {doctor?.specialization && (
                        <ThemedText size="sm" color="secondary" style={{ marginBottom: 2 }}>{doctor.specialization}</ThemedText>
                    )}
                    <ThemedText size="sm" color="secondary" style={styles.apptPatient}>Patient: {patient?.full_name ?? 'Unknown'}</ThemedText>
                </ThemedView>

                <ThemedView style={styles.apptFooter}>
                    <ThemedView style={styles.footerItem}>
                        <Feather name="calendar" size={16} color={colors.textSecondary} />
                        <ThemedText size="sm" color="secondary">{formatDateShort(appt.scheduled_time)}</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.footerItem}>
                        <Feather name="clock" size={16} color={colors.textSecondary} />
                        <ThemedText size="sm" color="secondary">{formatTime(appt.scheduled_time)}</ThemedText>
                    </ThemedView>
                </ThemedView>
            </ThemedView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ThemedView style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                <ThemedView>
                    <ThemedText weight="bold" size="2xl" style={styles.headerTitle}>Appointments</ThemedText>
                    <ThemedText size="base" color="secondary">Manage your upcoming and past visits</ThemedText>
                </ThemedView>
            </ThemedView>

            <FlatList
                data={listData}
                keyExtractor={(item, index) => item.type === 'header' ? item.title : item.data.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    loading ? (
                        <ThemedView style={{ padding: spacing['3xl'], alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </ThemedView>
                    ) : (
                        <ThemedView style={styles.emptyContainer}>
                            <ThemedView style={styles.emptyIconCircle}>
                                <Feather name="calendar" size={32} color={colors.primary} />
                            </ThemedView>
                            <ThemedText weight="semiBold" size="lg" style={styles.emptyTitle}>No Appointments</ThemedText>
                            <ThemedText size="base" color="secondary" style={styles.emptySubtitle}>
                                You haven't booked any consultations yet.
                            </ThemedText>
                            <Pressable 
                                style={({ pressed }) => [
                                    { marginTop: spacing.xl, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
                                    pressed && { opacity: 0.85 }
                                ]}
                                onPress={() => setIsBookingWizardOpen(true)}
                            >
                                <Feather name="plus" size={18} color="#FFFFFF" />
                                <ThemedText weight="semiBold" size="base" style={{ color: '#FFFFFF' }}>Book Appointment</ThemedText>
                            </Pressable>
                        </ThemedView>
                    )
                }
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
        </SafeAreaView>
    );
}

const useStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg },
    headerTitle: { color: colors.textPrimary, marginBottom: spacing.xs },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] * 3 },

    sectionTitle: { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md },

    apptCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md, ...shadows.card },
    apptHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full },
    statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.md },
    
    apptBody: { marginBottom: spacing.md },
    apptDoctor: { color: colors.textPrimary, marginBottom: 2 },
    apptPatient: { },

    apptFooter: { flexDirection: 'row', gap: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'] * 2 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    emptyTitle: { color: colors.textPrimary, marginBottom: spacing.sm },
    emptySubtitle: { textAlign: 'center', paddingHorizontal: spacing['2xl'] },

    fab: {
        position: 'absolute', bottom: spacing['2xl'], right: spacing.xl,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.elevated,
    },
});
