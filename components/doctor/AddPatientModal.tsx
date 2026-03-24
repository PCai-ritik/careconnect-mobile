/**
 * CareConnect — Add Patient Modal (Doctor)
 *
 * 85%-height Bottom Sheet matching the web app's RegisterPatientDialog 1:1.
 * Three sections: Personal Information, Emergency Contact, Medical History.
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

interface AddPatientModalProps {
    visible: boolean;
    onClose: () => void;
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

export default function AddPatientModal({ visible, onClose }: AddPatientModalProps) {
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
                        <View>
                            <Text style={s.headerTitle}>Register New Patient</Text>
                            <Text style={s.headerSub}>Enter the patient's details to create their profile.</Text>
                        </View>
                    </View>

                    <ScrollView
                        style={s.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollInner}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ── Section 1: Personal Information ── */}
                        <Text style={s.sectionTitle}>Personal Information</Text>

                        <Text style={s.label}>Full Name <Text style={s.required}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Enter full name"
                            placeholderTextColor={doctorColors.textMuted}
                        />

                        <Text style={s.label}>Phone Number <Text style={s.required}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={doctorColors.textMuted}
                            keyboardType="phone-pad"
                        />

                        <Text style={s.label}>Date of Birth <Text style={s.required}>*</Text></Text>
                        <TextInput
                            style={s.input}
                            value={dateOfBirth}
                            onChangeText={setDateOfBirth}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={doctorColors.textMuted}
                        />

                        <Text style={s.label}>Gender</Text>
                        <View style={s.chipRow}>
                            {GENDERS.map((g) => (
                                <Pressable
                                    key={g}
                                    style={[s.chip, gender === g && s.chipActive]}
                                    onPress={() => setGender(gender === g ? '' : g)}
                                >
                                    <Text style={[s.chipText, gender === g && s.chipTextActive]}>{g}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={s.label}>Aadhar Card Number</Text>
                        <TextInput
                            style={s.input}
                            value={aadharNumber}
                            onChangeText={(t) => setAadharNumber(formatAadhar(t))}
                            placeholder="XXXX XXXX XXXX"
                            placeholderTextColor={doctorColors.textMuted}
                            keyboardType="numeric"
                            maxLength={14}
                        />

                        <Text style={s.label}>Blood Group</Text>
                        <View style={s.chipRow}>
                            {BLOOD_GROUPS.map((bg) => (
                                <Pressable
                                    key={bg}
                                    style={[s.chipSmall, bloodGroup === bg && s.chipActive]}
                                    onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                                >
                                    <Text style={[s.chipText, bloodGroup === bg && s.chipTextActive]}>{bg}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={s.label}>Address</Text>
                        <TextInput
                            style={[s.input, s.textArea]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Enter full address"
                            placeholderTextColor={doctorColors.textMuted}
                            multiline
                            numberOfLines={2}
                            textAlignVertical="top"
                        />

                        {/* ── Section 2: Emergency Contact ── */}
                        <Text style={[s.sectionTitle, { marginTop: spacing['3xl'] }]}>Emergency Contact</Text>

                        <Text style={s.label}>Contact Name</Text>
                        <TextInput
                            style={s.input}
                            value={emergencyName}
                            onChangeText={setEmergencyName}
                            placeholder="Emergency contact name"
                            placeholderTextColor={doctorColors.textMuted}
                        />

                        <Text style={s.label}>Contact Phone</Text>
                        <TextInput
                            style={s.input}
                            value={emergencyPhone}
                            onChangeText={setEmergencyPhone}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={doctorColors.textMuted}
                            keyboardType="phone-pad"
                        />

                        {/* ── Section 3: Medical History ── */}
                        <Text style={[s.sectionTitle, { marginTop: spacing['3xl'] }]}>Medical History</Text>

                        <Text style={s.label}>Known Allergies</Text>
                        <TextInput
                            style={[s.input, s.textArea]}
                            value={allergies}
                            onChangeText={setAllergies}
                            placeholder="List any known allergies (medications, food, etc.)"
                            placeholderTextColor={doctorColors.textMuted}
                            multiline
                            numberOfLines={2}
                            textAlignVertical="top"
                        />

                        <Text style={s.label}>Existing Medical Conditions</Text>
                        <TextInput
                            style={[s.input, s.textArea]}
                            value={existingConditions}
                            onChangeText={setExistingConditions}
                            placeholder="List any existing medical conditions"
                            placeholderTextColor={doctorColors.textMuted}
                            multiline
                            numberOfLines={2}
                            textAlignVertical="top"
                        />
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        <Pressable
                            style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
                            onPress={onClose}
                        >
                            <Text style={s.cancelBtnText}>Cancel</Text>
                        </Pressable>
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
                                    <Feather name="user-plus" size={16} color="#fff" />
                                    <Text style={s.submitBtnText}>Register Patient</Text>
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
        backgroundColor: doctorColors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },
    handleRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: doctorColors.border },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        gap: spacing.md,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
    },
    headerSub: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginTop: spacing.xxs,
    },

    scrollArea: { flex: 1 },
    scrollInner: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.lg,
    },
    label: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        marginBottom: spacing.sm,
    },
    required: { color: '#EF4444' },
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
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    chipSmall: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
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
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    cancelBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.border,
    },
    cancelBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: doctorColors.textSecondary,
    },
    submitBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    submitBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});
