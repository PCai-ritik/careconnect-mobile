/**
 * CareConnect — Doctor Patient Directory Tab
 *
 * Searchable CRM/Directory listing all patients. Tapping a card opens
 * the PatientChartModal. Uses doctorColors tokens + StyleSheet.create().
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
import {
    spacing,
    shadows,
    radii,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedText, ThemedView } from '@/components/shared/Themed';
import { useAuth } from '@/hooks/useAuth';
import { getPatients, addPatient } from '@/services/doctor';
import type { PatientProfile, PatientCreate } from '@/services/types';
import PatientChartModal from '@/components/doctor/PatientChartModal';
import NewPrescriptionModal from '@/components/doctor/NewPrescriptionModal';
import AddPatientModal from '@/components/doctor/AddPatientModal';

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

/** Calculate age from DOB string */
function calcAge(dob: string | null): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

/** e.g. "2024-01-15T..." → "3 months ago" */
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
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
            <Feather name="user" size={size * 0.45} color="#374151" />
        </View>
    );
}

function PatientCard({
    patient,
    onPress,
}: {
    patient: PatientProfile;
    onPress: () => void;
}) {
    const age = calcAge(patient.date_of_birth);
    const condition = patient.existing_conditions?.join(', ') ?? '—';
    const { colors } = useTheme();
    return (
        <Pressable
            style={({ pressed }) => [s.card, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
            onPress={onPress}
        >
            <Avatar name={patient.full_name} size={50} />

            <View style={s.cardInfo}>
                <ThemedText weight="semiBold" size="base" color="primary" style={s.cardName}>{patient.full_name}</ThemedText>
                {(age || patient.gender) && (
                    <ThemedText color="secondary" size="xs" style={s.cardDemographics}>
                        {age ? `Age: ${age}` : ''}
                        {age && patient.gender ? '  •  ' : ''}
                        {patient.gender ?? ''}
                    </ThemedText>
                )}
                <ThemedText color="brand" weight="medium" size="sm" style={s.cardCondition}>{condition}</ThemedText>
                <ThemedText color="muted" size="xs" style={s.cardVisit}>Added: {timeAgo(patient.created_at)}</ThemedText>
            </View>

            <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function PatientsScreen() {
    const { token, user } = useAuth();
    const { colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [prescriptionPatientName, setPrescriptionPatientName] = useState('');

    // Real patient data from API
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPatients = useCallback(async () => {
        if (!token) return;
        try {
            const data = await getPatients(token);
            setPatients(data);
        } catch (e) {
            console.error('Failed to load patients:', e);
        }
    }, [token]);

    useEffect(() => {
        fetchPatients().finally(() => setLoading(false));
    }, [fetchPatients]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPatients();
        setRefreshing(false);
    }, [fetchPatients]);

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return patients;
        const q = searchQuery.toLowerCase();
        return patients.filter(
            (p) =>
                p.full_name.toLowerCase().includes(q) ||
                (p.existing_conditions?.some((c) => c.toLowerCase().includes(q)) ?? false),
        );
    }, [searchQuery, patients]);

    const openChart = (patient: PatientProfile) => {
        setSelectedPatient(patient);
        setIsChartOpen(true);
    };

    return (
        <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* ── Header ── */}
            <View style={s.header}>
                <View>
                    <ThemedText color="primary" weight="bold" size="2xl" style={s.headerTitle}>Patients</ThemedText>
                    <ThemedText color="muted" size="sm" style={s.headerSubtitle}>
                        {patients.length} patients in directory
                    </ThemedText>
                </View>
                <Pressable
                    style={({ pressed }) => [s.addPatientBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}
                    onPress={() => setIsAddPatientOpen(true)}
                >
                    <Feather name="user-plus" size={18} color="#fff" />
                </Pressable>
            </View>

            {/* ── Search Bar ── */}
            <View style={[s.searchBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Feather name="search" size={18} color={colors.textMuted} />
                <TextInput
                    style={[s.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search by name or condition..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                        <Feather name="x" size={16} color={colors.textMuted} />
                    </Pressable>
                )}
            </View>

            {/* ── Patient List ── */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <PatientCard patient={item} onPress={() => openChart(item)} />
                )}
                contentContainerStyle={s.listContent}
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
                            <ThemedText color="primary" weight="semiBold" size="lg" style={s.emptyTitle}>No patients found</ThemedText>
                            <ThemedText color="muted" size="sm" style={s.emptySubtitle}>
                                Try a different search term
                            </ThemedText>
                        </View>
                    )
                }
            />

            {/* ── Chart Modal ── */}
            <PatientChartModal
                visible={isChartOpen}
                patient={selectedPatient}
                onClose={() => setIsChartOpen(false)}
                onNewPrescription={() => {
                    const name = selectedPatient?.full_name ?? '';
                    setIsChartOpen(false);
                    setPrescriptionPatientName(name);
                    setIsPrescriptionOpen(true);
                }}
            />
            <NewPrescriptionModal
                visible={isPrescriptionOpen}
                onClose={() => setIsPrescriptionOpen(false)}
                patientId={selectedPatient?.id}
                patientName={prescriptionPatientName}
                patientGender={selectedPatient?.gender ?? ''}
                onPrescriptionCreated={fetchPatients}
            />
            <AddPatientModal
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
                onPatientAdded={fetchPatients}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    headerTitle: {
    },
    headerSubtitle: {
        marginTop: spacing.xxs,
    },
    addPatientBtn: {
        width: 40,
        height: 40,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.elevated,
    },
    cardInfo: {
        flex: 1,
        gap: spacing.xxs,
    },
    cardName: {
    },
    cardDemographics: {
    },
    cardCondition: {
    },
    cardVisit: {
    },

    // Avatar
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['6xl'],
        gap: spacing.sm,
    },
    emptyTitle: {
    },
    emptySubtitle: {
    },
});
