/**
 * CareConnect — Add Patient Modal (Doctor)
 *
 * 85%-height Bottom Sheet matching the web app's RegisterPatientDialog 1:1.
 * Three sections: Personal Information, Emergency Contact, Medical History.
 * Uses doctorColors + StyleSheet.create().
 */

import { useState, useCallback } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { addPatient } from '@/services/doctor';
import ThemedAlert from '@/components/doctor/ThemedAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddPatientModalProps {
    visible: boolean;
    onClose: () => void;
    onPatientAdded?: () => void;
}

const GENDERS = ['Male', 'Female', 'Other'] as const;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function formatAadhar(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
        parts.push(digits.slice(i, i + 4));
    }
    return parts.join(' ');
}

export default function AddPatientModal({ visible, onClose, onPatientAdded }: AddPatientModalProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [aadharNumber, setAadharNumber] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [address, setAddress] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [allergies, setAllergies] = useState('');
    const [existingConditions, setExistingConditions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    const canSubmit = fullName.trim() && phone.trim() && dateOfBirth.trim();

    const resetForm = () => {
        setFullName('');
        setPhone('');
        setDateOfBirth('');
        setGender('');
        setAadharNumber('');
        setBloodGroup('');
        setAddress('');
        setEmergencyName('');
        setEmergencyPhone('');
        setAllergies('');
        setExistingConditions('');
    };

    const handleSubmit = useCallback(async () => {
        if (!canSubmit || !token) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await addPatient(token, {
                full_name: fullName.trim(),
                whatsapp_number: phone.trim(),
                hospital_id: '', // Will be resolved by backend from token
                caregiver_id: '', // Will be resolved by backend from token
                date_of_birth: dateOfBirth.trim() || undefined,
                gender: gender || undefined,
                blood_group: bloodGroup || undefined,
                address: address.trim() || undefined,
                aadhar_number: aadharNumber.replace(/\s/g, '') || undefined,
                allergies: allergies.trim() ? allergies.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                existing_conditions: existingConditions.trim() ? existingConditions.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                emergency_contact_name: emergencyName.trim() || undefined,
                emergency_contact_phone: emergencyPhone.trim() || undefined,
            });
            setShowSuccess(true);
            onPatientAdded?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to register patient. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [canSubmit, token, fullName, phone, dateOfBirth, gender, bloodGroup, address, aadharNumber, allergies, existingConditions, emergencyName, emergencyPhone, onPatientAdded]);

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
                        <View>
                            <ThemedText color="primary" weight="bold" size="xl" style={s.headerTitle}>Register New Patient</ThemedText>
                            <ThemedText color="muted" size="xs" style={s.headerSub}>Enter the patient's details to create their profile.</ThemedText>
                        </View>
                    </View>

                    <ScrollView
                        style={s.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollInner}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ── Section 1: Personal Information ── */}
                        <ThemedText color="muted" weight="semiBold" size="sm" style={s.sectionTitle}>Personal Information</ThemedText>

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Full Name <ThemedText color="brand" weight="medium" size="sm" style={{ color: "#EF4444" }}>*</ThemedText></ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Enter full name"
                            placeholderTextColor={colors.textMuted}
                        />

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Phone Number <ThemedText color="brand" weight="medium" size="sm" style={{ color: "#EF4444" }}>*</ThemedText></ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="phone-pad"
                        />

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Date of Birth <ThemedText color="brand" weight="medium" size="sm" style={{ color: "#EF4444" }}>*</ThemedText></ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={dateOfBirth}
                            onChangeText={setDateOfBirth}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={colors.textMuted}
                        />

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Gender</ThemedText>
                        <View style={s.chipRow}>
                            {GENDERS.map((g) => (
                                <Pressable
                                    key={g}
                                    style={[s.chip, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }, gender === g && [s.chipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]}
                                    onPress={() => setGender(gender === g ? '' : g)}
                                >
                                    <ThemedText weight="medium" size="sm" style={[s.chipText, { color: colors.textSecondary }, gender === g && s.chipTextActive]}>{g}</ThemedText>
                                </Pressable>
                            ))}
                        </View>

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Aadhar Card Number</ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={aadharNumber}
                            onChangeText={(t) => setAadharNumber(formatAadhar(t))}
                            placeholder="XXXX XXXX XXXX"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            maxLength={14}
                        />

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Blood Group</ThemedText>
                        <View style={s.chipRow}>
                            {BLOOD_GROUPS.map((bg) => (
                                <Pressable
                                    key={bg}
                                    style={[s.chipSmall, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }, bloodGroup === bg && [s.chipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]}
                                    onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                                >
                                    <ThemedText weight="medium" size="sm" style={[s.chipText, { color: colors.textSecondary }, bloodGroup === bg && s.chipTextActive]}>{bg}</ThemedText>
                                </Pressable>
                            ))}
                        </View>

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Address</ThemedText>
                        <TextInput
                            style={[s.input, s.textArea, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Enter full address"
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={2}
                            textAlignVertical="top"
                        />

                        {/* ── Section 2: Emergency Contact ── */}
                        <ThemedText color="muted" weight="semiBold" size="sm" style={[s.sectionTitle, { marginTop: spacing['3xl'] }]}>Emergency Contact</ThemedText>

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Contact Name</ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={emergencyName}
                            onChangeText={setEmergencyName}
                            placeholder="Emergency contact name"
                            placeholderTextColor={colors.textMuted}
                        />

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Contact Phone</ThemedText>
                        <TextInput
                            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={emergencyPhone}
                            onChangeText={setEmergencyPhone}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="phone-pad"
                        />

                        {/* ── Section 3: Medical History ── */}
                        <ThemedText color="muted" weight="semiBold" size="sm" style={[s.sectionTitle, { marginTop: spacing['3xl'] }]}>Medical History</ThemedText>

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Known Allergies</ThemedText>
                        <TextInput
                            style={[s.input, s.textArea, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={allergies}
                            onChangeText={setAllergies}
                            placeholder="List any known allergies (medications, food, etc.)"
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={2}
                            textAlignVertical="top"
                        />

                        <ThemedText color="secondary" weight="medium" size="sm" style={s.label}>Existing Medical Conditions</ThemedText>
                        <TextInput
                            style={[s.input, s.textArea, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={existingConditions}
                            onChangeText={setExistingConditions}
                            placeholder="List any existing medical conditions"
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={2}
                            textAlignVertical="top"
                        />
                    </ScrollView>

                    {/* Footer */}
                    <View style={[s.footer, { borderTopColor: colors.borderLight, backgroundColor: colors.surface }]}>
                        <Pressable
                            style={({ pressed }) => [s.cancelBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                            onPress={onClose}
                        >
                            <ThemedText color="secondary" weight="medium" size="base" style={s.cancelBtnText}>Cancel</ThemedText>
                        </Pressable>
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
                                    <Feather name="user-plus" size={16} color="#fff" />
                                    <ThemedText weight="semiBold" size="base" style={s.submitBtnText}>Register Patient</ThemedText>
                                </>
                            )}
                        </Pressable>
                    </View>
                </Animated.View>
            </Modal>

            <ThemedAlert
                visible={showSuccess}
                variant="success"
                icon="user-check"
                title="Patient Registered"
                message={`"${fullName}" has been registered successfully.`}
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
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        gap: spacing.md,
    },
    headerTitle: {
    },
    headerSub: {
        marginTop: spacing.xxs,
    },

    scrollArea: { flex: 1 },
    scrollInner: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

    sectionTitle: {
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.lg,
    },
    label: {
        marginBottom: spacing.sm,
    },
    required: { },
    input: {
        borderWidth: 1,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginBottom: spacing.lg,
    },
    textArea: {
        minHeight: 64,
        paddingTop: spacing.md,
    },

    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    chip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    chipSmall: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    chipActive: {
        borderWidth: 1,
    },
    chipText: {
    },
    chipTextActive: {
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
    },
    submitBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
    },
    submitBtnText: {
        color: '#FFFFFF',
    },
});
