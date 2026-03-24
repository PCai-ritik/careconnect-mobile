/**
 * CareConnect — Doctor Patient Directory Tab
 *
 * Searchable CRM/Directory listing all patients. Tapping a card opens
 * the PatientChartModal. Uses doctorColors tokens + StyleSheet.create().
 */

import { useState, useMemo } from 'react';
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
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';
import { mockRecentPatients, type MockPatient } from '@/services/mock-data';
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
    patient: MockPatient;
    onPress: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
            onPress={onPress}
        >
            <Avatar name={patient.name} size={50} />

            <View style={s.cardInfo}>
                <Text style={s.cardName}>{patient.name}</Text>
                {(patient.age || patient.gender) && (
                    <Text style={s.cardDemographics}>
                        {patient.age ? `Age: ${patient.age}` : ''}
                        {patient.age && patient.gender ? '  •  ' : ''}
                        {patient.gender ?? ''}
                    </Text>
                )}
                <Text style={s.cardCondition}>{patient.condition}</Text>
                <Text style={s.cardVisit}>Last visit: {patient.lastVisit}</Text>
            </View>

            <Feather name="chevron-right" size={20} color={doctorColors.textMuted} />
        </Pressable>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function PatientsScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<MockPatient | null>(null);
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [prescriptionPatientName, setPrescriptionPatientName] = useState('');

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return mockRecentPatients;
        const q = searchQuery.toLowerCase();
        return mockRecentPatients.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.condition.toLowerCase().includes(q),
        );
    }, [searchQuery]);

    const openChart = (patient: MockPatient) => {
        setSelectedPatient(patient);
        setIsChartOpen(true);
    };

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* ── Header ── */}
            <View style={s.header}>
                <View>
                    <Text style={s.headerTitle}>Patients</Text>
                    <Text style={s.headerSubtitle}>
                        {mockRecentPatients.length} patients in directory
                    </Text>
                </View>
                <Pressable
                    style={({ pressed }) => [s.addPatientBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setIsAddPatientOpen(true)}
                >
                    <Feather name="user-plus" size={18} color="#fff" />
                </Pressable>
            </View>

            {/* ── Search Bar ── */}
            <View style={s.searchBar}>
                <Feather name="search" size={18} color={doctorColors.textMuted} />
                <TextInput
                    style={s.searchInput}
                    placeholder="Search by name or condition..."
                    placeholderTextColor={doctorColors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                        <Feather name="x" size={16} color={doctorColors.textMuted} />
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
                ListEmptyComponent={
                    <View style={s.emptyState}>
                        <Feather name="search" size={40} color={doctorColors.textMuted} />
                        <Text style={s.emptyTitle}>No patients found</Text>
                        <Text style={s.emptySubtitle}>
                            Try a different search term
                        </Text>
                    </View>
                }
            />

            {/* ── Chart Modal ── */}
            <PatientChartModal
                visible={isChartOpen}
                patient={selectedPatient}
                onClose={() => setIsChartOpen(false)}
                onNewPrescription={() => {
                    const name = selectedPatient?.name ?? '';
                    setIsChartOpen(false);
                    setPrescriptionPatientName(name);
                    setIsPrescriptionOpen(true);
                }}
            />
            <NewPrescriptionModal
                visible={isPrescriptionOpen}
                onClose={() => setIsPrescriptionOpen(false)}
                patientName={prescriptionPatientName}
            />
            <AddPatientModal
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        marginTop: spacing.xxs,
    },
    addPatientBtn: {
        width: 40,
        height: 40,
        borderRadius: radii.full,
        backgroundColor: doctorColors.primary,
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
        borderColor: '#E2E8F0',
        borderRadius: radii.md,
        backgroundColor: '#F8FAFC',
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: doctorColors.surface,
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
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    cardDemographics: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textSecondary,
    },
    cardCondition: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
    },
    cardVisit: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
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
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.lg,
        color: doctorColors.textPrimary,
    },
    emptySubtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },
});
