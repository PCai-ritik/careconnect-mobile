/**
 * CareConnect — Post-Call Summary
 *
 * Shown immediately after hanging up a video consultation.
 * Vertical mobile layout:
 *   1. Success banner (check circle + "Consultation Complete")
 *   2. Rate Your Experience card (interactive 5-star + feedback textarea)
 *   3. Medical Record Details card (diagnosis, symptoms, Rx, follow-up)
 *   4. Sticky bottom actions (Submit / Skip)
 *
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
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
import { mockPostCallSummary } from '@/services/mock-data';

const STAR_COLOR = '#F59E0B';    // amber/gold
const STAR_GRAY = '#D1D5DB';

export default function PostCallSummaryScreen() {
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const data = mockPostCallSummary;

    const goHome = () => {
        router.replace('/(patient)' as any);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── 1. Success Banner ── */}
                <View style={styles.banner}>
                    <View style={styles.checkCircle}>
                        <Feather name="check" size={36} color="#FFFFFF" />
                    </View>
                    <Text style={styles.bannerTitle}>Consultation Complete</Text>
                    <Text style={styles.bannerSubtitle}>with {data.doctorName}</Text>
                </View>

                {/* ── 2. Rate Your Experience ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Rate your experience</Text>

                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Pressable key={i} onPress={() => setRating(i)} style={styles.starBtn}>
                                <Feather
                                    name="star"
                                    size={32}
                                    color={i <= rating ? STAR_COLOR : STAR_GRAY}
                                />
                            </Pressable>
                        ))}
                    </View>

                    <TextInput
                        style={styles.feedbackInput}
                        multiline
                        placeholder="Share your feedback (optional)…"
                        placeholderTextColor={patientColors.textMuted}
                        value={feedback}
                        onChangeText={setFeedback}
                        textAlignVertical="top"
                    />
                </View>

                {/* ── 3. Consultation Summary ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Consultation Summary</Text>

                    {/* Diagnosis */}
                    <View style={styles.detailSection}>
                        <View style={styles.detailHeader}>
                            <Feather name="activity" size={16} color={patientColors.primary} />
                            <Text style={styles.detailLabel}>Diagnosis</Text>
                        </View>
                        <Text style={styles.detailValue}>{data.diagnosis}</Text>
                    </View>

                    {/* Symptoms */}
                    <View style={styles.detailSection}>
                        <View style={styles.detailHeader}>
                            <Feather name="list" size={16} color={patientColors.primary} />
                            <Text style={styles.detailLabel}>Symptoms</Text>
                        </View>
                        {data.symptoms.map((s, i) => (
                            <View key={i} style={styles.bulletRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.bulletText}>{s}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Treatment Plan */}
                    <View style={styles.detailSection}>
                        <View style={styles.detailHeader}>
                            <Feather name="clipboard" size={16} color={patientColors.primary} />
                            <Text style={styles.detailLabel}>Treatment Plan</Text>
                        </View>
                        <Text style={styles.detailValue}>{data.treatmentPlan}</Text>
                    </View>

                    {/* Prescriptions */}
                    <View style={styles.detailSection}>
                        <View style={styles.detailHeader}>
                            <Feather name="package" size={16} color={patientColors.primary} />
                            <Text style={styles.detailLabel}>Prescriptions</Text>
                        </View>
                        {data.prescriptions.map((p, i) => (
                            <View key={i} style={styles.bulletRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.bulletText}>{p}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Follow-Up */}
                    <View style={styles.followUpBox}>
                        <View style={styles.detailHeader}>
                            <Feather name="calendar" size={16} color={patientColors.primary} />
                            <Text style={styles.detailLabel}>Follow-Up</Text>
                        </View>
                        <Text style={styles.followUpValue}>{data.followUp}</Text>
                    </View>

                    {/* Doctor's Notes */}
                    <View style={styles.detailSection}>
                        <View style={styles.detailHeader}>
                            <Feather name="file-text" size={16} color={patientColors.primary} />
                            <Text style={styles.detailLabel}>Doctor's Notes</Text>
                        </View>
                        <Text style={styles.detailValue}>{data.doctorNotes}</Text>
                    </View>

                    {/* Download PDF */}
                    <Pressable
                        style={({ pressed }) => [styles.downloadBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => console.log('Downloading...')}
                    >
                        <Feather name="download" size={18} color={patientColors.primary} />
                        <Text style={styles.downloadBtnText}>Download PDF</Text>
                    </Pressable>
                </View>

                {/* Bottom spacer for sticky buttons */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── 4. Sticky Bottom Actions ── */}
            <View style={styles.bottomBar}>
                <Pressable
                    style={({ pressed }) => [
                        styles.submitBtn,
                        rating === 0 && styles.submitBtnDisabled,
                        pressed && rating > 0 && { opacity: 0.85 },
                    ]}
                    disabled={rating === 0}
                    onPress={goHome}
                >
                    <Text style={[styles.submitBtnText, rating === 0 && styles.submitBtnTextDisabled]}>
                        Submit & Return to Dashboard
                    </Text>
                </Pressable>

                <Pressable
                    style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
                    onPress={goHome}
                >
                    <Text style={styles.skipBtnText}>Skip Feedback</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: patientColors.background,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },

    // ── Banner ──
    banner: {
        alignItems: 'center',
        marginBottom: spacing['2xl'],
    },
    checkCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    bannerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: patientColors.textPrimary,
        marginBottom: spacing.xs,
    },
    bannerSubtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: patientColors.textSecondary,
    },

    // ── Card ──
    card: {
        backgroundColor: patientColors.surface,
        borderRadius: radii.lg,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: patientColors.borderLight,
        ...shadows.elevated,
    },
    cardTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.lg,
        color: patientColors.textPrimary,
        marginBottom: spacing.lg,
    },

    // ── Stars ──
    starsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    starBtn: {
        padding: spacing.xs,
    },

    // ── Feedback ──
    feedbackInput: {
        backgroundColor: patientColors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.md,
        minHeight: 80,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: patientColors.textPrimary,
        borderWidth: 1,
        borderColor: patientColors.borderLight,
    },

    // ── Detail sections ──
    detailSection: {
        marginBottom: spacing.lg,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    detailLabel: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: patientColors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: patientColors.textPrimary,
        lineHeight: 22,
    },

    // ── Bullets ──
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.xs,
        paddingLeft: spacing.xs,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: patientColors.primary,
        marginTop: 8,
    },
    bulletText: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: patientColors.textPrimary,
        lineHeight: 22,
    },

    // ── Follow-up (highlighted) ──
    followUpBox: {
        backgroundColor: patientColors.primaryLight,
        borderRadius: radii.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    followUpValue: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: patientColors.primaryDark,
        lineHeight: 22,
    },

    // ── Download button ──
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1.5,
        borderColor: patientColors.primary,
        backgroundColor: 'transparent',
        marginTop: spacing.sm,
    },
    downloadBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: patientColors.primary,
    },

    // ── Bottom bar ──
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: patientColors.surface,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing['2xl'],
        borderTopWidth: 1,
        borderTopColor: patientColors.borderLight,
        gap: spacing.sm,
    },
    submitBtn: {
        backgroundColor: patientColors.primary,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: patientColors.border,
    },
    submitBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
    submitBtnTextDisabled: {
        color: patientColors.textMuted,
    },
    skipBtn: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    skipBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: patientColors.textMuted,
    },
});
