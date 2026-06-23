/**
 * CareConnect — Privacy & Security Modal (Doctor)
 *
 * 85%-height Bottom Sheet with toggle switches for biometric
 * login and 2FA, plus a compliance note.
 * Fully multi-tenant via useTheme().
 */

import { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Switch,
    StyleSheet,
} from 'react-native';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { Feather } from '@expo/vector-icons';
import { spacing, shadows, radii, typography } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

interface PrivacySecurityModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function PrivacySecurityModal({ visible, onClose }: PrivacySecurityModalProps) {
    const { colors } = useTheme();
    const [biometric, setBiometric] = useState(true);
    const [twoFactor, setTwoFactor] = useState(false);

    return (
        <ThemedBottomSheet visible={visible} onClose={onClose}>
            {/* Header */}
            <View style={s.header}>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Privacy & Security</Text>
            </View>

            <ScrollView
                style={s.scrollArea}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollInner}
            >
                {/* Settings card */}
                <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                    {/* Biometric */}
                    <View style={[s.row, s.rowBorder, { borderBottomColor: colors.borderLight }]}>
                        <View style={[s.rowIcon, { backgroundColor: colors.surfaceMuted }]}>
                            <Feather name="smartphone" size={18} color={colors.primary} />
                        </View>
                        <View style={s.rowInfo}>
                            <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Biometric Login</Text>
                            <Text style={[s.rowSub, { color: colors.textMuted }]}>Use fingerprint or face ID</Text>
                        </View>
                        <Switch
                            value={biometric}
                            onValueChange={setBiometric}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>

                    {/* 2FA */}
                    <View style={s.row}>
                        <View style={[s.rowIcon, { backgroundColor: colors.surfaceMuted }]}>
                            <Feather name="shield" size={18} color={colors.primary} />
                        </View>
                        <View style={s.rowInfo}>
                            <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Two-Factor Authentication</Text>
                            <Text style={[s.rowSub, { color: colors.textMuted }]}>Extra layer via SMS or app</Text>
                        </View>
                        <Switch
                            value={twoFactor}
                            onValueChange={setTwoFactor}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>
                </View>

                {/* Compliance note */}
                <View style={[s.complianceBox, { backgroundColor: colors.surfaceMuted }]}>
                    <Feather name="lock" size={16} color={colors.primary} />
                    <Text style={[s.complianceText, { color: colors.textMuted }]}>
                        All patient data is end-to-end encrypted and our platform
                        is fully HIPAA compliant. Your patients' information is
                        always safe and secure.
                    </Text>
                </View>
            </ScrollView>
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

    card: {
        borderWidth: 1,
        borderRadius: radii.lg,
        overflow: 'hidden',
        ...shadows.card,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    rowBorder: {
        borderBottomWidth: 1,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowInfo: { flex: 1, gap: spacing.xxs },
    rowLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
    },
    rowSub: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
    },

    complianceBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginTop: spacing['3xl'],
        padding: spacing.lg,
        borderRadius: radii.md,
    },
    complianceText: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        lineHeight: 20,
    },
});
