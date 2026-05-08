/**
 * CareConnect — Patient Chart Bottom Sheet
 *
 * Shows patient details with an edit toggle. Caregivers can view and
 * update their linked patients' profiles.
 *
 * View mode: read-only labeled rows
 * Edit mode: fields become editable, save → PATCH /patients/{id}
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
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
    patientColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import type { PatientProfile } from '@/services/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];

interface Props {
    visible: boolean;
    patient: PatientProfile | null;
    onClose: () => void;
    onSave: (patientId: string, data: Record<string, unknown>) => Promise<void>;
}

export default function PatientChartSheet({ visible, patient, onClose, onSave }: Props) {
    const insets = useSafeAreaInsets();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [fullName, setFullName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [address, setAddress] = useState('');
    const [allergies, setAllergies] = useState('');
    const [conditions, setConditions] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');

    // Reset form when patient changes
    useEffect(() => {
        if (patient) {
            setFullName(patient.full_name);
            setWhatsapp(patient.whatsapp_number);
            setDob(patient.date_of_birth ?? '');
            setGender(patient.gender ?? '');
            setBloodGroup(patient.blood_group ?? '');
            setAddress(patient.address ?? '');
            setAllergies(patient.allergies?.join(', ') ?? '');
            setConditions(patient.existing_conditions?.join(', ') ?? '');
            setEmergencyName(patient.emergency_contact_name ?? '');
            setEmergencyPhone(patient.emergency_contact_phone ?? '');
            setEditing(false);
        }
    }, [patient]);

    const handleSave = async () => {
        if (!patient) return;
        setSaving(true);
        try {
            const data: Record<string, unknown> = {};
            if (fullName !== patient.full_name) data.full_name = fullName;
            if (whatsapp !== patient.whatsapp_number) data.whatsapp_number = whatsapp;
            if (dob !== (patient.date_of_birth ?? '')) data.date_of_birth = dob || null;
            if (gender !== (patient.gender ?? '')) data.gender = gender || null;
            if (bloodGroup !== (patient.blood_group ?? '')) data.blood_group = bloodGroup || null;
            if (address !== (patient.address ?? '')) data.address = address || null;

            const newAllergies = allergies.split(',').map(s => s.trim()).filter(Boolean);
            if (JSON.stringify(newAllergies) !== JSON.stringify(patient.allergies ?? [])) {
                data.allergies = newAllergies;
            }
            const newConditions = conditions.split(',').map(s => s.trim()).filter(Boolean);
            if (JSON.stringify(newConditions) !== JSON.stringify(patient.existing_conditions ?? [])) {
                data.existing_conditions = newConditions;
            }
            if (emergencyName !== (patient.emergency_contact_name ?? '')) data.emergency_contact_name = emergencyName || null;
            if (emergencyPhone !== (patient.emergency_contact_phone ?? '')) data.emergency_contact_phone = emergencyPhone || null;

            if (Object.keys(data).length > 0) {
                await onSave(patient.id, data);
            }
            setEditing(false);
        } catch (e) {
            console.error('Failed to save patient:', e);
        } finally {
            setSaving(false);
        }
    };

    if (!patient) return null;

    const age = patient.date_of_birth
        ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}><View /></Pressable>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.sheet, { paddingBottom: insets.bottom }]}
            >
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                            {patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{patient.full_name}</Text>
                        <Text style={styles.headerMeta}>
                            {age ? `${age} years` : ''}{age && patient.gender ? ' • ' : ''}{patient.gender ?? ''}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => editing ? handleSave() : setEditing(true)}
                        style={[styles.editBtn, editing && styles.editBtnActive]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Feather name={editing ? 'check' : 'edit-2'} size={16} color={editing ? '#FFFFFF' : patientColors.primary} />
                                <Text style={[styles.editBtnText, editing && styles.editBtnTextActive]}>
                                    {editing ? 'Save' : 'Edit'}
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Quick stats */}
                    <View style={styles.statsRow}>
                        <StatPill icon="droplet" label="Blood" value={patient.blood_group ?? '—'} color="#EF4444" />
                        <StatPill icon="phone" label="WhatsApp" value={patient.whatsapp_number} color="#22C55E" />
                    </View>

                    {/* Detail sections */}
                    <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>

                    {editing ? (
                        <>
                            <EditField label="Full Name" value={fullName} onChangeText={setFullName} icon="user" />
                            <EditField label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} icon="phone" keyboardType="phone-pad" />
                            <EditField label="Date of Birth" value={dob} onChangeText={setDob} icon="calendar" placeholder="YYYY-MM-DD" />

                            <Text style={styles.fieldLabel}>Gender</Text>
                            <View style={styles.pillRow}>
                                {GENDER_OPTIONS.map(g => (
                                    <Pressable key={g} onPress={() => setGender(gender === g ? '' : g)}
                                        style={[styles.pill, gender === g && styles.pillActive]}>
                                        <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>{g}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>Blood Group</Text>
                            <View style={styles.pillRow}>
                                {BLOOD_GROUPS.map(bg => (
                                    <Pressable key={bg} onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                                        style={[styles.pill, bloodGroup === bg && styles.pillActive]}>
                                        <Text style={[styles.pillText, bloodGroup === bg && styles.pillTextActive]}>{bg}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <EditField label="Address" value={address} onChangeText={setAddress} icon="map-pin" multiline />
                        </>
                    ) : (
                        <>
                            <DetailRow icon="calendar" label="Date of Birth" value={patient.date_of_birth ?? '—'} />
                            <DetailRow icon="user" label="Gender" value={patient.gender ?? '—'} />
                            <DetailRow icon="map-pin" label="Address" value={patient.address ?? '—'} />
                        </>
                    )}

                    <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>MEDICAL DETAILS</Text>

                    {editing ? (
                        <>
                            <EditField label="Allergies" value={allergies} onChangeText={setAllergies} icon="alert-triangle" placeholder="Comma-separated" />
                            <EditField label="Existing Conditions" value={conditions} onChangeText={setConditions} icon="heart" placeholder="Comma-separated" />
                        </>
                    ) : (
                        <>
                            <DetailRow icon="alert-triangle" label="Allergies" value={patient.allergies?.join(', ') || '—'} />
                            <DetailRow icon="heart" label="Conditions" value={patient.existing_conditions?.join(', ') || '—'} />
                        </>
                    )}

                    <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>EMERGENCY CONTACT</Text>

                    {editing ? (
                        <>
                            <EditField label="Contact Name" value={emergencyName} onChangeText={setEmergencyName} icon="users" />
                            <EditField label="Contact Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} icon="phone" keyboardType="phone-pad" />
                        </>
                    ) : (
                        <>
                            <DetailRow icon="users" label="Name" value={patient.emergency_contact_name ?? '—'} />
                            <DetailRow icon="phone" label="Phone" value={patient.emergency_contact_phone ?? '—'} />
                        </>
                    )}

                    <View style={{ height: spacing['3xl'] }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: { icon: FeatherIcon; label: string; value: string; color: string }) {
    return (
        <View style={styles.statPill}>
            <Feather name={icon} size={14} color={color} />
            <View>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
            </View>
        </View>
    );
}

function DetailRow({ icon, label, value }: { icon: FeatherIcon; label: string; value: string }) {
    return (
        <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
                <Feather name={icon} size={14} color={patientColors.textMuted} />
            </View>
            <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
            </View>
        </View>
    );
}

function EditField({
    label, value, onChangeText, icon, placeholder, keyboardType, multiline,
}: {
    label: string; value: string; onChangeText: (t: string) => void;
    icon: FeatherIcon; placeholder?: string; keyboardType?: 'default' | 'phone-pad'; multiline?: boolean;
}) {
    return (
        <View style={styles.editFieldGroup}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.editInputRow}>
                <Feather name={icon} size={14} color={patientColors.textMuted} />
                <TextInput
                    style={[styles.editInput, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder ?? label}
                    placeholderTextColor={patientColors.textMuted}
                    keyboardType={keyboardType ?? 'default'}
                    multiline={multiline}
                />
            </View>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT, backgroundColor: patientColors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        ...shadows.elevated,
    },
    handleBar: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: patientColors.border, alignSelf: 'center',
        marginTop: spacing.sm,
    },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        gap: spacing.md,
    },
    avatarCircle: {
        width: 48, height: 48, borderRadius: radii.full,
        backgroundColor: patientColors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: {
        fontFamily: typography.fontFamily.bold, ...typography.size.lg,
        color: patientColors.primary,
    },
    headerInfo: { flex: 1 },
    headerName: {
        fontFamily: typography.fontFamily.bold, ...typography.size.lg,
        color: patientColors.textPrimary,
    },
    headerMeta: {
        fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: patientColors.textMuted,
    },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: radii.full, borderWidth: 1,
        borderColor: patientColors.primary,
    },
    editBtnActive: {
        backgroundColor: patientColors.primary, borderColor: patientColors.primary,
    },
    editBtnText: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.sm,
        color: patientColors.primary,
    },
    editBtnTextActive: { color: '#FFFFFF' },

    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

    // Stats
    statsRow: {
        flexDirection: 'row', gap: spacing.md,
        marginBottom: spacing.xl,
    },
    statPill: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: patientColors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.md, borderWidth: 1, borderColor: patientColors.borderLight,
    },
    statLabel: {
        fontFamily: typography.fontFamily.regular, fontSize: 10,
        color: patientColors.textMuted, textTransform: 'uppercase',
    },
    statValue: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.sm,
        color: patientColors.textPrimary,
    },

    // Section label
    sectionLabel: {
        fontFamily: typography.fontFamily.semiBold, fontSize: 11,
        color: patientColors.textMuted, letterSpacing: 1,
        marginBottom: spacing.md,
    },

    // Detail rows (view mode)
    detailRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
        marginBottom: spacing.md,
    },
    detailIcon: {
        width: 28, height: 28, borderRadius: radii.full,
        backgroundColor: patientColors.surfaceMuted,
        alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    detailContent: { flex: 1 },
    detailLabel: {
        fontFamily: typography.fontFamily.regular, ...typography.size.xs,
        color: patientColors.textMuted, marginBottom: 2,
    },
    detailValue: {
        fontFamily: typography.fontFamily.medium, ...typography.size.base,
        color: patientColors.textPrimary,
    },

    // Edit fields
    editFieldGroup: { marginBottom: spacing.md },
    fieldLabel: {
        fontFamily: typography.fontFamily.medium, ...typography.size.sm,
        color: patientColors.textSecondary, marginBottom: spacing.xs,
    },
    editInputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: patientColors.surfaceMuted,
        borderRadius: radii.md, paddingHorizontal: spacing.md,
        gap: spacing.sm, borderWidth: 1, borderColor: patientColors.borderLight,
    },
    editInput: {
        flex: 1, paddingVertical: spacing.md,
        fontFamily: typography.fontFamily.regular, ...typography.size.base,
        color: patientColors.textPrimary,
    },

    // Pills (edit mode)
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
});
