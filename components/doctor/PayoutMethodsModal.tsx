/**
 * CareConnect — Payout Methods Modal (Doctor)
 *
 * 85%-height Bottom Sheet showing saved bank accounts, payment history,
 * accepted payment methods toggles, and Add New Account button.
 * Uses doctorColors + StyleSheet.create().
 */

import { useState } from 'react';
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
import AddBankAccountModal from '@/components/doctor/AddBankAccountModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const [isAddBankOpen, setIsAddBankOpen] = useState(false);
    const [acceptedMethods, setAcceptedMethods] = useState<string[]>(['upi', 'card']);

    const toggleMethod = (id: string) => {
        setAcceptedMethods((prev) =>
            prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
        );
    };

    return (
        <>
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
                        <Text style={s.headerTitle}>Payout Methods</Text>
                    </View>

                    <ScrollView
                        style={s.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollInner}
                    >
                        <Text style={s.sectionTitle}>Saved Accounts</Text>

                        {savedAccounts.map((account) => (
                            <View key={account.id} style={s.accountCard}>
                                <View style={s.accountRow}>
                                    <View style={s.accountIcon}>
                                        <Feather
                                            name={account.icon}
                                            size={20}
                                            color={doctorColors.primary}
                                        />
                                    </View>
                                    <View style={s.accountInfo}>
                                        <Text style={s.accountBank}>{account.bank}</Text>
                                        <Text style={s.accountMeta}>
                                            {account.type}  •  •••• {account.last4}
                                        </Text>
                                    </View>
                                </View>
                                <Pressable
                                    style={({ pressed }) => [pressed && { opacity: 0.5 }]}
                                    hitSlop={8}
                                >
                                    <Text style={s.removeText}>Remove</Text>
                                </Pressable>
                            </View>
                        ))}

                        {/* Accepted Payment Methods */}
                        <Text style={[s.sectionTitle, { marginTop: spacing['3xl'] }]}>
                            Accepted Payment Methods
                        </Text>
                        <View style={s.methodGrid}>
                            {PAYMENT_METHODS.map((method) => {
                                const active = acceptedMethods.includes(method.id);
                                return (
                                    <Pressable
                                        key={method.id}
                                        style={[s.methodCard, active && s.methodCardActive]}
                                        onPress={() => toggleMethod(method.id)}
                                    >
                                        <View style={[s.methodIcon, active && s.methodIconActive]}>
                                            <Feather
                                                name={method.icon}
                                                size={20}
                                                color={active ? '#FFFFFF' : doctorColors.textSecondary}
                                            />
                                        </View>
                                        <Text style={[s.methodLabel, active && s.methodLabelActive]}>
                                            {method.label}
                                        </Text>
                                        {active && (
                                            <View style={s.methodCheck}>
                                                <Feather name="check" size={14} color={doctorColors.primary} />
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Payment History */}
                        <Text style={[s.sectionTitle, { marginTop: spacing['3xl'] }]}>Payment History</Text>

                        <View style={s.historyCard}>
                            {paymentHistory.map((payout, idx) => (
                                <View
                                    key={payout.id}
                                    style={[
                                        s.historyRow,
                                        idx < paymentHistory.length - 1 && s.historyRowBorder,
                                    ]}
                                >
                                    <View style={s.historyIcon}>
                                        <Feather
                                            name={payout.status === 'Completed' ? 'check-circle' : 'clock'}
                                            size={16}
                                            color={payout.status === 'Completed' ? '#22C55E' : '#F59E0B'}
                                        />
                                    </View>
                                    <View style={s.historyInfo}>
                                        <Text style={s.historyDesc}>{payout.desc}</Text>
                                        <Text style={s.historyDate}>{payout.date}</Text>
                                    </View>
                                    <View style={s.historyRight}>
                                        <Text style={s.historyAmount}>{payout.amount}</Text>
                                        <Text style={[
                                            s.historyStatus,
                                            { color: payout.status === 'Completed' ? '#22C55E' : '#F59E0B' },
                                        ]}>{payout.status}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        <Pressable
                            style={({ pressed }) => [
                                s.addBtn,
                                pressed && { backgroundColor: doctorColors.primaryDark },
                            ]}
                            onPress={() => setIsAddBankOpen(true)}
                        >
                            <Feather name="plus" size={18} color="#fff" />
                            <Text style={s.addBtnText}>Add New Bank Account</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Modal>

            <AddBankAccountModal
                visible={isAddBankOpen}
                onClose={() => setIsAddBankOpen(false)}
            />
        </>
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
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.lg,
    },
    accountCard: {
        backgroundColor: doctorColors.surface,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
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
        backgroundColor: doctorColors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountInfo: { flex: 1, gap: spacing.xxs },
    accountBank: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    accountMeta: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    removeText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: '#EF4444',
        alignSelf: 'flex-end',
    },

    // Payment method toggles
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
        borderColor: doctorColors.borderLight,
        borderRadius: radii.lg,
        backgroundColor: doctorColors.surface,
    },
    methodCardActive: {
        borderColor: doctorColors.primary,
        backgroundColor: doctorColors.primary + '08',
    },
    methodIcon: {
        width: 38,
        height: 38,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodIconActive: {
        backgroundColor: doctorColors.primary,
    },
    methodLabel: {
        flex: 1,
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
    },
    methodLabelActive: {
        color: doctorColors.primary,
        fontFamily: typography.fontFamily.semiBold,
    },
    methodCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: doctorColors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    addBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },

    // Payment History
    historyCard: {
        backgroundColor: doctorColors.surface,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
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
        borderBottomColor: doctorColors.borderLight,
    },
    historyIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: doctorColors.surfaceMuted,
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
        color: doctorColors.textPrimary,
    },
    historyDate: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    historyRight: {
        alignItems: 'flex-end',
        gap: spacing.xxs,
    },
    historyAmount: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    historyStatus: {
        fontFamily: typography.fontFamily.medium,
        fontSize: 10,
    },
});
