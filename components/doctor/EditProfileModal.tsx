/**
 * CareConnect — Edit Profile Modal (Doctor)
 *
 * Comprehensive bottom sheet matching the web EditProfileSheet 1:1.
 * Sections: Personal Information, Practice Details, Consultation Fees.
 * Fully multi-tenant via useTheme().
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { Feather } from '@expo/vector-icons';
import { spacing, radii, typography } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { updateDoctorProfile } from '@/services/doctor';
import type { DoctorProfile } from '@/services/types';
import ThemedAlert from '@/components/doctor/ThemedAlert';
import { ThemedText } from '@/components/shared/Themed';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    profile?: DoctorProfile | null;
    onSaved?: () => void;
}

interface FormFields {
    fullName: string;
    specialization: string;
    phone: string;
    licenseNumber: string;
    clinicName: string;
    clinicAddress: string;
    videoFee: string;
    inPersonFee: string;
    bio: string;
}

const EMPTY_FORM: FormFields = {
    fullName: '',
    specialization: '',
    phone: '',
    licenseNumber: '',
    clinicName: '',
    clinicAddress: '',
    videoFee: '',
    inPersonFee: '',
    bio: '',
};

// ─── Field Sub-Component ─────────────────────────────────────────────────────

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    keyboardType,
    multiline,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    icon: keyof typeof Feather.glyphMap;
    keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
    multiline?: boolean;
}) {
    const { colors } = useTheme();
    return (
        <View style={fs.group}>
            <Text style={[fs.label, { color: colors.textMuted }]}>{label}</Text>
            <View style={[
                fs.inputWrap,
                { borderColor: colors.borderLight, backgroundColor: colors.surface },
                multiline && fs.inputWrapMulti,
            ]}>
                <Feather
                    name={icon}
                    size={15}
                    color={colors.textMuted}
                    style={fs.icon}
                />
                <TextInput
                    style={[
                        fs.input,
                        { color: colors.textPrimary },
                        multiline && fs.inputMulti,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={keyboardType ?? 'default'}
                    multiline={multiline}
                    textAlignVertical={multiline ? 'top' : 'center'}
                />
            </View>
        </View>
    );
}

const fs = StyleSheet.create({
    group: { marginBottom: spacing.lg },
    label: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        minHeight: 44,
    },
    inputWrapMulti: {
        alignItems: 'flex-start',
        paddingVertical: spacing.md,
    },
    icon: { marginRight: spacing.sm, marginTop: 1 },
    input: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        fontSize: 14,
        paddingVertical: 0,
    },
    inputMulti: {
        minHeight: 72,
        paddingTop: 0,
    },
});

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
    const { colors } = useTheme();
    return (
        <View style={[sl.row, { borderBottomColor: colors.borderLight }]}>
            <Text style={[sl.text, { color: colors.textMuted }]}>{label}</Text>
        </View>
    );
}

const sl = StyleSheet.create({
    row: {
        borderBottomWidth: 1,
        paddingBottom: spacing.xs,
        marginBottom: spacing.lg,
        marginTop: spacing.xl,
    },
    text: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EditProfileModal({ visible, onClose, profile, onSaved }: EditProfileModalProps) {
    const { colors } = useTheme();
    const { token } = useAuth();

    const [form, setForm] = useState<FormFields>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const set = (field: keyof FormFields) => (value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    useEffect(() => {
        if (visible && profile) {
            setForm({
                fullName: profile.full_name ?? '',
                specialization: profile.specialization ?? '',
                phone: profile.phone_number ?? '',
                licenseNumber: profile.license_number ?? '',
                clinicName: profile.clinic_name ?? '',
                clinicAddress: profile.clinic_address ?? '',
                videoFee: profile.video_consultation_fee != null
                    ? String(profile.video_consultation_fee) : '',
                inPersonFee: profile.in_person_consultation_fee != null
                    ? String(profile.in_person_consultation_fee) : '',
                bio: profile.bio ?? '',
            });
        }
        if (!visible) setShowSuccess(false);
    }, [visible, profile]);

    const handleSave = async () => {
        if (!token) return;
        setIsSaving(true);
        try {
            await updateDoctorProfile(token, {
                full_name: form.fullName.trim() || undefined,
                specialization: form.specialization.trim() || undefined,
                phone_number: form.phone.trim() || undefined,
                license_number: form.licenseNumber.trim() || undefined,
                clinic_name: form.clinicName.trim() || undefined,
                clinic_address: form.clinicAddress.trim() || undefined,
                video_consultation_fee: form.videoFee ? parseFloat(form.videoFee) : undefined,
                in_person_consultation_fee: form.inPersonFee ? parseFloat(form.inPersonFee) : undefined,
                bio: form.bio.trim() || undefined,
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
            <ThemedBottomSheet visible={visible} onClose={onClose}>
                {/* Header */}
                <View style={[s.header, { borderBottomColor: colors.borderLight }]}>
                    <View style={[s.headerIcon, { backgroundColor: colors.primaryLight }]}>
                        <Feather name="user" size={20} color={colors.primary} />
                    </View>
                    <View style={s.headerText}>
                        <ThemedText color="primary" weight="bold" size="xl">Edit Profile</ThemedText>
                        <ThemedText color="muted" size="xs" style={{ marginTop: spacing.xxs }}>
                            Update your personal &amp; practice details
                        </ThemedText>
                    </View>
                </View>

                {/* Form */}
                <ScrollView
                    style={s.scroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollInner}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Personal Information ── */}
                    <SectionLabel label="Personal Information" />
                    <Field
                        label="Full Name"
                        value={form.fullName}
                        onChangeText={set('fullName')}
                        placeholder="Dr. First Last"
                        icon="user"
                    />
                    <Field
                        label="Specialization"
                        value={form.specialization}
                        onChangeText={set('specialization')}
                        placeholder="e.g. Cardiologist"
                        icon="activity"
                    />
                    <Field
                        label="Phone / WhatsApp"
                        value={form.phone}
                        onChangeText={set('phone')}
                        placeholder="+91 XXXXX XXXXX"
                        icon="phone"
                        keyboardType="phone-pad"
                    />
                    <Field
                        label="License / Registration No."
                        value={form.licenseNumber}
                        onChangeText={set('licenseNumber')}
                        placeholder="e.g. NMC-78291"
                        icon="file-text"
                    />

                    {/* ── Practice Details ── */}
                    <SectionLabel label="Practice Details" />
                    <Field
                        label="Clinic / Hospital Name"
                        value={form.clinicName}
                        onChangeText={set('clinicName')}
                        placeholder="e.g. Apollo Clinic"
                        icon="home"
                    />
                    <Field
                        label="Clinic / Hospital Address"
                        value={form.clinicAddress}
                        onChangeText={set('clinicAddress')}
                        placeholder="123 Main St, City"
                        icon="map-pin"
                    />

                    {/* ── Consultation Fees ── */}
                    <SectionLabel label="Consultation Fees" />
                    <Field
                        label="Video Consultation Fee"
                        value={form.videoFee}
                        onChangeText={set('videoFee')}
                        placeholder="e.g. 800"
                        icon="video"
                        keyboardType="numeric"
                    />
                    <Field
                        label="In-Person Consultation Fee"
                        value={form.inPersonFee}
                        onChangeText={set('inPersonFee')}
                        placeholder="e.g. 1000"
                        icon="user-check"
                        keyboardType="numeric"
                    />

                    {/* ── Bio ── */}
                    <SectionLabel label="Bio / About" />
                    <Field
                        label="Bio"
                        value={form.bio}
                        onChangeText={set('bio')}
                        placeholder="A short bio about your practice..."
                        icon="align-left"
                        multiline
                    />
                </ScrollView>

                {/* Footer */}
                <View style={[s.footer, { borderTopColor: colors.borderLight }]}>
                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            s.cancelBtn,
                            { borderColor: colors.border },
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Text style={[s.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving}
                        style={({ pressed }) => [
                            s.saveBtn,
                            { backgroundColor: colors.primary },
                            isSaving && { opacity: 0.6 },
                            pressed && { opacity: 0.85 },
                        ]}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Feather name="check" size={16} color="#fff" />
                                <Text style={s.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </ThemedBottomSheet>

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: { flex: 1 },

    scroll: { flex: 1 },
    scrollInner: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing['6xl'],
    },

    footer: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
    },
    cancelBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    cancelBtnText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: 14,
    },
    saveBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
    },
    saveBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 14,
        color: '#FFFFFF',
    },
});
