/**
 * CareConnect — Patient Themed Alert Modal
 *
 * Reusable alert for the Patient app, using patientColors.
 * Supports confirm/cancel actions and success/warning/danger variants.
 */

import {
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
import { ThemedView, ThemedText } from '@/components/shared/Themed';

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
            <ThemedView style={s.overlay}>
                <ThemedView bg="surface" style={s.card}>
                    {/* Icon */}
                    <ThemedView style={[s.iconCircle, { backgroundColor: v.bg }]}>
                        <Feather
                            name={icon ?? defaultIcon}
                            size={28}
                            color={v.color}
                        />
                    </ThemedView>

                    {/* Text */}
                    <ThemedText weight="bold" size="lg" style={s.title}>{title}</ThemedText>
                    <ThemedText size="sm" color="muted" style={s.message}>{message}</ThemedText>

                    {/* Actions */}
                    <ThemedView style={s.actions}>
                        {cancelLabel && onCancel && (
                            <Pressable
                                style={({ pressed }) => [
                                    s.btn,
                                    s.cancelBtn,
                                    pressed && { opacity: 0.7 },
                                ]}
                                onPress={onCancel}
                            >
                                <ThemedText weight="medium" color="secondary" style={s.cancelBtnText}>{cancelLabel}</ThemedText>
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
                            <ThemedText weight="semiBold" style={s.confirmBtnText}>{confirmLabel}</ThemedText>
                        </Pressable>
                    </ThemedView>
                </ThemedView>
            </ThemedView>
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
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    message: {
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
    },
    confirmBtn: {},
    confirmBtnText: {
        color: '#FFFFFF',
    },
});
