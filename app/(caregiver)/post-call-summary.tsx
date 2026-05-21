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
    View,
    Text,
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
    patientColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getPostCallSummary, type PostCallSummary } from '@/services/caregiver';

const STAR_COLOR = '#F59E0B';    // amber/gold
const STAR_GRAY = '#D1D5DB';

export default function PostCallSummaryScreen() {
    const router = useRouter();
    const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
    const { token } = useAuth();

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
                <ActivityIndicator size="large" color={patientColors.primary} />
                <Text style={styles.loadingText}>Checking for your summary…</Text>
            </SafeAreaView>
        );
    }

    // ── Summary Not Ready Yet ──
    if (!summary) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <View style={styles.pendingCircle}>
                    <Feather name="clock" size={40} color={patientColors.primary} />
                </View>
                <Text style={styles.pendingTitle}>Your AI summary will be ready shortly</Text>
                <Text style={styles.pendingSubtitle}>
                    Our AI is analyzing the consultation recording.{'\n'}
                    You'll be able to view it from your dashboard.
                </Text>
                {error && <Text style={styles.errorText}>{error}</Text>}
                <Pressable
                    style={({ pressed }) => [styles.returnBtn, pressed && { opacity: 0.85 }]}
                    onPress={goHome}
                >
                    <Feather name="home" size={18} color="#FFFFFF" />
                    <Text style={styles.returnBtnText}>Return to Dashboard</Text>
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
                <View style={styles.banner}>
                    <View style={styles.checkCircle}>
                        <Feather name="check" size={36} color="#FFFFFF" />
                    </View>
                    <Text style={styles.bannerTitle}>Consultation Complete</Text>
                    <Text style={styles.bannerSubtitle}>AI-powered summary generated</Text>
                </View>

                {/* ── Bilingual Toggle ── */}
                {bilingualData && (
                    <View style={styles.toggleRow}>
                        <Pressable
                            style={[styles.toggleBtn, !showLocal && styles.toggleBtnActive]}
                            onPress={() => setShowLocal(false)}
                        >
                            <Text style={[styles.toggleBtnText, !showLocal && styles.toggleBtnTextActive]}>English</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.toggleBtn, showLocal && styles.toggleBtnActive]}
                            onPress={() => setShowLocal(true)}
                        >
                            <Text style={[styles.toggleBtnText, showLocal && styles.toggleBtnTextActive]}>हिंदी</Text>
                        </Pressable>
                    </View>
                )}

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
                    {diagnosis && (
                        <View style={styles.detailSection}>
                            <View style={styles.detailHeader}>
                                <Feather name="activity" size={16} color={patientColors.primary} />
                                <Text style={styles.detailLabel}>Diagnosis</Text>
                            </View>
                            <Text style={styles.detailValue}>{diagnosis}</Text>
                        </View>
                    )}

                    {/* Symptoms */}
                    {symptoms && symptoms.length > 0 && (
                        <View style={styles.detailSection}>
                            <View style={styles.detailHeader}>
                                <Feather name="list" size={16} color={patientColors.primary} />
                                <Text style={styles.detailLabel}>Symptoms</Text>
                            </View>
                            {symptoms.map((s: string, i: number) => (
                                <View key={i} style={styles.bulletRow}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.bulletText}>{s}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Treatment Plan */}
                    {treatmentPlan && (
                        <View style={styles.detailSection}>
                            <View style={styles.detailHeader}>
                                <Feather name="clipboard" size={16} color={patientColors.primary} />
                                <Text style={styles.detailLabel}>Treatment Plan</Text>
                            </View>
                            <Text style={styles.detailValue}>{treatmentPlan}</Text>
                        </View>
                    )}

                    {/* Prescriptions */}
                    {prescriptions && prescriptions.length > 0 && (
                        <View style={styles.detailSection}>
                            <View style={styles.detailHeader}>
                                <Feather name="package" size={16} color={patientColors.primary} />
                                <Text style={styles.detailLabel}>Prescriptions</Text>
                            </View>
                            {prescriptions.map((p: string, i: number) => (
                                <View key={i} style={styles.bulletRow}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.bulletText}>{p}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Follow-Up */}
                    {followUp && (
                        <View style={styles.followUpBox}>
                            <View style={styles.detailHeader}>
                                <Feather name="calendar" size={16} color={patientColors.primary} />
                                <Text style={styles.detailLabel}>Follow-Up</Text>
                            </View>
                            <Text style={styles.followUpValue}>{followUp}</Text>
                        </View>
                    )}

                    {/* Doctor's Notes */}
                    {doctorNotes && (
                        <View style={styles.detailSection}>
                            <View style={styles.detailHeader}>
                                <Feather name="file-text" size={16} color={patientColors.primary} />
                                <Text style={styles.detailLabel}>Doctor's Notes</Text>
                            </View>
                            <Text style={styles.detailValue}>{doctorNotes}</Text>
                        </View>
                    )}

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
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: patientColors.textSecondary,
        marginTop: spacing.lg,
    },

    // ── Pending (not ready) ──
    pendingCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: patientColors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    pendingTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: patientColors.textPrimary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    pendingSubtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: patientColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    errorText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: '#EF4444',
        marginBottom: spacing.md,
    },
    returnBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: patientColors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
    },
    returnBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
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

    // ── Bilingual Toggle ──
    toggleRow: {
        flexDirection: 'row',
        alignSelf: 'center',
        backgroundColor: patientColors.surfaceMuted,
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
        backgroundColor: patientColors.primary,
    },
    toggleBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: patientColors.textSecondary,
    },
    toggleBtnTextActive: {
        color: '#FFFFFF',
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
