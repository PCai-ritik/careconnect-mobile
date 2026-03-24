/**
 * CareConnect — Edit Profile Modal (Doctor)
 *
 * 85%-height Bottom Sheet with a traditional form for editing
 * doctor profile details. Uses doctorColors + StyleSheet.create().
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

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const [fullName, setFullName] = useState('Dr. Robert Chen');
    const [specialization, setSpecialization] = useState('Cardiologist');
    const [regNumber, setRegNumber] = useState('NMC-78291');
    const [fee, setFee] = useState('500');
    const [whatsapp, setWhatsapp] = useState('+1 234 567 8900');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = () => {
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
                {/* Backdrop */}
                <Pressable style={s.backdrop} onPress={onClose} />

                {/* Sheet */}
                <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom }]}>
                    {/* Handle */}
                    <View style={s.handleRow} {...panHandlers}>
                        <View style={s.handle} />
                    </View>

                    {/* Header */}
                    <View style={s.header}>
                        <Text style={s.headerTitle}>Edit Profile</Text>
                    </View>

                    {/* Form */}
                    <ScrollView
                        style={s.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollInner}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Field
                            label="Full Name"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="e.g., Dr. Robert Chen"
                        />
                        <Field
                            label="Specialization"
                            value={specialization}
                            onChangeText={setSpecialization}
                            placeholder="e.g., Cardiologist"
                        />
                        <Field
                            label="Registration Number"
                            value={regNumber}
                            onChangeText={setRegNumber}
                            placeholder="e.g., NMC-78291"
                        />
                        <Field
                            label="Consultation Fee"
                            value={fee}
                            onChangeText={setFee}
                            placeholder="e.g., 500"
                            keyboardType="numeric"
                        />
                        <Field
                            label="WhatsApp Number"
                            value={whatsapp}
                            onChangeText={setWhatsapp}
                            placeholder="e.g., +1 234 567 8900"
                            keyboardType="phone-pad"
                        />
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        <Pressable
                            onPress={handleSave}
                            style={({ pressed }) => [
                                s.saveBtn,
                                pressed && { backgroundColor: doctorColors.primaryDark },
                            ]}
                        >
                            <Feather name="check" size={18} color="#fff" />
                            <Text style={s.saveBtnText}>Save Changes</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Modal>

            <ThemedAlert
                visible={showSuccess}
                variant="success"
                icon="check-circle"
                title="Profile Updated"
                message="Your profile changes have been saved successfully."
                confirmLabel="Done"
                onConfirm={() => {
                    setShowSuccess(false);
                    onClose();
                }}
            />
        </>
    );
}

// ─── Field Sub-Component ────────────────────────────────────────────────────

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) {
    return (
        <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>{label}</Text>
            <TextInput
                style={s.fieldInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={doctorColors.textMuted}
                keyboardType={keyboardType ?? 'default'}
            />
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
    handleRow: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: doctorColors.border,
    },

    // Header
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


    // Form
    scrollArea: { flex: 1 },
    scrollInner: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },
    fieldGroup: {
        marginBottom: spacing.xl,
    },
    fieldLabel: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        marginBottom: spacing.sm,
    },
    fieldInput: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: radii.md,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },

    // Footer
    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    saveBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});
