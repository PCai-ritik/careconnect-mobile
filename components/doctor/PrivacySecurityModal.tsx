/**
 * CareConnect — Privacy & Security Modal (Doctor)
 *
 * 85%-height Bottom Sheet with toggle switches for biometric
 * login and 2FA, plus a compliance note.
 * Uses doctorColors + StyleSheet.create().
 */

import { useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    Switch,
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

interface PrivacySecurityModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function PrivacySecurityModal({ visible, onClose }: PrivacySecurityModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const [biometric, setBiometric] = useState(true);
    const [twoFactor, setTwoFactor] = useState(false);

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
                    <Text style={s.headerTitle}>Privacy & Security</Text>
                </View>

                <ScrollView
                    style={s.scrollArea}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollInner}
                >
                    {/* Settings card */}
                    <View style={s.card}>
                        {/* Biometric */}
                        <View style={[s.row, s.rowBorder]}>
                            <View style={s.rowIcon}>
                                <Feather name="smartphone" size={18} color={doctorColors.primary} />
                            </View>
                            <View style={s.rowInfo}>
                                <Text style={s.rowLabel}>Biometric Login</Text>
                                <Text style={s.rowSub}>Use fingerprint or face ID</Text>
                            </View>
                            <Switch
                                value={biometric}
                                onValueChange={setBiometric}
                                trackColor={{
                                    false: doctorColors.border,
                                    true: doctorColors.primary,
                                }}
                                thumbColor="#FFFFFF"
                            />
                        </View>

                        {/* 2FA */}
                        <View style={s.row}>
                            <View style={s.rowIcon}>
                                <Feather name="shield" size={18} color={doctorColors.primary} />
                            </View>
                            <View style={s.rowInfo}>
                                <Text style={s.rowLabel}>Two-Factor Authentication</Text>
                                <Text style={s.rowSub}>Extra layer via SMS or app</Text>
                            </View>
                            <Switch
                                value={twoFactor}
                                onValueChange={setTwoFactor}
                                trackColor={{
                                    false: doctorColors.border,
                                    true: doctorColors.primary,
                                }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    </View>

                    {/* Compliance note */}
                    <View style={s.complianceBox}>
                        <Feather name="lock" size={16} color={doctorColors.primary} />
                        <Text style={s.complianceText}>
                            All patient data is end-to-end encrypted and our platform
                            is fully HIPAA compliant. Your patients' information is
                            always safe and secure.
                        </Text>
                    </View>
                </ScrollView>
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

    card: {
        backgroundColor: doctorColors.surface,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
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
        borderBottomColor: doctorColors.borderLight,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: doctorColors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowInfo: { flex: 1, gap: spacing.xxs },
    rowLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    rowSub: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },

    complianceBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginTop: spacing['3xl'],
        padding: spacing.lg,
        backgroundColor: doctorColors.surfaceMuted,
        borderRadius: radii.md,
    },
    complianceText: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        lineHeight: 20,
    },
});
