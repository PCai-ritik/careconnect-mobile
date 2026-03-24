/**
 * CareConnect — Doctor Appointments Tab
 *
 * Two-view layout via segmented control:
 *   1. All Appointments — searchable, paginated list of upcoming & completed
 *   2. Pending Requests — incoming patient requests with Accept/Reschedule
 *
 * Uses doctorColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    Pressable,
    StyleSheet,
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
import {
    mockDoctorAppointments,
    type DoctorAppointment,
} from '@/services/mock-data';
import ThemedAlert from '@/components/doctor/ThemedAlert';
import RescheduleModal from '@/components/doctor/RescheduleModal';

// ─── Constants ──────────────────────────────────────────────────────────────

type TabId = 'appointments' | 'requests';
const PAGE_SIZE = 4;

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

function StatusBadge({ status }: { status: DoctorAppointment['status'] }) {
    const isUpcoming = status === 'upcoming' || status === 'scheduled';
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
                {isUpcoming ? 'Upcoming' : 'Completed'}
            </Text>
        </View>
    );
}

// ─── Appointment Card ───────────────────────────────────────────────────────

function AppointmentCard({
    appointment,
    onJoin,
}: {
    appointment: DoctorAppointment;
    onJoin: () => void;
}) {
    const isUpcoming =
        appointment.status === 'upcoming' || appointment.status === 'scheduled';

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
                <StatusBadge status={appointment.status} />
            </View>

            {/* Action row */}
            <View style={s.cardActions}>
                {isUpcoming ? (
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

// ─── Request Card ───────────────────────────────────────────────────────────

function RequestCard({
    appointment,
    onAccept,
    onReschedule,
}: {
    appointment: DoctorAppointment;
    onAccept: () => void;
    onReschedule: () => void;
}) {
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
            </View>

            {/* Reason */}
            {appointment.reason ? (
                <View style={s.reasonBox}>
                    <Text style={s.reasonLabel}>Reason for visit</Text>
                    <Text style={s.reasonText}>{appointment.reason}</Text>
                </View>
            ) : null}

            {/* Actions */}
            <View style={s.requestActions}>
                <Pressable
                    style={({ pressed }) => [
                        s.rescheduleBtn,
                        pressed && { opacity: 0.7 },
                    ]}
                    onPress={onReschedule}
                >
                    <Feather name="calendar" size={15} color={doctorColors.primary} />
                    <Text style={s.rescheduleBtnText}>Reschedule</Text>
                </Pressable>
                <Pressable
                    style={({ pressed }) => [
                        s.acceptBtn,
                        pressed && { opacity: 0.85 },
                    ]}
                    onPress={onAccept}
                >
                    <Feather name="check" size={15} color="#fff" />
                    <Text style={s.acceptBtnText}>Accept</Text>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Pagination Footer ──────────────────────────────────────────────────────

function PaginationFooter({
    page,
    totalPages,
    onPrev,
    onNext,
}: {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    return (
        <View style={s.pagination}>
            <Pressable
                style={({ pressed }) => [
                    s.pageBtn,
                    page <= 1 && s.pageBtnDisabled,
                    pressed && page > 1 && { opacity: 0.7 },
                ]}
                onPress={onPrev}
                disabled={page <= 1}
            >
                <Feather
                    name="chevron-left"
                    size={16}
                    color={page <= 1 ? doctorColors.textMuted : doctorColors.primary}
                />
                <Text
                    style={[
                        s.pageBtnText,
                        page <= 1 && s.pageBtnTextDisabled,
                    ]}
                >
                    Prev
                </Text>
            </Pressable>

            <Text style={s.pageIndicator}>
                Page {page} of {totalPages}
            </Text>

            <Pressable
                style={({ pressed }) => [
                    s.pageBtn,
                    page >= totalPages && s.pageBtnDisabled,
                    pressed && page < totalPages && { opacity: 0.7 },
                ]}
                onPress={onNext}
                disabled={page >= totalPages}
            >
                <Text
                    style={[
                        s.pageBtnText,
                        page >= totalPages && s.pageBtnTextDisabled,
                    ]}
                >
                    Next
                </Text>
                <Feather
                    name="chevron-right"
                    size={16}
                    color={page >= totalPages ? doctorColors.textMuted : doctorColors.primary}
                />
            </Pressable>
        </View>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>('appointments');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [allAppointments, setAllAppointments] = useState<DoctorAppointment[]>(
        () => [...mockDoctorAppointments],
    );

    // Accept/Reschedule state
    const [showAcceptAlert, setShowAcceptAlert] = useState(false);
    const [acceptedPatientName, setAcceptedPatientName] = useState('');
    const [rescheduleTarget, setRescheduleTarget] = useState<DoctorAppointment | null>(null);
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

    // ── Filtered data ──
    const appointments = useMemo(() => {
        const base = allAppointments.filter(
            (a) => a.status !== 'pending',
        );
        if (!search.trim()) return base;
        const q = search.toLowerCase();
        return base.filter((a) => a.patientName.toLowerCase().includes(q));
    }, [search, allAppointments]);

    const requests = useMemo(
        () => allAppointments.filter((a) => a.status === 'pending'),
        [allAppointments],
    );

    // ── Pagination ──
    const totalPages = Math.max(1, Math.ceil(appointments.length / PAGE_SIZE));
    const pagedAppointments = appointments.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE,
    );

    // Reset page when search changes
    const handleSearch = (text: string) => {
        setSearch(text);
        setPage(1);
    };

    // ── Accept handler ──
    const handleAccept = useCallback((appointment: DoctorAppointment) => {
        setAcceptedPatientName(appointment.patientName);
        setAllAppointments((prev) =>
            prev.map((a) =>
                a.id === appointment.id ? { ...a, status: 'upcoming' as const } : a,
            ),
        );
        setShowAcceptAlert(true);
    }, []);

    // ── Reschedule handler ──
    const handleRescheduleOpen = useCallback((appointment: DoctorAppointment) => {
        setRescheduleTarget(appointment);
        setIsRescheduleOpen(true);
    }, []);

    const handleRescheduleConfirm = useCallback((date: string, time: string) => {
        if (!rescheduleTarget) return;
        setAllAppointments((prev) =>
            prev.map((a) =>
                a.id === rescheduleTarget.id
                    ? { ...a, date, time, status: 'pending' as const }
                    : a,
            ),
        );
        setIsRescheduleOpen(false);
        setRescheduleTarget(null);
    }, [rescheduleTarget]);

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* ── Header ── */}
            <View style={s.header}>
                <Text style={s.headerTitle}>Appointments</Text>
            </View>

            {/* ── Segmented Control ── */}
            <View style={s.segmentRow}>
                {([
                    { id: 'appointments' as TabId, label: 'All Appointments', icon: 'calendar' as const },
                    { id: 'requests' as TabId, label: `Pending (${requests.length})`, icon: 'inbox' as const },
                ]).map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                        <Pressable
                            key={tab.id}
                            onPress={() => setActiveTab(tab.id)}
                            style={[s.segmentBtn, active && s.segmentBtnActive]}
                        >
                            <Feather
                                name={tab.icon}
                                size={14}
                                color={active ? '#fff' : doctorColors.textMuted}
                            />
                            <Text style={[s.segmentText, active && s.segmentTextActive]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Tab Content ── */}
            {activeTab === 'appointments' ? (
                <View style={s.tabContent}>
                    {/* Search Bar */}
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

                    {/* List */}
                    <FlatList
                        data={pagedAppointments}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <AppointmentCard
                                appointment={item}
                                onJoin={() =>
                                    router.push(`/(doctor)/consultation/${item.id}`)
                                }
                            />
                        )}
                        contentContainerStyle={s.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={s.emptyState}>
                                <Feather name="search" size={40} color={doctorColors.textMuted} />
                                <Text style={s.emptyText}>No appointments found</Text>
                            </View>
                        }
                        ListFooterComponent={
                            appointments.length > 0 ? (
                                <PaginationFooter
                                    page={page}
                                    totalPages={totalPages}
                                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                                    onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                                />
                            ) : null
                        }
                    />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <RequestCard
                            appointment={item}
                            onAccept={() => handleAccept(item)}
                            onReschedule={() => handleRescheduleOpen(item)}
                        />
                    )}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={s.emptyState}>
                            <Feather name="inbox" size={40} color={doctorColors.textMuted} />
                            <Text style={s.emptyText}>No pending requests</Text>
                        </View>
                    }
                />
            )}

            {/* ── Accept Alert ── */}
            <ThemedAlert
                visible={showAcceptAlert}
                variant="success"
                icon="check-circle"
                title="Appointment Accepted"
                message={`${acceptedPatientName}'s appointment has been accepted and added to your schedule.`}
                confirmLabel="Done"
                onConfirm={() => setShowAcceptAlert(false)}
            />

            {/* ── Reschedule Modal ── */}
            <RescheduleModal
                visible={isRescheduleOpen}
                patientName={rescheduleTarget?.patientName ?? ''}
                onClose={() => { setIsRescheduleOpen(false); setRescheduleTarget(null); }}
                onConfirm={handleRescheduleConfirm}
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

    // Segmented Control
    segmentRow: {
        flexDirection: 'row',
        marginHorizontal: spacing.xl,
        backgroundColor: doctorColors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.xxs,
        marginBottom: spacing.lg,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radii.sm,
    },
    segmentBtnActive: {
        backgroundColor: doctorColors.primary,
        ...shadows.card,
    },
    segmentText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },
    segmentTextActive: {
        color: '#fff',
        fontFamily: typography.fontFamily.semiBold,
    },

    // Tab content
    tabContent: { flex: 1 },

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
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
        alignItems: 'flex-end',
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

    // Request card extras
    reasonBox: {
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: doctorColors.surfaceMuted,
        borderRadius: radii.md,
    },
    reasonLabel: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.xs,
        color: doctorColors.textSecondary,
        marginBottom: spacing.xs,
    },
    reasonText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        lineHeight: 20,
    },
    requestActions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    rescheduleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.border,
    },
    rescheduleBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
    },
    acceptBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    acceptBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: '#FFFFFF',
    },

    // Pagination
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    pageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.border,
    },
    pageBtnDisabled: {
        borderColor: doctorColors.borderLight,
        opacity: 0.5,
    },
    pageBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
    },
    pageBtnTextDisabled: {
        color: doctorColors.textMuted,
    },
    pageIndicator: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
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
        color: doctorColors.textMuted,
    },
});
