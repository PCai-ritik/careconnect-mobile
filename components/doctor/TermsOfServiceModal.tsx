/**
 * CareConnect — Terms of Service Modal (Doctor)
 *
 * 85%-height Bottom Sheet displaying legal terms text
 * with an "I Understand" dismiss button.
 * Fully multi-tenant via useTheme().
 */

import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { spacing, radii, typography } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

interface TermsOfServiceModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function TermsOfServiceModal({ visible, onClose }: TermsOfServiceModalProps) {
    const { colors } = useTheme();

    return (
        <ThemedBottomSheet visible={visible} onClose={onClose}>
            {/* Header */}
            <View style={s.header}>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Terms of Service</Text>
            </View>

            <ScrollView
                style={s.scrollArea}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollInner}
            >
                <Text style={[s.lastUpdated, { color: colors.textMuted }]}>Last updated: March 15, 2026</Text>

                <Text style={[s.sectionHeading, { color: colors.textPrimary }]}>1. Acceptance of Terms</Text>
                <Text style={[s.body, { color: colors.textSecondary }]}>
                    By accessing and using the CareConnect platform, you agree to be
                    bound by these Terms of Service and all applicable laws and
                    regulations. If you do not agree with any of these terms, you are
                    prohibited from using or accessing this platform.
                </Text>

                <Text style={[s.sectionHeading, { color: colors.textPrimary }]}>2. Medical Professional Eligibility</Text>
                <Text style={[s.body, { color: colors.textSecondary }]}>
                    To register as a healthcare provider on CareConnect, you must hold
                    a valid medical license issued by an accredited medical authority.
                    You are responsible for ensuring your registration number and
                    credentials remain current and valid at all times.
                </Text>

                <Text style={[s.sectionHeading, { color: colors.textPrimary }]}>3. Patient Data & Privacy</Text>
                <Text style={[s.body, { color: colors.textSecondary }]}>
                    All patient data transmitted through CareConnect is end-to-end
                    encrypted and stored in compliance with HIPAA, GDPR, and local
                    healthcare privacy regulations. You agree not to share, export, or
                    store patient information outside approved channels.
                </Text>

                <Text style={[s.sectionHeading, { color: colors.textPrimary }]}>4. Consultation & Liability</Text>
                <Text style={[s.body, { color: colors.textSecondary }]}>
                    CareConnect serves as a technology platform connecting healthcare
                    providers with patients. The medical advice and treatment decisions
                    remain solely the responsibility of the licensed practitioner.
                    CareConnect shall not be held liable for clinical outcomes.
                </Text>

                <Text style={[s.sectionHeading, { color: colors.textPrimary }]}>5. Payment & Payouts</Text>
                <Text style={[s.body, { color: colors.textSecondary }]}>
                    Consultation fees are processed through our secure payment
                    infrastructure. Payouts to healthcare providers are initiated
                    within 24 hours of a completed consultation. CareConnect retains a
                    platform service fee as outlined in your provider agreement.
                </Text>

                <Text style={[s.sectionHeading, { color: colors.textPrimary }]}>6. Termination</Text>
                <Text style={[s.body, { color: colors.textSecondary }]}>
                    CareConnect reserves the right to suspend or terminate your account
                    if these terms are violated, if fraudulent activity is detected, or
                    if your medical credentials are revoked. You may terminate your
                    account at any time through the Profile settings.
                </Text>
            </ScrollView>

            {/* Footer */}
            <View style={[s.footer, { borderTopColor: colors.borderLight }]}>
                <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [
                        s.understandBtn,
                        { backgroundColor: colors.primary },
                        pressed && { backgroundColor: colors.primaryDark },
                    ]}
                >
                    <Text style={[s.understandBtnText, { color: colors.surface }]}>I Understand</Text>
                </Pressable>
            </View>
        </ThemedBottomSheet>
    );
}

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
    },

    scrollArea: { flex: 1 },
    scrollInner: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

    lastUpdated: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        marginBottom: spacing.xl,
    },
    sectionHeading: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    body: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        lineHeight: 22,
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
    },
    understandBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
    },
    understandBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
    },
});
