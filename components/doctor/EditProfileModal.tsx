/**
 * CareConnect — Edit Profile Modal (Doctor)
 *
 * 85%-height Bottom Sheet with a traditional form for editing
 * doctor profile details. Pre-fills from DoctorProfile prop.
 * Calls PATCH /doctors/profile on save.
 * Uses doctorColors + StyleSheet.create().
 */

import { useState, useEffect } from 'react';
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
    ActivityIndicator,
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
import { useAuth } from '@/hooks/useAuth';
import { updateDoctorProfile } from '@/services/doctor';
import type { DoctorProfile } from '@/services/types';
import ThemedAlert from '@/components/doctor/ThemedAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    profile?: DoctorProfile | null;
    onSaved?: () => void;
}

export default function EditProfileModal({ visible, onClose, profile, onSaved }: EditProfileModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const { token } = useAuth();

    const [fullName, setFullName] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [regNumber, setRegNumber] = useState('');
    const [fee, setFee] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Pre-fill form from profile when modal opens
    useEffect(() => {
        if (visible && profile) {
            setFullName(profile.full_name ?? '');
            setSpecialization(profile.specialization ?? '');
            setRegNumber(profile.license_number ?? '');
            setFee(profile.consultation_fee?.toString() ?? '');
            setPhone(profile.phone_number ?? '');
            setBio(profile.bio ?? '');
        }
    }, [visible, profile]);

    const handleSave = async () => {
        if (!token) return;
        setIsSaving(true);
        try {
            await updateDoctorProfile(token, {
                full_name: fullName.trim() || undefined,
                specialization: specialization.trim() || undefined,
                license_number: regNumber.trim() || undefined,
                consultation_fee: fee ? parseFloat(fee) : undefined,
                phone_number: phone.trim() || undefined,
                bio: bio.trim() || undefined,
            });
            setShowSuccess(true);
            onSaved?.();
        } catch (err) {
            console.error('Failed to save profile:', err);
        } finally {
            setIsSaving(false);
        }
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
                            label="Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="e.g., +91 98765 43210"
                            keyboardType="phone-pad"
                        />
                        <Field
                            label="Bio"
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Brief professional bio..."
                            multiline
                        />
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        <Pressable
                            onPress={handleSave}
                            disabled={isSaving}
                            style={({ pressed }) => [
                                s.saveBtn,
                                isSaving && { opacity: 0.6 },
                                pressed && { backgroundColor: doctorColors.primaryDark },
                            ]}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Feather name="check" size={18} color="#fff" />
                                    <Text style={s.saveBtnText}>Save Changes</Text>
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
    multiline,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'numeric' | 'phone-pad';
    multiline?: boolean;
}) {
    return (
        <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>{label}</Text>
            <TextInput
                style={[s.fieldInput, multiline && { minHeight: 80, textAlignVertical: 'top' as const }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={doctorColors.textMuted}
                keyboardType={keyboardType ?? 'default'}
                multiline={multiline}
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
