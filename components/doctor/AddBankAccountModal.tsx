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
    shadows,
    radii,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedText, ThemedView } from '@/components/shared/Themed';
import ThemedAlert from '@/components/doctor/ThemedAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddBankAccountModalProps {
    visible: boolean;
    onClose: () => void;
}

const ACCOUNT_TYPES = ['Savings', 'Checking'] as const;

export default function AddBankAccountModal({ visible, onClose }: AddBankAccountModalProps) {
    const { colors } = useTheme();
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

                <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom, backgroundColor: colors.surface }]}>
                    <View style={s.handleRow} {...panHandlers}>
                        <View style={[s.handle, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Header */}
                    <View style={s.header}>
                        <ThemedText color="primary" weight="bold" size="xl" style={s.headerTitle}>Add Bank Account</ThemedText>
                    </View>

                    <ScrollView
                        style={s.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollInner}
                        keyboardShouldPersistTaps="handled"
                    >
                        <ThemedText color="secondary" weight="semiBold" size="sm" style={s.label}>Account Holder Name <ThemedText color="brand" weight="semiBold" size="sm" style={{ color: "#EF4444" }}>*</ThemedText></ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={holderName}
                            onChangeText={setHolderName}
                            placeholder="Full name as on account"
                            placeholderTextColor={colors.textMuted}
                        />

                        <ThemedText color="secondary" weight="semiBold" size="sm" style={s.label}>Bank Name <ThemedText color="brand" weight="semiBold" size="sm" style={{ color: "#EF4444" }}>*</ThemedText></ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={bankName}
                            onChangeText={setBankName}
                            placeholder="e.g., First National Bank"
                            placeholderTextColor={colors.textMuted}
                        />

                        <ThemedText color="secondary" weight="semiBold" size="sm" style={s.label}>Account Number <ThemedText color="brand" weight="semiBold" size="sm" style={{ color: "#EF4444" }}>*</ThemedText></ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={accountNumber}
                            onChangeText={setAccountNumber}
                            placeholder="Enter account number"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            secureTextEntry
                        />

                        <ThemedText color="secondary" weight="semiBold" size="sm" style={s.label}>Confirm Account Number <ThemedText color="brand" weight="semiBold" size="sm" style={{ color: "#EF4444" }}>*</ThemedText></ThemedText>
                        <TextInput
                            style={[
                                s.input,
                                { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface },
                                confirmAccount.length > 0 && confirmAccount !== accountNumber && s.inputError,
                            ]}
                            value={confirmAccount}
                            onChangeText={setConfirmAccount}
                            placeholder="Re-enter account number"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                        />
                        {confirmAccount.length > 0 && confirmAccount !== accountNumber && (
                            <ThemedText size="xs" weight="regular" style={s.errorText}>Account numbers do not match</ThemedText>
                        )}

                        <ThemedText color="secondary" weight="semiBold" size="sm" style={s.label}>IFSC / Routing Code <ThemedText color="brand" weight="semiBold" size="sm" style={{ color: "#EF4444" }}>*</ThemedText></ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={ifscCode}
                            onChangeText={(t) => setIfscCode(t.toUpperCase())}
                            placeholder="e.g., SBIN0001234"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="characters"
                        />

                        <ThemedText color="secondary" weight="semiBold" size="sm" style={s.label}>Account Type</ThemedText>
                        <View style={s.chipRow}>
                            {ACCOUNT_TYPES.map((t) => (
                                <Pressable
                                    key={t}
                                    style={[s.chip, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }, accountType === t && [s.chipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]}
                                    onPress={() => setAccountType(t)}
                                >
                                    <ThemedText weight="medium" size="sm" style={[s.chipText, { color: colors.textSecondary }, accountType === t && s.chipTextActive]}>{t}</ThemedText>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={[s.footer, { borderTopColor: colors.borderLight }]}>
                        <Pressable
                            style={({ pressed }) => [
                                s.submitBtn,
                                { backgroundColor: colors.primary },
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
                                    <ThemedText weight="semiBold" size="base" style={s.submitBtnText}>Add Account</ThemedText>
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
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },
    handleRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
    handle: { width: 40, height: 4, borderRadius: 2 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
    },

    scrollArea: { flex: 1 },
    scrollInner: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

    label: {
        marginBottom: spacing.sm,
    },
    req: { },
    input: {
        borderWidth: 1,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginBottom: spacing.lg,
    },
    inputError: {
        borderColor: '#EF4444',
        marginBottom: spacing.xs,
    },
    errorText: {
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
        alignItems: 'center',
    },
    chipActive: {
        borderWidth: 1,
    },
    chipText: {
    },
    chipTextActive: {
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
    },
    submitBtnText: {
        color: '#FFFFFF',
    },
});
