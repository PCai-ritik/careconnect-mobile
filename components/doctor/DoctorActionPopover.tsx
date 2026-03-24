/**
 * CareConnect — Doctor Action Popover
 *
 * Floating popover menu triggered by the center tab button.
 * Offers "New Prescription" and "Add Patient" quick actions.
 * Uses doctorColors tokens + StyleSheet.create().
 */

import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';

interface DoctorActionPopoverProps {
    visible: boolean;
    onClose: () => void;
    onPrescription: () => void;
    onAddPatient: () => void;
}

export default function DoctorActionPopover({
    visible,
    onClose,
    onPrescription,
    onAddPatient,
}: DoctorActionPopoverProps) {
    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            {/* Dark backdrop — tap to dismiss */}
            <Pressable style={s.backdrop} onPress={onClose}>
                {/* Popover bubble positioned above tab bar */}
                <Pressable
                    style={s.popover}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Caret pointing down (centered) */}
                    <View style={s.caret}>
                        <View style={s.caretTriangle} />
                    </View>

                    <View style={s.actionRow}>
                        {/* Add Patient */}
                        <Pressable
                            style={({ pressed }) => [
                                s.actionBtn,
                                pressed && { opacity: 0.7 },
                            ]}
                            onPress={() => {
                                onClose();
                                onAddPatient();
                            }}
                        >
                            <View style={s.actionIcon}>
                                <Feather
                                    name="user-plus"
                                    size={22}
                                    color={doctorColors.primary}
                                />
                            </View>
                            <Text style={s.actionLabel}>Add Patient</Text>
                        </Pressable>

                        {/* Divider */}
                        <View style={s.divider} />

                        {/* New Prescription */}
                        <Pressable
                            style={({ pressed }) => [
                                s.actionBtn,
                                pressed && { opacity: 0.7 },
                            ]}
                            onPress={() => {
                                onClose();
                                onPrescription();
                            }}
                        >
                            <View style={s.actionIcon}>
                                <Feather
                                    name="file-text"
                                    size={22}
                                    color={doctorColors.primary}
                                />
                            </View>
                            <Text style={s.actionLabel}>Prescribe</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    popover: {
        marginBottom: 100,
        backgroundColor: doctorColors.surface,
        borderRadius: 16,
        padding: spacing.lg,
        ...shadows.elevated,
        minWidth: 220,
    },
    caret: {
        position: 'absolute',
        bottom: -8,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    caretTriangle: {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: doctorColors.surface,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xl,
    },
    actionBtn: {
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    actionIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: doctorColors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    divider: {
        width: 1,
        height: 48,
        backgroundColor: doctorColors.borderLight,
    },
});
