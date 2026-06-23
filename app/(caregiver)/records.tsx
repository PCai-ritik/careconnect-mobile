/**
 * CareConnect — Medical Records List
 *
 * Full list of patient medical records. Reuses the sleek card
 * styling from the dashboard's "Recent Records" section.
 *
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useEffect } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedView, ThemedText } from '@/components/shared/Themed';
import { useAuth } from '@/hooks/useAuth';
import { getPatientRecords, getLinkedPatients } from '@/services/caregiver';
import type { MedicalRecord, PatientProfile } from '@/services/types';
import MedicalRecordSheet from '@/components/MedicalRecordSheet';

export default function RecordsScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [activePatient, setActivePatient] = useState<PatientProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
    const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false);

    useEffect(() => {
        (async () => {
            if (!token) return;
            try {
                const patients = await getLinkedPatients(token);
                if (patients.length > 0) {
                    setActivePatient(patients[0]);
                    const recs = await getPatientRecords(token, patients[0].id);
                    setRecords(recs);
                }
            } catch (e) {
                console.error('Failed to fetch records:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header ── */}
            <ThemedView style={styles.header}>
                <ThemedView style={{ width: 40 }} />
                <ThemedText weight="semiBold" size="lg" style={styles.headerTitle}>Medical Records</ThemedText>
                <ThemedView style={{ width: 40 }} />
            </ThemedView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Summary */}
                <ThemedView style={styles.countRow}>
                    <Feather name="folder" size={16} color={colors.primary} />
                    <ThemedText weight="medium" size="sm" color="secondary" style={styles.countText}>{records.length} records on file</ThemedText>
                </ThemedView>

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing['2xl'] }} />
                ) : records.length === 0 ? (
                    <ThemedText size="base" color="muted" style={{ textAlign: 'center', marginTop: spacing['2xl'] }}>No medical records found.</ThemedText>
                ) : null}

                {/* Records list */}
                {!loading && records.map((record) => (
                    <Pressable
                        key={record.id}
                        style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.85 }]}
                        onPress={() => { setSelectedRecord(record); setIsRecordSheetOpen(true); }}
                    >
                        {/* Left accent bar */}
                        <ThemedView style={styles.accentBar} />

                        <ThemedView style={styles.recordBody}>
                            <ThemedView style={styles.recordTop}>
                                <ThemedText weight="semiBold" style={styles.recordDiagnosis}>{record.diagnosis}</ThemedText>
                                {record.follow_up_date && (
                                    <ThemedView style={styles.followUpBadge}>
                                        <Feather name="calendar" size={10} color={colors.primary} />
                                        <ThemedText weight="medium" style={styles.followUpBadgeText}>Follow-up</ThemedText>
                                    </ThemedView>
                                )}
                            </ThemedView>
                            <ThemedText size="sm" color="muted" style={styles.recordMeta}>Doctor  •  {new Date(record.created_at).toLocaleDateString()}</ThemedText>

                            {/* Prescription pills */}
                            {record.prescriptions.length > 0 && (
                                <ThemedView style={styles.rxRow}>
                                    <Feather name="package" size={12} color={colors.textMuted} />
                                    <ThemedText size="xs" color="muted" style={styles.rxText} numberOfLines={1}>
                                        {record.prescriptions.map(p => p.medication_name).join(', ')}
                                    </ThemedText>
                                </ThemedView>
                            )}
                        </ThemedView>

                        <Feather name="chevron-right" size={18} color={colors.textMuted} />
                    </Pressable>
                ))}

                <ThemedView style={{ height: spacing['3xl'] }} />
            </ScrollView>

            <MedicalRecordSheet
                visible={isRecordSheetOpen}
                record={selectedRecord}
                onClose={() => setIsRecordSheetOpen(false)}
                patient={activePatient}
            />
        </SafeAreaView >
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const useStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: radii.full,
        backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
    },

    scrollContent: { paddingHorizontal: spacing.lg },

    // Count
    countRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.lg, marginTop: spacing.sm,
    },
    countText: {
    },

    // Record card
    recordCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radii.md,
        marginBottom: spacing.sm, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.card,
    },
    accentBar: {
        width: 4, alignSelf: 'stretch',
        backgroundColor: colors.primary,
    },
    recordBody: {
        flex: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
    },
    recordTop: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: spacing.xxs,
    },
    recordDiagnosis: {
        flex: 1,
    },
    followUpBadge: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
        backgroundColor: colors.primaryLight, borderRadius: radii.full,
        paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    },
    followUpBadgeText: {
        fontSize: 10,
        color: colors.primary,
    },
    recordMeta: {
        marginBottom: spacing.xs,
    },
    rxRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    },
    rxText: {
        flex: 1,
    },
});
