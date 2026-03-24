/**
 * CareConnect — Patient Themed Alert Modal
 *
 * Reusable alert for the Patient app, using patientColors.
 * Supports confirm/cancel actions and success/warning/danger variants.
 */

import {
    View,
    Text,
    Modal,
    Pressable,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
    spacing,
    patientColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';

type AlertVariant = 'success' | 'warning' | 'danger';

interface PatientThemedAlertProps {
    visible: boolean;
    variant?: AlertVariant;
    icon?: keyof typeof Feather.glyphMap;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

const VARIANT_CONFIG: Record<AlertVariant, { color: string; bg: string }> = {
    success: { color: '#22C55E', bg: '#DCFCE7' },
    warning: { color: '#F59E0B', bg: '#FEF3C7' },
    danger: { color: '#EF4444', bg: '#FEE2E2' },
};

export default function PatientThemedAlert({
    visible,
    variant = 'success',
    icon,
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel,
    onConfirm,
    onCancel,
}: PatientThemedAlertProps) {
    const v = VARIANT_CONFIG[variant];
    const defaultIcon: keyof typeof Feather.glyphMap =
        variant === 'success' ? 'check-circle'
            : variant === 'danger' ? 'alert-triangle'
                : 'alert-circle';

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onCancel ?? onConfirm}
        >
            <View style={s.overlay}>
                <View style={s.card}>
                    {/* Icon */}
                    <View style={[s.iconCircle, { backgroundColor: v.bg }]}>
                        <Feather
                            name={icon ?? defaultIcon}
                            size={28}
                            color={v.color}
                        />
                    </View>

                    {/* Text */}
                    <Text style={s.title}>{title}</Text>
                    <Text style={s.message}>{message}</Text>

                    {/* Actions */}
                    <View style={s.actions}>
                        {cancelLabel && onCancel && (
                            <Pressable
                                style={({ pressed }) => [
                                    s.btn,
                                    s.cancelBtn,
                                    pressed && { opacity: 0.7 },
                                ]}
                                onPress={onCancel}
                            >
                                <Text style={s.cancelBtnText}>{cancelLabel}</Text>
                            </Pressable>
                        )}
                        <Pressable
                            style={({ pressed }) => [
                                s.btn,
                                s.confirmBtn,
                                { backgroundColor: v.color },
                                pressed && { opacity: 0.85 },
                                !cancelLabel && { flex: 1 },
                            ]}
                            onPress={onConfirm}
                        >
                            <Text style={s.confirmBtnText}>{confirmLabel}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing['3xl'],
    },
    card: {
        width: '100%',
        backgroundColor: patientColors.surface,
        borderRadius: radii.xl,
        padding: spacing.xl,
        alignItems: 'center',
        ...shadows.elevated,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.lg,
        color: patientColors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    message: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: patientColors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    btn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: radii.md,
    },
    cancelBtn: {
        borderWidth: 1,
        borderColor: patientColors.border,
        backgroundColor: patientColors.surface,
    },
    cancelBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: patientColors.textSecondary,
    },
    confirmBtn: {},
    confirmBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});
