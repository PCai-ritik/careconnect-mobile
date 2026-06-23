/**
 * CareConnect — Add Patient Bottom Sheet
 *
 * Lets caregivers add elderly family members they'll be caring for.
 * Opens as a bottom sheet modal from the FAB on the dashboard.
 *
 * Calls POST /patients — caregiver_id auto-resolved by backend.
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import {
    patientColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface Props {
    visible: boolean;
    onClose: () => void;
    onPatientAdded: () => void;
    onSubmit: (data: PatientFormData) => Promise<void>;
}

export interface PatientFormData {
    full_name: string;
    whatsapp_number: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    address?: string;
    aadhar_number?: string;
    allergies?: string[];
    existing_conditions?: string[];
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}

export default function AddPatientSheet({ visible, onClose, onPatientAdded, onSubmit }: Props) {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    // Form state
    const [fullName, setFullName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [address, setAddress] = useState('');
    const [aadharNumber, setAadharNumber] = useState('');
    const [allergies, setAllergies] = useState('');
    const [conditions, setConditions] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');

    const isValid = fullName.trim().length > 0 && whatsapp.trim().length >= 10;

    const resetForm = () => {
        setFullName('');
        setWhatsapp('');
        setDob('');
        setGender('');
        setBloodGroup('');
        setAddress('');
        setAadharNumber('');
        setAllergies('');
        setConditions('');
        setEmergencyName('');
        setEmergencyPhone('');
    };

    useEffect(() => {
        if (!visible) {
            resetForm();
        }
    }, [visible]);

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDob(selectedDate.toISOString().split('T')[0]);
        }
    };

    const handleSubmit = async () => {
        if (!isValid) return;
        setLoading(true);
        try {
            const data: PatientFormData = {
                full_name: fullName.trim(),
                whatsapp_number: whatsapp.trim(),
            };
            if (dob) data.date_of_birth = dob;
            if (gender) data.gender = gender;
            if (bloodGroup) data.blood_group = bloodGroup;
            if (address) data.address = address;
            if (aadharNumber) data.aadhar_number = aadharNumber.replace(/\s/g, '');
            if (allergies.trim()) data.allergies = allergies.split(',').map(s => s.trim()).filter(Boolean);
            if (conditions.trim()) data.existing_conditions = conditions.split(',').map(s => s.trim()).filter(Boolean);
            if (emergencyName) data.emergency_contact_name = emergencyName;
            if (emergencyPhone) data.emergency_contact_phone = emergencyPhone;

            await onSubmit(data);
            resetForm();
            onPatientAdded();
            onClose();
        } catch (e) {
            console.error('Failed to add patient:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedBottomSheet visible={visible} onClose={onClose}>
            {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIconCircle}>
                        <Feather name="user-plus" size={20} color={patientColors.primary} />
                    </View>
                    <Text style={styles.headerTitle}>Add Patient</Text>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Feather name="x" size={20} color={patientColors.textMuted} />
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Required Fields */}
                    <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>

                    <Field
                        label="Full Name *"
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="e.g. Ramesh Kumar"
                        icon="user"
                    />
                    <Field
                        label="WhatsApp Number *"
                        value={whatsapp}
                        onChangeText={setWhatsapp}
                        placeholder="+91 9876543210"
                        icon="phone"
                        keyboardType="phone-pad"
                    />
                    <Field
                        label="Date of Birth"
                        value={dob}
                        onChangeText={setDob}
                        placeholder="YYYY-MM-DD"
                        icon="calendar"
                        editable={false}
                        onPress={() => setShowDatePicker(true)}
                    />
                    
                    {showDatePicker && (
                        <DateTimePicker
                            value={dob ? new Date(dob) : new Date()}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}
                    {Platform.OS === 'ios' && showDatePicker && (
                        <Pressable 
                            style={{ alignSelf: 'flex-end', padding: 8 }} 
                            onPress={() => setShowDatePicker(false)}
                        >
                            <Text style={{ color: patientColors.primary, fontWeight: 'bold' }}>Done</Text>
                        </Pressable>
                    )}

                    {/* Gender pills */}
                    <Text style={styles.fieldLabel}>Gender</Text>
                    <View style={styles.pillRow}>
                        {GENDER_OPTIONS.map(g => (
                            <Pressable
                                key={g}
                                onPress={() => setGender(gender === g ? '' : g)}
                                style={[styles.pill, gender === g && styles.pillActive]}
                            >
                                <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>{g}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Blood group pills */}
                    <Text style={styles.fieldLabel}>Blood Group</Text>
                    <View style={styles.pillRow}>
                        {BLOOD_GROUPS.map(bg => (
                            <Pressable
                                key={bg}
                                onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                                style={[styles.pill, bloodGroup === bg && styles.pillActive]}
                            >
                                <Text style={[styles.pillText, bloodGroup === bg && styles.pillTextActive]}>{bg}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Field
                        label="Aadhar Card Number"
                        value={aadharNumber}
                        onChangeText={(t) => setAadharNumber(t.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 '))}
                        placeholder="XXXX XXXX XXXX"
                        icon="credit-card"
                    />

                    <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>MEDICAL DETAILS</Text>

                    <Field
                        label="Known Allergies"
                        value={allergies}
                        onChangeText={setAllergies}
                        placeholder="Penicillin, Sulfa (comma-separated)"
                        icon="alert-triangle"
                    />
                    <Field
                        label="Existing Conditions"
                        value={conditions}
                        onChangeText={setConditions}
                        placeholder="Diabetes, Hypertension (comma-separated)"
                        icon="heart"
                    />

                    <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>EMERGENCY CONTACT</Text>

                    <Field
                        label="Contact Name"
                        value={emergencyName}
                        onChangeText={setEmergencyName}
                        placeholder="e.g. Ananya Kumar"
                        icon="users"
                    />
                    <Field
                        label="Contact Phone"
                        value={emergencyPhone}
                        onChangeText={setEmergencyPhone}
                        placeholder="+91 9876543210"
                        icon="phone"
                        keyboardType="phone-pad"
                    />

                    <Field
                        label="Address"
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Full address"
                        icon="map-pin"
                        multiline
                    />

                    {/* Submit */}
                    <Pressable
                        style={[styles.submitBtn, (!isValid || loading) && { opacity: 0.5 }]}
                        disabled={!isValid || loading}
                        onPress={handleSubmit}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Feather name="user-plus" size={18} color="#FFFFFF" />
                                <Text style={styles.submitText}>Add Patient</Text>
                            </>
                        )}
                    </Pressable>

                    <View style={{ height: spacing['3xl'] }} />
                </ScrollView>
        </ThemedBottomSheet>
    );
}

// ─── Reusable Field ─────────────────────────────────────────────────────────

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    keyboardType,
    multiline,
    onPress,
    editable = true,
}: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    icon: FeatherIcon;
    keyboardType?: 'default' | 'phone-pad' | 'email-address';
    multiline?: boolean;
    onPress?: () => void;
    editable?: boolean;
}) {
    const inputContent = (
        <View style={styles.inputRow}>
            <Feather name={icon} size={16} color={patientColors.textMuted} />
            <TextInput
                style={[styles.input, multiline && { minHeight: 60, textAlignVertical: 'top' }, !editable && { color: patientColors.textPrimary }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={patientColors.textMuted}
                keyboardType={keyboardType ?? 'default'}
                multiline={multiline}
                editable={editable}
                pointerEvents={editable ? 'auto' : 'none'}
            />
        </View>
    );

    return (
        <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {onPress ? (
                <Pressable onPress={onPress}>
                    {inputContent}
                </Pressable>
            ) : (
                inputContent
            )}
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        gap: spacing.md,
    },
    headerIconCircle: {
        width: 36, height: 36, borderRadius: radii.full,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontFamily: typography.fontFamily.bold, ...typography.size.lg,
        color: patientColors.textPrimary,
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: radii.full,
        backgroundColor: patientColors.surfaceMuted,
        alignItems: 'center', justifyContent: 'center',
    },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

    sectionLabel: {
        fontFamily: typography.fontFamily.semiBold, fontSize: 11,
        color: patientColors.textMuted, letterSpacing: 1,
        marginBottom: spacing.md, marginTop: spacing.sm,
    },
    fieldGroup: { marginBottom: spacing.md },
    fieldLabel: {
        fontFamily: typography.fontFamily.medium, ...typography.size.sm,
        color: patientColors.textSecondary, marginBottom: spacing.xs,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: patientColors.surfaceMuted,
        borderRadius: radii.md, paddingHorizontal: spacing.md,
        gap: spacing.sm, borderWidth: 1, borderColor: patientColors.borderLight,
    },
    input: {
        flex: 1, paddingVertical: spacing.md,
        fontFamily: typography.fontFamily.regular, ...typography.size.base,
        color: patientColors.textPrimary,
    },

    pillRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
        marginBottom: spacing.md,
    },
    pill: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: radii.full, borderWidth: 1,
        borderColor: patientColors.borderLight, backgroundColor: patientColors.surfaceMuted,
    },
    pillActive: {
        backgroundColor: patientColors.primary, borderColor: patientColors.primary,
    },
    pillText: {
        fontFamily: typography.fontFamily.medium, ...typography.size.sm,
        color: patientColors.textSecondary,
    },
    pillTextActive: { color: '#FFFFFF' },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, backgroundColor: patientColors.primary,
        paddingVertical: spacing.lg, borderRadius: radii.md,
        marginTop: spacing.xl,
    },
    submitText: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base,
        color: '#FFFFFF',
    },
});
