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
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
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
    return (
        <View
            style={[
                s.badge,
                { backgroundColor: isUpcoming ? '#DCFCE7' : '#F1F5F9' },
            ]}
        >
            <View
                style={[
                    s.badgeDot,
                    { backgroundColor: isUpcoming ? '#22C55E' : '#94A3B8' },
                ]}
            />
            <Text
                style={[
                    s.badgeText,
                    { color: isUpcoming ? '#15803D' : '#64748B' },
                ]}
            >
                {isUpcoming ? 'Confirmed' : 'Completed'}
            </Text>
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

    return (
        <View style={s.card}>
            {/* Top row */}
            <View style={s.cardTop}>
                <Avatar name={appointment.patientName} size={46} />
                <View style={s.cardInfo}>
                    <Text style={s.cardName}>{appointment.patientName}</Text>
                    <Text style={s.cardMeta}>
                        {appointment.date}  •  {appointment.time}
                    </Text>
                    <Text style={s.cardType}>{appointment.type}</Text>
                </View>
                <StatusBadge status={appointment.displayStatus} />
            </View>

            {/* Action row */}
            <View style={s.cardActions}>
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
                            <Text style={s.rescheduleBtnText}>Reschedule</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                s.joinBtn,
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={onJoin}
                        >
                            <Feather name="video" size={15} color="#fff" />
                            <Text style={s.joinBtnText}>Join Call</Text>
                        </Pressable>
                    </>
                ) : (
                    <Pressable
                        style={({ pressed }) => [
                            s.summaryBtn,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => { }}
                    >
                        <Feather name="file-text" size={15} color={doctorColors.primary} />
                        <Text style={s.summaryBtnText}>View Summary</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

// Removed PaginationFooter

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
    const router = useRouter();
    const { token } = useAuth();
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
            // Update local state
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
        <SafeAreaView style={s.container} edges={['top']}>
            {/* ── Header ── */}
            <View style={s.header}>
                <Text style={s.headerTitle}>Appointments</Text>
                <Text style={s.headerSubtitle}>
                    All appointments are instantly confirmed
                </Text>
            </View>

            {/* ── Status Pills (matching web) ── */}
            <View style={s.statusRow}>
                <View style={s.statusPill}>
                    <View style={[s.statusDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={s.statusText}>{upcomingCount} upcoming</Text>
                </View>
                <View style={s.statusDivider} />
                <View style={s.statusPill}>
                    <View style={[s.statusDot, { backgroundColor: '#94A3B8' }]} />
                    <Text style={s.statusText}>{completedCount} completed</Text>
                </View>
            </View>

            {/* ── Search Bar ── */}
            <View style={s.searchBar}>
                <Feather name="search" size={18} color={doctorColors.textMuted} />
                <TextInput
                    style={s.searchInput}
                    placeholder="Search patients..."
                    placeholderTextColor={doctorColors.textMuted}
                    value={search}
                    onChangeText={handleSearch}
                />
                {search.length > 0 && (
                    <Pressable onPress={() => handleSearch('')} hitSlop={8}>
                        <Feather name="x" size={16} color={doctorColors.textMuted} />
                    </Pressable>
                )}
            </View>

            {/* ── List ── */}
            <FlatList
                data={visibleAppointments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <AppointmentCard
                        appointment={item}
                        onJoin={() =>
                            router.push(`/(doctor)/consultation/${item.id}`)
                        }
                        onReschedule={() => {
                            setRescheduleTarget(item);
                            setShowRescheduleAlert(true);
                        }}
                    />
                )}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={doctorColors.primary}
                    />
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={s.emptyState}>
                            <ActivityIndicator size="large" color={doctorColors.primary} />
                        </View>
                    ) : (
                        <View style={s.emptyState}>
                            <Feather name="search" size={40} color={doctorColors.textMuted} />
                            <Text style={s.emptyText}>No appointments found</Text>
                        </View>
                    )
                }
                ListFooterComponent={
                    visibleCount < filtered.length ? (
                        <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={doctorColors.primary} />
                        </View>
                    ) : null
                }
            />

            {/* ── Emergency Reschedule Confirmation (matches web modal) ── */}
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

            {/* ── Success Alert ── */}
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
        backgroundColor: doctorColors.background,
    },

    // Header
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size['2xl'],
        color: doctorColors.textPrimary,
    },
    headerSubtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
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
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },
    statusDivider: {
        width: 1,
        height: 16,
        backgroundColor: doctorColors.border,
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
        borderColor: doctorColors.border,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surface,
    },
    searchInput: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        padding: 0,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },

    // Card
    card: {
        backgroundColor: doctorColors.surface,
        borderRadius: radii.lg,
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
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    cardMeta: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    cardType: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.xs,
        color: doctorColors.textSecondary,
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
        fontFamily: typography.fontFamily.medium,
        fontSize: 11,
    },

    // Card actions
    cardActions: {
        flexDirection: 'row',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
        justifyContent: 'flex-end',
        gap: spacing.sm,
    },
    joinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: doctorColors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
    },
    joinBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: '#FFFFFF',
    },
    summaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
    },
    summaryBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
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

// Pagination styles removed

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
        color: doctorColors.textMuted,
    },
});
