/**
 * CareConnect — Medical Record Bottom Sheet
 *
 * Reusable themed bottom sheet that displays full details
 * for a single medical record. Used on both the dashboard
 * and the dedicated records page.
 *
 * Props: visible, record (MockMedicalRecord | null), onClose
 *
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
 */

import {
    View,
    Text,
    Pressable,
    ScrollView,
    Modal,
    StyleSheet,
    Dimensions,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
    patientColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import type { MockMedicalRecord } from '@/services/mock-data';
import useSwipeDown from '@/hooks/useSwipeDown';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface Props {
    visible: boolean;
    record: MockMedicalRecord | null;
    onClose: () => void;
}

function getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('');
}

export default function MedicalRecordSheet({ visible, record, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            {/* Backdrop */}
            <Pressable style={styles.backdrop} onPress={onClose}>
                <View />
            </Pressable>

            {/* Sheet */}
            <Animated.View style={[styles.sheet, animatedStyle, { paddingBottom: insets.bottom }]}>
                <View style={styles.handleRow} {...panHandlers}>
                    <View style={styles.handleBar} />
                </View>

                {record && (
                    <>

                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Doctor info */}
                            <View style={styles.doctorRow}>
                                <View style={styles.doctorAvatar}>
                                    <Text style={styles.doctorAvatarText}>
                                        {getInitials(record.doctorName)}
                                    </Text>
                                </View>
                                <View style={styles.doctorInfo}>
                                    <Text style={styles.doctorName}>{record.doctorName}</Text>
                                    <Text style={styles.doctorDate}>{record.date}</Text>
                                </View>
                            </View>

                            {/* Diagnosis */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Feather name="activity" size={16} color={patientColors.primary} />
                                    <Text style={styles.sectionLabel}>Diagnosis</Text>
                                </View>
                                <Text style={styles.diagnosisText}>{record.diagnosis}</Text>
                            </View>

                            {/* Symptoms */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Feather name="list" size={16} color={patientColors.primary} />
                                    <Text style={styles.sectionLabel}>Symptoms</Text>
                                </View>
                                {record.symptoms.split(', ').map((s, i) => (
                                    <View key={i} style={styles.bulletRow}>
                                        <View style={styles.bullet} />
                                        <Text style={styles.bulletText}>{s.trim()}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Treatment */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Feather name="clipboard" size={16} color={patientColors.primary} />
                                    <Text style={styles.sectionLabel}>Treatment</Text>
                                </View>
                                <Text style={styles.bodyText}>{record.treatment}</Text>
                            </View>

                            {/* Prescriptions */}
                            {record.prescriptions.length > 0 && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Feather name="package" size={16} color={patientColors.primary} />
                                        <Text style={styles.sectionLabel}>Prescriptions</Text>
                                    </View>
                                    {record.prescriptions.map((p, i) => (
                                        <View key={i} style={styles.bulletRow}>
                                            <View style={styles.bullet} />
                                            <Text style={styles.bulletText}>{p}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Follow-up */}
                            {record.followUp && (
                                <View style={styles.followUpBox}>
                                    <View style={styles.sectionHeader}>
                                        <Feather name="calendar" size={16} color={patientColors.primary} />
                                        <Text style={styles.sectionLabel}>Follow-Up</Text>
                                    </View>
                                    <Text style={styles.followUpText}>{record.followUp}</Text>
                                </View>
                            )}

                            {/* Download */}
                            <Pressable
                                style={({ pressed }) => [styles.downloadBtn, pressed && { opacity: 0.8 }]}
                                onPress={() => console.log('Downloading record:', record.id)}
                            >
                                <Feather name="download" size={18} color={patientColors.primary} />
                                <Text style={styles.downloadText}>Download PDF</Text>
                            </Pressable>

                            <View style={{ height: spacing['3xl'] }} />
                        </ScrollView>
                    </>
                )}
            </Animated.View>
        </Modal>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT, backgroundColor: patientColors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        ...shadows.elevated,
    },
    handleBar: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: patientColors.border, alignSelf: 'center',
    },
    handleRow: {
        alignItems: 'center', paddingVertical: spacing.sm,
    },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.lg,
        color: patientColors.textPrimary,
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: radii.full,
        backgroundColor: patientColors.surfaceMuted,
        alignItems: 'center', justifyContent: 'center',
    },

    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

    // Doctor
    doctorRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        marginBottom: spacing.xl, backgroundColor: patientColors.surfaceMuted,
        borderRadius: radii.md, padding: spacing.md,
    },
    doctorAvatar: {
        width: 44, height: 44, borderRadius: radii.full,
        backgroundColor: patientColors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
    },
    doctorAvatarText: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.sm,
        color: patientColors.primary,
    },
    doctorInfo: { flex: 1 },
    doctorName: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base,
        color: patientColors.textPrimary,
    },
    doctorDate: {
        fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: patientColors.textMuted,
    },

    // Sections
    section: { marginBottom: spacing.lg },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    sectionLabel: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.sm,
        color: patientColors.textSecondary, textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    diagnosisText: {
        fontFamily: typography.fontFamily.bold, ...typography.size.lg,
        color: patientColors.textPrimary, lineHeight: 26,
    },
    bodyText: {
        fontFamily: typography.fontFamily.regular, ...typography.size.base,
        color: patientColors.textPrimary, lineHeight: 22,
    },
    bulletRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        gap: spacing.sm, marginBottom: spacing.xs, paddingLeft: spacing.xs,
    },
    bullet: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: patientColors.primary, marginTop: 8,
    },
    bulletText: {
        flex: 1, fontFamily: typography.fontFamily.regular,
        ...typography.size.base, color: patientColors.textPrimary, lineHeight: 22,
    },

    // Follow-up
    followUpBox: {
        backgroundColor: patientColors.primaryLight, borderRadius: radii.md,
        padding: spacing.md, marginBottom: spacing.lg,
    },
    followUpText: {
        fontFamily: typography.fontFamily.medium, ...typography.size.base,
        color: patientColors.primaryDark, lineHeight: 22,
    },

    // Download
    downloadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radii.md,
        borderWidth: 1.5, borderColor: patientColors.primary,
    },
    downloadText: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base,
        color: patientColors.primary,
    },
});
