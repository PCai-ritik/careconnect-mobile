/**
 * CareConnect — Add Bank Account Modal (Doctor)
 *
 * 85%-height Bottom Sheet with bank account registration form.
 * Uses doctorColors + StyleSheet.create().
 */

import { useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
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
import ThemedAlert from '@/components/doctor/ThemedAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddBankAccountModalProps {
    visible: boolean;
    onClose: () => void;
}

const ACCOUNT_TYPES = ['Savings', 'Checking'] as const;

export default function AddBankAccountModal({ visible, onClose }: AddBankAccountModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const [holderName, setHolderName] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [confirmAccount, setConfirmAccount] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [accountType, setAccountType] = useState<string>('Savings');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const canSubmit = holderName.trim() && bankName.trim() && accountNumber.trim()
        && confirmAccount.trim() && ifscCode.trim()
        && accountNumber === confirmAccount;

    const resetForm = () => {
        setHolderName('');
        setBankName('');
        setAccountNumber('');
        setConfirmAccount('');
        setIfscCode('');
        setAccountType('Savings');
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setIsSubmitting(true);
        await new Promise((r) => setTimeout(r, 1000));
        setIsSubmitting(false);
        setShowSuccess(true);
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
                        <Text style={s.headerTitle}>Add Bank Account</Text>
                    </View>

                    <ScrollView
                        style={s.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollInner}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={s.label}>Account Holder Name <Text style={s.req}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            value={holderName}
                            onChangeText={setHolderName}
                            placeholder="Full name as on account"
                            placeholderTextColor={doctorColors.textMuted}
                        />

                        <Text style={s.label}>Bank Name <Text style={s.req}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            value={bankName}
                            onChangeText={setBankName}
                            placeholder="e.g., First National Bank"
                            placeholderTextColor={doctorColors.textMuted}
                        />

                        <Text style={s.label}>Account Number <Text style={s.req}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            value={accountNumber}
                            onChangeText={setAccountNumber}
                            placeholder="Enter account number"
                            placeholderTextColor={doctorColors.textMuted}
                            keyboardType="numeric"
                            secureTextEntry
                        />

                        <Text style={s.label}>Confirm Account Number <Text style={s.req}>*</Text></Text>
                        <TextInput
                            style={[
                                s.input,
                                confirmAccount.length > 0 && confirmAccount !== accountNumber && s.inputError,
                            ]}
                            value={confirmAccount}
                            onChangeText={setConfirmAccount}
                            placeholder="Re-enter account number"
                            placeholderTextColor={doctorColors.textMuted}
                            keyboardType="numeric"
                        />
                        {confirmAccount.length > 0 && confirmAccount !== accountNumber && (
                            <Text style={s.errorText}>Account numbers do not match</Text>
                        )}

                        <Text style={s.label}>IFSC / Routing Code <Text style={s.req}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            value={ifscCode}
                            onChangeText={(t) => setIfscCode(t.toUpperCase())}
                            placeholder="e.g., SBIN0001234"
                            placeholderTextColor={doctorColors.textMuted}
                            autoCapitalize="characters"
                        />

                        <Text style={s.label}>Account Type</Text>
                        <View style={s.chipRow}>
                            {ACCOUNT_TYPES.map((t) => (
                                <Pressable
                                    key={t}
                                    style={[s.chip, accountType === t && s.chipActive]}
                                    onPress={() => setAccountType(t)}
                                >
                                    <Text style={[s.chipText, accountType === t && s.chipTextActive]}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        <Pressable
                            style={({ pressed }) => [
                                s.submitBtn,
                                (!canSubmit || isSubmitting) && { opacity: 0.5 },
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Feather name="plus" size={16} color="#fff" />
                                    <Text style={s.submitBtnText}>Add Account</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </Animated.View>
            </Modal>

            <ThemedAlert
                visible={showSuccess}
                variant="success"
                icon="check-circle"
                title="Account Added"
                message={`${bankName} account has been linked to your profile.`}
                confirmLabel="Done"
                onConfirm={() => {
                    setShowSuccess(false);
                    resetForm();
                    onClose();
                }}
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

    label: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        marginBottom: spacing.sm,
    },
    req: { color: '#EF4444' },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: radii.md,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        marginBottom: spacing.lg,
    },
    inputError: {
        borderColor: '#EF4444',
        marginBottom: spacing.xs,
    },
    errorText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: '#EF4444',
        marginBottom: spacing.lg,
    },

    chipRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    chip: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
    },
    chipActive: {
        borderColor: doctorColors.primary,
        backgroundColor: doctorColors.primary + '12',
    },
    chipText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
    },
    chipTextActive: {
        color: doctorColors.primary,
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    submitBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});
