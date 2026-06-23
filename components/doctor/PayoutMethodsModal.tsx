/**
 * CareConnect — Payout Methods Modal (Doctor)
 *
 * 85%-height Bottom Sheet showing saved bank accounts, payment history,
 * accepted payment methods toggles, and Add New Account button.
 * Fully multi-tenant via useTheme().
 */

import { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { Feather } from '@expo/vector-icons';
import { spacing, shadows, radii, typography } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import AddBankAccountModal from '@/components/doctor/AddBankAccountModal';

interface PayoutMethodsModalProps {
    visible: boolean;
    onClose: () => void;
}

const savedAccounts = [
    {
        id: 1,
        bank: 'First National Bank',
        last4: '4092',
        type: 'Savings',
        icon: 'credit-card' as const,
    },
    {
        id: 2,
        bank: 'Metro Credit Union',
        last4: '7351',
        type: 'Checking',
        icon: 'briefcase' as const,
    },
];

const paymentHistory = [
    { id: 1, date: 'Mar 22, 2026', desc: 'Sarah Johnson — Video Consultation', amount: '₹ 500', status: 'Completed' },
    { id: 2, date: 'Mar 20, 2026', desc: 'Michael Brown — Follow-up', amount: '₹ 500', status: 'Completed' },
    { id: 3, date: 'Mar 18, 2026', desc: 'Emily Davis — Video Consultation', amount: '₹ 500', status: 'Completed' },
    { id: 4, date: 'Mar 15, 2026', desc: 'James Wilson — In-Person', amount: '₹ 750', status: 'Completed' },
    { id: 5, date: 'Mar 26, 2026', desc: 'Priya Sharma — New Patient', amount: '₹ 500', status: 'Pending' },
];

const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', icon: 'smartphone' as const },
    { id: 'card', label: 'Credit / Debit', icon: 'credit-card' as const },
    { id: 'netbanking', label: 'Net Banking', icon: 'globe' as const },
    { id: 'cash', label: 'Cash', icon: 'dollar-sign' as const },
];

export default function PayoutMethodsModal({ visible, onClose }: PayoutMethodsModalProps) {
    const { colors } = useTheme();
    const [isAddBankOpen, setIsAddBankOpen] = useState(false);
    const [acceptedMethods, setAcceptedMethods] = useState<string[]>(['upi', 'card']);

    const toggleMethod = (id: string) => {
        setAcceptedMethods((prev) =>
            prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
        );
    };

    return (
        <>
            <ThemedBottomSheet visible={visible} onClose={onClose}>
                {/* Header */}
                <View style={s.header}>
                    <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Payout Methods</Text>
                </View>

                <ScrollView
                    style={s.scrollArea}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollInner}
                >
                    <Text style={[s.sectionTitle, { color: colors.textMuted }]}>Saved Accounts</Text>

                    {savedAccounts.map((account) => (
                        <View key={account.id} style={[s.accountCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                            <View style={s.accountRow}>
                                <View style={[s.accountIcon, { backgroundColor: colors.surfaceMuted }]}>
                                    <Feather name={account.icon} size={20} color={colors.primary} />
                                </View>
                                <View style={s.accountInfo}>
                                    <Text style={[s.accountBank, { color: colors.textPrimary }]}>{account.bank}</Text>
                                    <Text style={[s.accountMeta, { color: colors.textMuted }]}>
                                        {account.type}  •  •••• {account.last4}
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                style={({ pressed }) => [pressed && { opacity: 0.5 }]}
                                hitSlop={8}
                            >
                                <Text style={[s.removeText, { color: colors.error }]}>Remove</Text>
                            </Pressable>
                        </View>
                    ))}

                    {/* Accepted Payment Methods */}
                    <Text style={[s.sectionTitle, { color: colors.textMuted, marginTop: spacing['3xl'] }]}>
                        Accepted Payment Methods
                    </Text>
                    <View style={s.methodGrid}>
                        {PAYMENT_METHODS.map((method) => {
                            const active = acceptedMethods.includes(method.id);
                            return (
                                <Pressable
                                    key={method.id}
                                    style={[
                                        s.methodCard,
                                        { borderColor: colors.borderLight, backgroundColor: colors.surface },
                                        active && { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
                                    ]}
                                    onPress={() => toggleMethod(method.id)}
                                >
                                    <View style={[
                                        s.methodIcon,
                                        { backgroundColor: colors.surfaceMuted },
                                        active && { backgroundColor: colors.primary },
                                    ]}>
                                        <Feather
                                            name={method.icon}
                                            size={20}
                                            color={active ? colors.surface : colors.textSecondary}
                                        />
                                    </View>
                                    <Text style={[
                                        s.methodLabel,
                                        { color: colors.textSecondary },
                                        active && { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
                                    ]}>
                                        {method.label}
                                    </Text>
                                    {active && (
                                        <View style={[s.methodCheck, { backgroundColor: colors.primary + '18' }]}>
                                            <Feather name="check" size={14} color={colors.primary} />
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Payment History */}
                    <Text style={[s.sectionTitle, { color: colors.textMuted, marginTop: spacing['3xl'] }]}>Payment History</Text>

                    <View style={[s.historyCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                        {paymentHistory.map((payout, idx) => (
                            <View
                                key={payout.id}
                                style={[
                                    s.historyRow,
                                    idx < paymentHistory.length - 1 && [s.historyRowBorder, { borderBottomColor: colors.borderLight }],
                                ]}
                            >
                                <View style={[s.historyIcon, { backgroundColor: colors.surfaceMuted }]}>
                                    <Feather
                                        name={payout.status === 'Completed' ? 'check-circle' : 'clock'}
                                        size={16}
                                        color={payout.status === 'Completed' ? colors.success : colors.warning}
                                    />
                                </View>
                                <View style={s.historyInfo}>
                                    <Text style={[s.historyDesc, { color: colors.textPrimary }]}>{payout.desc}</Text>
                                    <Text style={[s.historyDate, { color: colors.textMuted }]}>{payout.date}</Text>
                                </View>
                                <View style={s.historyRight}>
                                    <Text style={[s.historyAmount, { color: colors.textPrimary }]}>{payout.amount}</Text>
                                    <Text style={[
                                        s.historyStatus,
                                        { color: payout.status === 'Completed' ? colors.success : colors.warning },
                                    ]}>{payout.status}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                {/* Footer */}
                <View style={[s.footer, { borderTopColor: colors.borderLight }]}>
                    <Pressable
                        style={({ pressed }) => [
                            s.addBtn,
                            { backgroundColor: colors.primary },
                            pressed && { backgroundColor: colors.primaryDark },
                        ]}
                        onPress={() => setIsAddBankOpen(true)}
                    >
                        <Feather name="plus" size={18} color={colors.surface} />
                        <Text style={[s.addBtnText, { color: colors.surface }]}>Add New Bank Account</Text>
                    </Pressable>
                </View>
            </ThemedBottomSheet>

            <AddBankAccountModal
                visible={isAddBankOpen}
                onClose={() => setIsAddBankOpen(false)}
            />
        </>
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
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.lg,
    },

    accountCard: {
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.card,
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    accountIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountInfo: { flex: 1, gap: spacing.xxs },
    accountBank: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
    },
    accountMeta: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
    },
    removeText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        alignSelf: 'flex-end',
    },

    methodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    methodCard: {
        width: '47%' as unknown as number,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderWidth: 1.5,
        borderRadius: radii.lg,
    },
    methodIcon: {
        width: 38,
        height: 38,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodLabel: {
        flex: 1,
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
    },
    methodCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
    },
    addBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
    },

    historyCard: {
        borderWidth: 1,
        borderRadius: radii.lg,
        overflow: 'hidden',
        ...shadows.card,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    historyRowBorder: {
        borderBottomWidth: 1,
    },
    historyIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyInfo: {
        flex: 1,
        gap: spacing.xxs,
    },
    historyDesc: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
    },
    historyDate: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
    },
    historyRight: {
        alignItems: 'flex-end',
        gap: spacing.xxs,
    },
    historyAmount: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
    },
    historyStatus: {
        fontFamily: typography.fontFamily.medium,
        fontSize: 10,
    },
});
