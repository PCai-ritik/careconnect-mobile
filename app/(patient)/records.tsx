/**
 * CareConnect — Medical Records List
 *
 * Full list of patient medical records. Reuses the sleek card
 * styling from the dashboard's "Recent Records" section.
 *
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    patientColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import { mockMedicalRecords } from '@/services/mock-data';
import type { MockMedicalRecord } from '@/services/mock-data';
import MedicalRecordSheet from '@/components/MedicalRecordSheet';

export default function RecordsScreen() {
    const router = useRouter();
    const [selectedRecord, setSelectedRecord] = useState<MockMedicalRecord | null>(null);
    const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Pressable
                    style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => router.back()}
                >
                    <Feather name="chevron-left" size={22} color={patientColors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Medical Records</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Summary */}
                <View style={styles.countRow}>
                    <Feather name="folder" size={16} color={patientColors.primary} />
                    <Text style={styles.countText}>{mockMedicalRecords.length} records on file</Text>
                </View>

                {/* Records list */}
                {mockMedicalRecords.map((record) => (
                    <Pressable
                        key={record.id}
                        style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.85 }]}
                        onPress={() => { setSelectedRecord(record); setIsRecordSheetOpen(true); }}
                    >
                        {/* Left accent bar */}
                        <View style={styles.accentBar} />

                        <View style={styles.recordBody}>
                            <View style={styles.recordTop}>
                                <Text style={styles.recordDiagnosis}>{record.diagnosis}</Text>
                                {record.followUp && (
                                    <View style={styles.followUpBadge}>
                                        <Feather name="calendar" size={10} color={patientColors.primary} />
                                        <Text style={styles.followUpBadgeText}>Follow-up</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.recordMeta}>{record.doctorName}  •  {record.date}</Text>

                            {/* Prescription pills */}
                            {record.prescriptions.length > 0 && (
                                <View style={styles.rxRow}>
                                    <Feather name="package" size={12} color={patientColors.textMuted} />
                                    <Text style={styles.rxText} numberOfLines={1}>
                                        {record.prescriptions.join(', ')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Feather name="chevron-right" size={18} color={patientColors.textMuted} />
                    </Pressable>
                ))}

                <View style={{ height: spacing['3xl'] }} />
            </ScrollView>

            <MedicalRecordSheet
                visible={isRecordSheetOpen}
                record={selectedRecord}
                onClose={() => setIsRecordSheetOpen(false)}
            />
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: patientColors.background },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: radii.full,
        backgroundColor: patientColors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.lg,
        color: patientColors.textPrimary,
    },

    scrollContent: { paddingHorizontal: spacing.lg },

    // Count
    countRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.lg, marginTop: spacing.sm,
    },
    countText: {
        fontFamily: typography.fontFamily.medium, ...typography.size.sm,
        color: patientColors.textSecondary,
    },

    // Record card
    recordCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: patientColors.surface, borderRadius: radii.md,
        marginBottom: spacing.sm, overflow: 'hidden',
        borderWidth: 1, borderColor: patientColors.borderLight,
        ...shadows.card,
    },
    accentBar: {
        width: 4, alignSelf: 'stretch',
        backgroundColor: patientColors.primary,
    },
    recordBody: {
        flex: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
    },
    recordTop: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: spacing.xxs,
    },
    recordDiagnosis: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base,
        color: patientColors.textPrimary, flex: 1,
    },
    followUpBadge: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
        backgroundColor: patientColors.primaryLight, borderRadius: radii.full,
        paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    },
    followUpBadgeText: {
        fontFamily: typography.fontFamily.medium, fontSize: 10,
        color: patientColors.primary,
    },
    recordMeta: {
        fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: patientColors.textMuted, marginBottom: spacing.xs,
    },
    rxRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    },
    rxText: {
        fontFamily: typography.fontFamily.regular, ...typography.size.xs,
        color: patientColors.textMuted, flex: 1,
    },
});
