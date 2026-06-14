/**
 * CareConnect — Doctor Appointments Tab
 *
 * Flat list of all appointments (no pending tab — instant confirmation).
 * Matches web dashboard schedule/page.tsx 1:1.
 *
 * Features: search, pagination, Emergency Reschedule (cancel), Join Call.
 * Uses doctorColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedText, ThemedView } from '@/components/shared/Themed';
import {
    spacing,
    shadows,
    radii,
    typography,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getAppointments, getPatients, updateAppointmentStatus } from '@/services/doctor';
import type { Appointment, PatientProfile, AppointmentStatus } from '@/services/types';
import ThemedAlert from '@/components/doctor/ThemedAlert';

// ─── Constants ──────────────────────────────────────────────────────────────

// Constants removed

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

// ─── Helpers (matching web) ─────────────────────────────────────────────────

/** Map backend status → display status */
function mapStatus(s: AppointmentStatus): 'upcoming' | 'completed' {
    if (s === 'COMPLETED' || s === 'CANCELLED') return 'completed';
    return 'upcoming'; // CONFIRMED, IN_PROGRESS → upcoming
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Enriched display appointment */
interface DisplayAppointment {
    id: string;
    patientName: string;
    date: string;
    time: string;
    type: string;
    displayStatus: 'upcoming' | 'completed';
    reason: string | null;
}

function enrichAppointments(
    appointments: Appointment[],
    patients: PatientProfile[],
): DisplayAppointment[] {
    const patientMap = new Map(patients.map((p) => [p.id, p.full_name]));
    return appointments.map((a) => ({
        id: a.id,
        patientName: patientMap.get(a.patient_id) ?? 'Unknown Patient',
        date: formatDate(a.scheduled_time),
        time: formatTime(a.scheduled_time),
        type: a.appointment_type === 'VIDEO' ? 'Video Consultation'
            : a.appointment_type === 'FOLLOW_UP' ? 'Follow-up'
                : a.appointment_type === 'NEW_PATIENT' ? 'New Patient'
                    : 'In-Person',
        displayStatus: mapStatus(a.status),
        reason: a.reason,
    }));
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
    return (
        <View
            style={[
                s.avatar,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: avatarColor(name),
                },
            ]}
        >
            <Feather name="user" size={size * 0.48} color="#374151" />
        </View>
    );
}

function StatusBadge({ status }: { status: 'upcoming' | 'completed' }) {
    const isUpcoming = status === 'upcoming';
    const { colors } = useTheme();
    return (
        <View
            style={[
                s.badge,
                { backgroundColor: isUpcoming ? '#DCFCE7' : colors.surfaceMuted },
            ]}
        >
            <View
                style={[
                    s.badgeDot,
                    { backgroundColor: isUpcoming ? '#22C55E' : colors.textMuted },
                ]}
            />
            <ThemedText
                weight="medium"
                size="xs"
                style={[
                    s.badgeText,
                    { color: isUpcoming ? '#15803D' : colors.textSecondary },
                ]}
            >
                {isUpcoming ? 'Confirmed' : 'Completed'}
            </ThemedText>
        </View>
    );
}

// ─── Appointment Card (matches web row layout) ──────────────────────────────

function AppointmentCard({
    appointment,
    onJoin,
    onReschedule,
}: {
    appointment: DisplayAppointment;
    onJoin: () => void;
    onReschedule: () => void;
}) {
    const isUpcoming = appointment.displayStatus === 'upcoming';
    const { colors } = useTheme();

    return (
        <ThemedView bg="surface" rounded style={s.card}>
            {/* Top row */}
            <View style={s.cardTop}>
                <Avatar name={appointment.patientName} size={46} />
                <View style={s.cardInfo}>
                    <ThemedText color="primary" weight="semiBold" size="base" style={s.cardName}>{appointment.patientName}</ThemedText>
                    <ThemedText color="muted" size="xs" style={s.cardMeta}>
                        {appointment.date}  •  {appointment.time}
                    </ThemedText>
                    <ThemedText color="secondary" weight="medium" size="xs" style={s.cardType}>{appointment.type}</ThemedText>
                </View>
                <StatusBadge status={appointment.displayStatus} />
            </View>

            {/* Action row */}
            <View style={[s.cardActions, { borderTopColor: colors.borderLight }]}>
                {isUpcoming ? (
                    <>
                        <Pressable
                            style={({ pressed }) => [
                                s.rescheduleBtn,
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={onReschedule}
                        >
                            <Feather name="calendar" size={15} color="#D97706" />
                            <ThemedText weight="medium" size="sm" style={s.rescheduleBtnText}>Reschedule</ThemedText>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                s.joinBtn,
                                { backgroundColor: colors.primary },
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={onJoin}
                        >
                            <Feather name="video" size={15} color="#fff" />
                            <ThemedText weight="semiBold" size="sm" style={s.joinBtnText}>Join Call</ThemedText>
                        </Pressable>
                    </>
                ) : (
                    <Pressable
                        style={({ pressed }) => [
                            s.summaryBtn,
                            { borderColor: colors.borderLight },
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => { }}
                    >
                        <Feather name="file-text" size={15} color={colors.primary} />
                        <ThemedText color="brand" weight="medium" size="sm" style={s.summaryBtnText}>View Summary</ThemedText>
                    </Pressable>
                )}
            </View>
        </ThemedView>
    );
}

// Removed PaginationFooter

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const { colors } = useTheme();
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(10);

    // Real data from API
    const [displayAppointments, setDisplayAppointments] = useState<DisplayAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Emergency Reschedule state (matches web)
    const [rescheduleTarget, setRescheduleTarget] = useState<DisplayAppointment | null>(null);
    const [showRescheduleAlert, setShowRescheduleAlert] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [cancelledName, setCancelledName] = useState('');

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [rawAppts, rawPatients] = await Promise.all([
                getAppointments(token),
                getPatients(token),
            ]);
            setDisplayAppointments(enrichAppointments(rawAppts, rawPatients));
        } catch (e) {
            console.error('Failed to load appointments:', e);
        }
    }, [token]);

    useEffect(() => {
        fetchData().finally(() => setLoading(false));
    }, [fetchData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [fetchData]);

    // ── Filtered & paginated data ──
    const filtered = useMemo(() => {
        if (!search.trim()) return displayAppointments;
        const q = search.toLowerCase();
        return displayAppointments.filter((a) => a.patientName.toLowerCase().includes(q));
    }, [search, displayAppointments]);

    const upcomingCount = filtered.filter((a) => a.displayStatus === 'upcoming').length;
    const completedCount = filtered.filter((a) => a.displayStatus === 'completed').length;

    const visibleAppointments = filtered.slice(0, visibleCount);

    const handleSearch = (text: string) => {
        setSearch(text);
        setVisibleCount(10);
    };

    const loadMore = useCallback(() => {
        if (visibleCount < filtered.length) {
            setVisibleCount((prev) => prev + 10);
        }
    }, [visibleCount, filtered.length]);

    // ── Emergency Reschedule (cancel) handler — matches web ──
    const handleEmergencyReschedule = useCallback(async () => {
        if (!rescheduleTarget || !token) return;
        setActionLoading(true);
        try {
            await updateAppointmentStatus(token, rescheduleTarget.id, 'CANCELLED');
            setDisplayAppointments((prev) =>
                prev.map((a) =>
                    a.id === rescheduleTarget.id
                        ? { ...a, displayStatus: 'completed' as const }
                        : a,
                ),
            );
            setCancelledName(rescheduleTarget.patientName);
            setShowRescheduleAlert(false);
            setRescheduleTarget(null);
            setShowSuccessAlert(true);
        } catch (e) {
            console.error('Failed to cancel appointment:', e);
        } finally {
            setActionLoading(false);
        }
    }, [rescheduleTarget, token]);

    return (
        <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={s.header}>
                <ThemedText variant="heading" size="2xl" weight="bold" color="primary" style={s.headerTitle}>Schedule</ThemedText>
                <ThemedText color="muted" size="sm" style={s.headerSubtitle}>
                    Manage your upcoming consultations
                </ThemedText>
            </View>

            <View style={s.statusRow}>
                <View style={s.statusPill}>
                    <View style={[s.statusDot, { backgroundColor: '#22C55E' }]} />
                    <ThemedText color="muted" size="sm" style={s.statusText}>Upcoming ({upcomingCount})</ThemedText>
                </View>
                <View style={[s.statusDivider, { backgroundColor: colors.border }]} />
                <View style={s.statusPill}>
                    <View style={[s.statusDot, { backgroundColor: colors.textMuted }]} />
                    <ThemedText color="muted" size="sm" style={s.statusText}>Completed ({completedCount})</ThemedText>
                </View>
            </View>

            <View style={[s.searchBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Feather name="search" size={20} color={colors.textMuted} />
                <TextInput
                    style={[s.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search patients..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={filtered.slice(0, visibleCount)}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => (
                    <AppointmentCard
                        appointment={item}
                        onJoin={() => router.push(`/(doctor)/consultation/${item.id}` as any)}
                        onReschedule={() => {
                            setRescheduleTarget(item);
                            setShowRescheduleAlert(true);
                        }}
                    />
                )}
                onEndReached={() => setVisibleCount((prev) => prev + 10)}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={s.emptyState}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={s.emptyState}>
                            <Feather name="search" size={40} color={colors.textMuted} />
                            <ThemedText color="muted" size="base" style={s.emptyText}>No appointments found</ThemedText>
                        </View>
                    )
                }
                ListFooterComponent={
                    visibleCount < filtered.length ? (
                        <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : null
                }
            />

            <ThemedAlert
                visible={showRescheduleAlert}
                variant="warning"
                icon="alert-triangle"
                title="Emergency Reschedule"
                message={`This will cancel ${rescheduleTarget?.patientName ?? ''}'s appointment and notify them via WhatsApp with rescheduling options.`}
                confirmLabel={actionLoading ? 'Cancelling...' : 'Reschedule'}
                cancelLabel="Cancel"
                onConfirm={handleEmergencyReschedule}
                onCancel={() => {
                    setShowRescheduleAlert(false);
                    setRescheduleTarget(null);
                }}
            />

            <ThemedAlert
                visible={showSuccessAlert}
                variant="success"
                icon="check-circle"
                title="Appointment Cancelled"
                message={`${cancelledName}'s appointment has been cancelled. They will be notified via WhatsApp.`}
                confirmLabel="Done"
                onConfirm={() => setShowSuccessAlert(false)}
            />
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: {
        flex: 1,
    },

    // Header
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    headerTitle: {
    },
    headerSubtitle: {
        marginTop: spacing.xs,
    },

    // Status Pills (matching web)
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
    },
    statusDivider: {
        width: 1,
        height: 16,
    },

    // Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderRadius: radii.md,
    },
    searchInput: {
        flex: 1,
        padding: 0,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },

    // Card
    card: {
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.elevated,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    cardInfo: {
        flex: 1,
        gap: spacing.xxs,
    },
    cardName: {
    },
    cardMeta: {
    },
    cardType: {
    },

    // Avatar
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Badge
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeText: {
    },

    // Card actions
    cardActions: {
        flexDirection: 'row',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        justifyContent: 'flex-end',
        gap: spacing.sm,
    },
    joinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
    },
    joinBtnText: {
        color: '#FFFFFF',
    },
    summaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
    },
    summaryBtnText: {
    },

    // Emergency Reschedule button (amber theme — matches web)
    rescheduleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB',
    },
    rescheduleBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: '#D97706',
    },


    // Empty state
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['6xl'],
        gap: spacing.md,
    },
    emptyText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: '#868E96',
    },
});
