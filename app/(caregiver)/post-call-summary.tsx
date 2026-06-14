/**
 * CareConnect — Post-Call Summary
 *
 * Shown after hanging up a video consultation.
 * Fetches the AI-generated summary from the API.
 *
 * States:
 *   - Loading: spinner while checking for summary
 *   - Not Ready: "Your summary will be ready shortly" + Return to Dashboard
 *   - Ready: full summary card with bilingual toggle, ratings, download stub
 *
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Pressable,
    ScrollView,
    TextInput,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedView, ThemedText } from '@/components/shared/Themed';
import { useAuth } from '@/hooks/useAuth';
import { getPostCallSummary, type PostCallSummary } from '@/services/caregiver';

const STAR_COLOR = '#F59E0B';    // amber/gold
const STAR_GRAY = '#D1D5DB';

export default function PostCallSummaryScreen() {
    const router = useRouter();
    const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
    const { token } = useAuth();
    const { colors } = useTheme();
    const styles = useStyles(colors);

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<PostCallSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');

    // ── Bilingual toggle ──
    const [showLocal, setShowLocal] = useState(false);

    // ── Fetch the summary from the API ──
    const fetchSummary = useCallback(async () => {
        if (!token || !appointmentId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getPostCallSummary(token, appointmentId);
            setSummary(data);
        } catch (e: any) {
            console.error('Failed to fetch summary:', e);
            setError(e?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [token, appointmentId]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // ── Parse the bilingual summary JSON ──
    const bilingualData = (() => {
        if (!summary?.summary) return null;
        try {
            return JSON.parse(summary.summary);
        } catch {
            return null;
        }
    })();

    // Helper: extract English or local-language value from bilingual fields
    const getBilingualField = (fieldPath: string, fallback: string | null) => {
        if (!bilingualData) return fallback;
        const field = fieldPath.split('.').reduce((obj: any, key) => obj?.[key], bilingualData);
        if (!field) return fallback;
        if (typeof field === 'string') return field;
        return showLocal ? (field.local_language || field.english || fallback) : (field.english || fallback);
    };

    const getBilingualArray = (fieldPath: string, fallback: string[] | null) => {
        if (!bilingualData) return fallback;
        const field = fieldPath.split('.').reduce((obj: any, key) => obj?.[key], bilingualData);
        if (!field) return fallback;
        if (Array.isArray(field)) return field;
        return showLocal ? (field.local_language || field.english || fallback) : (field.english || fallback);
    };

    const goHome = () => {
        router.replace('/(caregiver)' as any);
    };

    // ── Loading State ──
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText weight="medium" color="secondary" style={styles.loadingText}>Checking for your summary…</ThemedText>
            </SafeAreaView>
        );
    }

    // ── Summary Not Ready Yet ──
    if (!summary) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ThemedView style={styles.pendingCircle}>
                    <Feather name="clock" size={40} color={colors.primary} />
                </ThemedView>
                <ThemedText weight="bold" size="xl" style={styles.pendingTitle}>Your AI summary will be ready shortly</ThemedText>
                <ThemedText color="secondary" style={styles.pendingSubtitle}>
                    Our AI is analyzing the consultation recording.{'\n'}
                    You'll be able to view it from your dashboard.
                </ThemedText>
                {error && <ThemedText size="sm" style={styles.errorText}>{error}</ThemedText>}
                <Pressable
                    style={({ pressed }) => [styles.returnBtn, pressed && { opacity: 0.85 }]}
                    onPress={goHome}
                >
                    <Feather name="home" size={18} color="#FFFFFF" />
                    <ThemedText weight="semiBold" style={styles.returnBtnText}>Return to Dashboard</ThemedText>
                </Pressable>
            </SafeAreaView>
        );
    }

    // ── Resolved field values (bilingual or fallback to English DB fields) ──
    const diagnosis = getBilingualField('diagnosis', summary.diagnosis);
    const treatmentPlan = getBilingualField('treatment_plan', summary.treatment_plan);
    const followUp = getBilingualField('next_steps', summary.follow_up);
    const symptoms = getBilingualArray('symptoms', summary.symptoms);
    const prescriptions = summary.prescriptions;
    const doctorNotes = summary.doctor_notes;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── 1. Success Banner ── */}
                <ThemedView style={styles.banner}>
                    <ThemedView style={styles.checkCircle}>
                        <Feather name="check" size={36} color="#FFFFFF" />
                    </ThemedView>
                    <ThemedText weight="bold" size="xl" style={styles.bannerTitle}>Consultation Complete</ThemedText>
                    <ThemedText color="secondary" style={styles.bannerSubtitle}>AI-powered summary generated</ThemedText>
                </ThemedView>

                {/* ── Bilingual Toggle ── */}
                {bilingualData && (
                    <ThemedView style={styles.toggleRow}>
                        <Pressable
                            style={[styles.toggleBtn, !showLocal && styles.toggleBtnActive]}
                            onPress={() => setShowLocal(false)}
                        >
                            <ThemedText weight="medium" size="sm" color="secondary" style={[styles.toggleBtnText, !showLocal && styles.toggleBtnTextActive]}>English</ThemedText>
                        </Pressable>
                        <Pressable
                            style={[styles.toggleBtn, showLocal && styles.toggleBtnActive]}
                            onPress={() => setShowLocal(true)}
                        >
                            <ThemedText weight="medium" size="sm" color="secondary" style={[styles.toggleBtnText, showLocal && styles.toggleBtnTextActive]}>हिंदी</ThemedText>
                        </Pressable>
                    </ThemedView>
                )}

                {/* ── 2. Rate Your Experience ── */}
                <ThemedView style={styles.card}>
                    <ThemedText weight="semiBold" size="lg" style={styles.cardTitle}>Rate your experience</ThemedText>

                    <ThemedView style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Pressable key={i} onPress={() => setRating(i)} style={styles.starBtn}>
                                <Feather
                                    name="star"
                                    size={32}
                                    color={i <= rating ? STAR_COLOR : STAR_GRAY}
                                />
                            </Pressable>
                        ))}
                    </ThemedView>

                    <TextInput
                        style={styles.feedbackInput}
                        multiline
                        placeholder="Share your feedback (optional)…"
                        placeholderTextColor={colors.textMuted}
                        value={feedback}
                        onChangeText={setFeedback}
                        textAlignVertical="top"
                    />
                </ThemedView>

                {/* ── 3. Consultation Summary ── */}
                <ThemedView style={styles.card}>
                    <ThemedText weight="semiBold" size="lg" style={styles.cardTitle}>Consultation Summary</ThemedText>

                    {/* Diagnosis */}
                    {diagnosis && (
                        <ThemedView style={styles.detailSection}>
                            <ThemedView style={styles.detailHeader}>
                                <Feather name="activity" size={16} color={colors.primary} />
                                <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.detailLabel}>Diagnosis</ThemedText>
                            </ThemedView>
                            <ThemedText size="base" style={styles.detailValue}>{diagnosis}</ThemedText>
                        </ThemedView>
                    )}

                    {/* Symptoms */}
                    {symptoms && symptoms.length > 0 && (
                        <ThemedView style={styles.detailSection}>
                            <ThemedView style={styles.detailHeader}>
                                <Feather name="list" size={16} color={colors.primary} />
                                <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.detailLabel}>Symptoms</ThemedText>
                            </ThemedView>
                            {symptoms.map((s: string, i: number) => (
                                <ThemedView key={i} style={styles.bulletRow}>
                                    <ThemedView style={styles.bullet} />
                                    <ThemedText size="base" style={styles.bulletText}>{s}</ThemedText>
                                </ThemedView>
                            ))}
                        </ThemedView>
                    )}

                    {/* Treatment Plan */}
                    {treatmentPlan && (
                        <ThemedView style={styles.detailSection}>
                            <ThemedView style={styles.detailHeader}>
                                <Feather name="clipboard" size={16} color={colors.primary} />
                                <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.detailLabel}>Treatment Plan</ThemedText>
                            </ThemedView>
                            <ThemedText size="base" style={styles.detailValue}>{treatmentPlan}</ThemedText>
                        </ThemedView>
                    )}

                    {/* Prescriptions */}
                    {prescriptions && prescriptions.length > 0 && (
                        <ThemedView style={styles.detailSection}>
                            <ThemedView style={styles.detailHeader}>
                                <Feather name="package" size={16} color={colors.primary} />
                                <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.detailLabel}>Prescriptions</ThemedText>
                            </ThemedView>
                            {prescriptions.map((p: string, i: number) => (
                                <ThemedView key={i} style={styles.bulletRow}>
                                    <ThemedView style={styles.bullet} />
                                    <ThemedText size="base" style={styles.bulletText}>{p}</ThemedText>
                                </ThemedView>
                            ))}
                        </ThemedView>
                    )}

                    {/* Follow-Up */}
                    {followUp && (
                        <ThemedView style={styles.followUpBox}>
                            <ThemedView style={styles.detailHeader}>
                                <Feather name="calendar" size={16} color={colors.primary} />
                                <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.detailLabel}>Follow-Up</ThemedText>
                            </ThemedView>
                            <ThemedText weight="medium" size="base" style={styles.followUpValue}>{followUp}</ThemedText>
                        </ThemedView>
                    )}

                    {/* Doctor's Notes */}
                    {doctorNotes && (
                        <ThemedView style={styles.detailSection}>
                            <ThemedView style={styles.detailHeader}>
                                <Feather name="file-text" size={16} color={colors.primary} />
                                <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.detailLabel}>Doctor's Notes</ThemedText>
                            </ThemedView>
                            <ThemedText size="base" style={styles.detailValue}>{doctorNotes}</ThemedText>
                        </ThemedView>
                    )}

                    {/* Download PDF */}
                    <Pressable
                        style={({ pressed }) => [styles.downloadBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => console.log('Downloading...')}
                    >
                        <Feather name="download" size={18} color={colors.primary} />
                        <ThemedText weight="semiBold" size="base" style={styles.downloadBtnText}>Download PDF</ThemedText>
                    </Pressable>
                </ThemedView>

                {/* Bottom spacer for sticky buttons */}
                <ThemedView style={{ height: 100 }} />
            </ScrollView>

            {/* ── 4. Sticky Bottom Actions ── */}
            <ThemedView style={styles.bottomBar}>
                <Pressable
                    style={({ pressed }) => [
                        styles.submitBtn,
                        rating === 0 && styles.submitBtnDisabled,
                        pressed && rating > 0 && { opacity: 0.85 },
                    ]}
                    disabled={rating === 0}
                    onPress={goHome}
                >
                    <ThemedText weight="semiBold" size="base" style={[styles.submitBtnText, rating === 0 && styles.submitBtnTextDisabled]}>
                        Submit & Return to Dashboard
                    </ThemedText>
                </Pressable>

                <Pressable
                    style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
                    onPress={goHome}
                >
                    <ThemedText weight="medium" size="sm" color="muted" style={styles.skipBtnText}>Skip Feedback</ThemedText>
                </Pressable>
            </ThemedView>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const useStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },

    // ── Loading ──
    loadingText: {
        marginTop: spacing.lg,
    },

    // ── Pending (not ready) ──
    pendingCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    pendingTitle: {
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    pendingSubtitle: {
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    errorText: {
        color: '#EF4444',
        marginBottom: spacing.md,
    },
    returnBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
    },
    returnBtnText: {
        color: '#FFFFFF',
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
        marginBottom: spacing.xs,
    },
    bannerSubtitle: {
    },

    // ── Bilingual Toggle ──
    toggleRow: {
        flexDirection: 'row',
        alignSelf: 'center',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.md,
        padding: 3,
        marginBottom: spacing.lg,
    },
    toggleBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.sm,
    },
    toggleBtnActive: {
        backgroundColor: colors.primary,
    },
    toggleBtnText: {
    },
    toggleBtnTextActive: {
        color: '#FFFFFF',
    },

    // ── Card ──
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.elevated,
    },
    cardTitle: {
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
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.md,
        minHeight: 80,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.borderLight,
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
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
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
        backgroundColor: colors.primary,
        marginTop: 8,
    },
    bulletText: {
        flex: 1,
        lineHeight: 22,
    },

    // ── Follow-up (highlighted) ──
    followUpBox: {
        backgroundColor: colors.primaryLight,
        borderRadius: radii.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    followUpValue: {
        color: colors.primaryDark,
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
        borderColor: colors.primary,
        backgroundColor: 'transparent',
        marginTop: spacing.sm,
    },
    downloadBtnText: {
        color: colors.primary,
    },

    // ── Bottom bar ──
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing['2xl'],
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        gap: spacing.sm,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: colors.border,
    },
    submitBtnText: {
        color: '#FFFFFF',
    },
    submitBtnTextDisabled: {
        color: colors.textMuted,
    },
    skipBtn: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    skipBtnText: {
    },
});
