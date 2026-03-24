/**
 * CareConnect — Terms of Service Modal (Doctor)
 *
 * 85%-height Bottom Sheet displaying mock legal terms text
 * with an "I Understand" dismiss button.
 * Uses doctorColors + StyleSheet.create().
 */

import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Dimensions,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSwipeDown from '@/hooks/useSwipeDown';
import { Feather } from '@expo/vector-icons';
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TermsOfServiceModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function TermsOfServiceModal({ visible, onClose }: TermsOfServiceModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable style={s.backdrop} onPress={onClose} />

            <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom }]}>
                <View style={s.handleRow} {...panHandlers}>
                    <View style={s.handle} />
                </View>

                {/* Header */}
                <View style={s.header}>
                    <Text style={s.headerTitle}>Terms of Service</Text>
                </View>

                <ScrollView
                    style={s.scrollArea}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollInner}
                >
                    <Text style={s.lastUpdated}>Last updated: March 15, 2026</Text>

                    <Text style={s.sectionHeading}>1. Acceptance of Terms</Text>
                    <Text style={s.body}>
                        By accessing and using the CareConnect platform, you agree to be
                        bound by these Terms of Service and all applicable laws and
                        regulations. If you do not agree with any of these terms, you are
                        prohibited from using or accessing this platform.
                    </Text>

                    <Text style={s.sectionHeading}>2. Medical Professional Eligibility</Text>
                    <Text style={s.body}>
                        To register as a healthcare provider on CareConnect, you must hold
                        a valid medical license issued by an accredited medical authority.
                        You are responsible for ensuring your registration number and
                        credentials remain current and valid at all times.
                    </Text>

                    <Text style={s.sectionHeading}>3. Patient Data & Privacy</Text>
                    <Text style={s.body}>
                        All patient data transmitted through CareConnect is end-to-end
                        encrypted and stored in compliance with HIPAA, GDPR, and local
                        healthcare privacy regulations. You agree not to share, export, or
                        store patient information outside approved channels.
                    </Text>

                    <Text style={s.sectionHeading}>4. Consultation & Liability</Text>
                    <Text style={s.body}>
                        CareConnect serves as a technology platform connecting healthcare
                        providers with patients. The medical advice and treatment decisions
                        remain solely the responsibility of the licensed practitioner.
                        CareConnect shall not be held liable for clinical outcomes.
                    </Text>

                    <Text style={s.sectionHeading}>5. Payment & Payouts</Text>
                    <Text style={s.body}>
                        Consultation fees are processed through our secure payment
                        infrastructure. Payouts to healthcare providers are initiated
                        within 24 hours of a completed consultation. CareConnect retains a
                        platform service fee as outlined in your provider agreement.
                    </Text>

                    <Text style={s.sectionHeading}>6. Termination</Text>
                    <Text style={s.body}>
                        CareConnect reserves the right to suspend or terminate your account
                        if these terms are violated, if fraudulent activity is detected, or
                        if your medical credentials are revoked. You may terminate your
                        account at any time through the Profile settings.
                    </Text>
                </ScrollView>

                {/* Footer */}
                <View style={s.footer}>
                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            s.understandBtn,
                            pressed && { backgroundColor: doctorColors.primaryDark },
                        ]}
                    >
                        <Text style={s.understandBtnText}>I Understand</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.85,
        backgroundColor: doctorColors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },
    handleRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: doctorColors.border },
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
        color: doctorColors.textPrimary,
    },

    scrollArea: { flex: 1 },
    scrollInner: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

    lastUpdated: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
        marginBottom: spacing.xl,
    },
    sectionHeading: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    body: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
        lineHeight: 22,
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    understandBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    understandBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});
