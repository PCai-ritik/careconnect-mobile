/**
 * CareConnect — Prescription Type Selector Sheet
 *
 * Opens before NewPrescriptionModal so the doctor can choose between:
 *   1. Independent Prescription — no patient binding (walk-in / unnamed)
 *   2. Prescription for a Patient — picks from the doctor's patient directory
 *
 * Manages its own two-view state (select → patient list) and fetches
 * patients lazily when the patient-list view is first entered.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    TextInput,
    Pressable,
    FlatList,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { ThemedText } from '@/components/shared/Themed';
import { useAuth } from '@/hooks/useAuth';
import { getPatients } from '@/services/doctor';
import type { PatientProfile } from '@/services/types';
import { spacing, radii, shadows } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

type SheetView = 'select' | 'patients';

export interface PrescriptionTypeSheetProps {
    visible: boolean;
    onClose: () => void;
    /** Doctor chose "Independent Prescription" */
    onIndependentPrescription: () => void;
    /** Doctor selected a patient to bind the prescription to */
    onPatientPrescription: (patient: PatientProfile) => void;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    '#C7D2FE', '#A5B4FC', '#BAE6FD', '#99F6E4',
    '#D9F99D', '#FDE68A', '#FECACA', '#DDD6FE',
];

function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function calcAge(dob: string | null): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

// ─── Patient Row ─────────────────────────────────────────────────────────────

function PatientRow({ patient, onPress }: { patient: PatientProfile; onPress: () => void }) {
    const { colors } = useTheme();
    const age = calcAge(patient.date_of_birth);
    const condition = patient.existing_conditions?.join(', ') ?? '—';
    const avatarBg = getAvatarColor(patient.full_name);

    return (
        <Pressable
            style={({ pressed }) => [
                s.patientRow,
                { borderColor: colors.borderLight },
                pressed && { opacity: 0.7 },
            ]}
            onPress={onPress}
        >
            <View style={[s.patientAvatar, { backgroundColor: avatarBg }]}>
                <Feather name="user" size={20} color="#374151" />
            </View>
            <View style={s.patientInfo}>
                <ThemedText color="primary" weight="semiBold" size="base">{patient.full_name}</ThemedText>
                {(age !== null || patient.gender) && (
                    <ThemedText color="muted" size="xs" style={{ marginTop: 2 }}>
                        {age !== null ? `Age ${age}` : ''}
                        {age !== null && patient.gender ? '  ·  ' : ''}
                        {patient.gender ?? ''}
                    </ThemedText>
                )}
                {condition !== '—' && (
                    <ThemedText color="brand" weight="medium" size="xs" style={{ marginTop: 2 }}>{condition}</ThemedText>
                )}
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrescriptionTypeSheet({
    visible,
    onClose,
    onIndependentPrescription,
    onPatientPrescription,
}: PrescriptionTypeSheetProps) {
    const { colors } = useTheme();
    const { token } = useAuth();

    const [view, setView] = useState<SheetView>('select');
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [patientsFetched, setPatientsFetched] = useState(false);
    const [search, setSearch] = useState('');

    // Reset to select view whenever the sheet opens
    useEffect(() => {
        if (visible) {
            setView('select');
            setSearch('');
        }
    }, [visible]);

    const fetchPatients = useCallback(async () => {
        if (!token || patientsFetched) return;
        setLoadingPatients(true);
        try {
            const data = await getPatients(token);
            setPatients(data);
            setPatientsFetched(true);
        } catch {
            // silently fail — list will just be empty
        } finally {
            setLoadingPatients(false);
        }
    }, [token, patientsFetched]);

    const handleSelectPatientView = () => {
        setView('patients');
        fetchPatients();
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return patients;
        const q = search.toLowerCase();
        return patients.filter(
            (p) =>
                p.full_name.toLowerCase().includes(q) ||
                (p.existing_conditions?.some((c) => c.toLowerCase().includes(q)) ?? false),
        );
    }, [search, patients]);

    const handleBack = () => setView('select');

    return (
        <ThemedBottomSheet visible={visible} onClose={onClose}>
            {/* ── Header ── */}
            <View style={[s.header, { borderBottomColor: colors.borderLight }]}>
                {view === 'patients' ? (
                    <Pressable onPress={handleBack} style={s.backBtn} hitSlop={8}>
                        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
                    </Pressable>
                ) : (
                    <View style={s.backBtn} />
                )}
                <ThemedText color="primary" weight="bold" size="lg">
                    {view === 'select' ? 'New Prescription' : 'Select Patient'}
                </ThemedText>
                <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
                    <Feather name="x" size={20} color={colors.textMuted} />
                </Pressable>
            </View>

            {/* ── Select View ── */}
            {view === 'select' && (
                <View style={s.selectContainer}>
                    <ThemedText color="muted" size="sm" style={s.selectSubtitle}>
                        Choose how you'd like to write this prescription.
                    </ThemedText>

                    {/* Card: Independent */}
                    <Pressable
                        style={({ pressed }) => [
                            s.typeCard,
                            { borderColor: colors.borderLight, backgroundColor: colors.surface },
                            pressed && { opacity: 0.75 },
                        ]}
                        onPress={onIndependentPrescription}
                    >
                        <View style={[s.typeCardIcon, { backgroundColor: colors.primaryLight }]}>
                            <Feather name="file-text" size={26} color={colors.primary} />
                        </View>
                        <View style={s.typeCardText}>
                            <ThemedText color="primary" weight="semiBold" size="base">
                                Independent Prescription
                            </ThemedText>
                            <ThemedText color="muted" size="sm" style={{ marginTop: spacing.xxs }}>
                                Write a prescription without linking it to a patient file. Ideal for walk-ins or one-time visits.
                            </ThemedText>
                        </View>
                        <Feather name="chevron-right" size={20} color={colors.textMuted} />
                    </Pressable>

                    {/* Card: For a Patient */}
                    <Pressable
                        style={({ pressed }) => [
                            s.typeCard,
                            { borderColor: colors.borderLight, backgroundColor: colors.surface },
                            pressed && { opacity: 0.75 },
                        ]}
                        onPress={handleSelectPatientView}
                    >
                        <View style={[s.typeCardIcon, { backgroundColor: colors.primaryLight }]}>
                            <Feather name="users" size={26} color={colors.primary} />
                        </View>
                        <View style={s.typeCardText}>
                            <ThemedText color="primary" weight="semiBold" size="base">
                                Prescription for a Patient
                            </ThemedText>
                            <ThemedText color="muted" size="sm" style={{ marginTop: spacing.xxs }}>
                                Link to an existing patient in your directory. The prescription is saved to their medical history.
                            </ThemedText>
                        </View>
                        <Feather name="chevron-right" size={20} color={colors.textMuted} />
                    </Pressable>
                </View>
            )}

            {/* ── Patient List View ── */}
            {view === 'patients' && (
                <View style={s.patientListContainer}>
                    {/* Search */}
                    <View style={[s.searchBar, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
                        <Feather name="search" size={16} color={colors.textMuted} />
                        <TextInput
                            style={[s.searchInput, { color: colors.textPrimary }]}
                            placeholder="Search by name or condition…"
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                            autoCapitalize="none"
                        />
                        {search.length > 0 && (
                            <Pressable onPress={() => setSearch('')} hitSlop={8}>
                                <Feather name="x" size={14} color={colors.textMuted} />
                            </Pressable>
                        )}
                    </View>

                    {loadingPatients ? (
                        <View style={s.centred}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={s.centred}>
                            <Feather name="users" size={36} color={colors.textMuted} />
                            <ThemedText color="muted" size="sm" style={{ marginTop: spacing.md, textAlign: 'center' }}>
                                {patients.length === 0 ? 'No patients in your directory yet.' : 'No patients match your search.'}
                            </ThemedText>
                        </View>
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <PatientRow
                                    patient={item}
                                    onPress={() => onPatientPrescription(item)}
                                />
                            )}
                            contentContainerStyle={s.listContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </View>
            )}
        </ThemedBottomSheet>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 32,
        alignItems: 'flex-start',
    },
    closeBtn: {
        width: 32,
        alignItems: 'flex-end',
    },

    // Select view
    selectContainer: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        gap: spacing.md,
    },
    selectSubtitle: {
        marginBottom: spacing.sm,
    },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        padding: spacing.xl,
        borderRadius: radii.lg,
        borderWidth: 1,
        ...shadows.card,
    },
    typeCardIcon: {
        width: 52,
        height: 52,
        borderRadius: radii.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeCardText: {
        flex: 1,
    },

    // Patient list view
    patientListContainer: {
        flex: 1,
        paddingTop: spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderRadius: radii.md,
    },
    searchInput: {
        flex: 1,
        padding: 0,
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['6xl'],
    },
    centred: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['6xl'],
    },

    // Patient row
    patientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
    },
    patientAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    patientInfo: {
        flex: 1,
    },
});
