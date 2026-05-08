/**
 * CareConnect — New Prescription Modal (Doctor-Facing)
 *
 * 1:1 adaptation of the web NewPrescriptionSheet.tsx.
 * Two-tab layout: "Edit Form" and "Live Preview" (Rx paper pad).
 * Wired to POST /medical-records with structured vitals.
 */

import { useState, useEffect, useCallback } from 'react';
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
    Alert,
    Linking,
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
import { getDoctorProfile, createMedicalRecord, createAppointment, getAvailableSlots, getMe } from '@/services/doctor';
import { ApiError } from '@/services/api';
import type { DoctorProfile, AvailableSlot } from '@/services/types';
import ThemedAlert from '@/components/doctor/ThemedAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
}

interface Vitals {
    bp: string;
    pulse: string;
    temp: string;
    weight: string;
}

interface NewPrescriptionModalProps {
    visible: boolean;
    onClose: () => void;
    patientId?: string;
    patientName?: string;
    patientAge?: string;
    patientGender?: string;
    onPrescriptionCreated?: () => void;
}

type TabId = 'edit' | 'preview';

const emptyVitals: Vitals = { bp: '', pulse: '', temp: '', weight: '' };

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (): string => {
    const d = new Date();
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const emptyMedication = (): Medication => ({
    id: Date.now().toString(),
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
});

// ─── Sub-Components ─────────────────────────────────────────────────────────

function FormField({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
}: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    multiline?: boolean;
}) {
    return (
        <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>{label}</Text>
            <TextInput
                style={[s.input, multiline && s.inputMultiline]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={doctorColors.textMuted}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
        </View>
    );
}

function SmallField({
    label,
    value,
    onChangeText,
    placeholder,
}: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
}) {
    return (
        <View style={s.smallFieldGroup}>
            <Text style={s.fieldLabel}>{label}</Text>
            <TextInput
                style={s.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={doctorColors.textMuted}
            />
        </View>
    );
}

// ─── Edit Form Tab ────────────────────────────────────────────────────────

function EditFormTab({
    formData,
    setFormData,
    vitals,
    setVitals,
    medications,
    setMedications,
}: {
    formData: Record<string, string>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    vitals: Vitals;
    setVitals: React.Dispatch<React.SetStateAction<Vitals>>;
    medications: Medication[];
    setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
}) {
    const updateField = (key: string) => (value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const updateMedField = (id: string, field: keyof Medication) => (value: string) => {
        setMedications((prev) =>
            prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
        );
    };

    const addMedication = () => {
        setMedications((prev) => [...prev, emptyMedication()]);
    };

    const removeMedication = (id: string) => {
        if (medications.length > 1) {
            setMedications((prev) => prev.filter((m) => m.id !== id));
        }
    };

    return (
        <ScrollView
            style={s.tabScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.tabScrollInner}
            keyboardShouldPersistTaps="handled"
        >
            {/* Patient Details */}
            <Text style={s.sectionLabel}>Patient Details</Text>
            <View style={s.tripleRow}>
                <SmallField
                    label="Patient Name"
                    value={formData.patientName}
                    onChangeText={updateField('patientName')}
                    placeholder="Full name"
                />
                <SmallField
                    label="Age"
                    value={formData.patientAge}
                    onChangeText={updateField('patientAge')}
                    placeholder="Age"
                />
                <SmallField
                    label="Gender"
                    value={formData.patientGender}
                    onChangeText={updateField('patientGender')}
                    placeholder="M/F/O"
                />
            </View>

            <FormField
                label="Chief Complaints"
                value={formData.chiefComplaints}
                onChangeText={updateField('chiefComplaints')}
                placeholder="Patient's main complaints"
                multiline
            />

            {/* Vitals — 4-field grid matching web dashboard */}
            <Text style={s.fieldLabel}>Vitals</Text>
            <View style={s.vitalsRow}>
                <View style={s.vitalField}>
                    <Text style={s.vitalLabel}>BP (mmHg)</Text>
                    <TextInput
                        style={s.input}
                        value={vitals.bp}
                        onChangeText={(v) => setVitals(prev => ({ ...prev, bp: v }))}
                        placeholder="120/80"
                        placeholderTextColor={doctorColors.textMuted}
                    />
                </View>
                <View style={s.vitalField}>
                    <Text style={s.vitalLabel}>Pulse (bpm)</Text>
                    <TextInput
                        style={s.input}
                        value={vitals.pulse}
                        onChangeText={(v) => setVitals(prev => ({ ...prev, pulse: v }))}
                        placeholder="72"
                        placeholderTextColor={doctorColors.textMuted}
                        keyboardType="numeric"
                    />
                </View>
                <View style={s.vitalField}>
                    <Text style={s.vitalLabel}>Temp (°F)</Text>
                    <TextInput
                        style={s.input}
                        value={vitals.temp}
                        onChangeText={(v) => setVitals(prev => ({ ...prev, temp: v }))}
                        placeholder="98.6"
                        placeholderTextColor={doctorColors.textMuted}
                        keyboardType="numeric"
                    />
                </View>
                <View style={s.vitalField}>
                    <Text style={s.vitalLabel}>Weight (kg)</Text>
                    <TextInput
                        style={s.input}
                        value={vitals.weight}
                        onChangeText={(v) => setVitals(prev => ({ ...prev, weight: v }))}
                        placeholder="70"
                        placeholderTextColor={doctorColors.textMuted}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <FormField
                label="Diagnosis"
                value={formData.diagnosis}
                onChangeText={updateField('diagnosis')}
                placeholder="Clinical diagnosis"
                multiline
            />

            <View style={s.separator} />

            {/* Medications */}
            <View style={s.medsHeader}>
                <Text style={s.sectionLabel}>Medications</Text>
                <Pressable
                    onPress={addMedication}
                    style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.7 }]}
                >
                    <Feather name="plus" size={14} color={doctorColors.primary} />
                    <Text style={s.addBtnText}>Add</Text>
                </Pressable>
            </View>

            {medications.map((med, index) => (
                <View key={med.id} style={s.medCard}>
                    <View style={s.medCardHeader}>
                        <Text style={s.medCardTitle}>Medicine {index + 1}</Text>
                        {medications.length > 1 && (
                            <Pressable
                                onPress={() => removeMedication(med.id)}
                                hitSlop={8}
                            >
                                <Feather name="trash-2" size={16} color={doctorColors.error} />
                            </Pressable>
                        )}
                    </View>
                    <View style={s.medGrid}>
                        <TextInput
                            style={[s.input, s.medGridItem]}
                            value={med.name}
                            onChangeText={updateMedField(med.id, 'name')}
                            placeholder="Medicine name"
                            placeholderTextColor={doctorColors.textMuted}
                        />
                        <TextInput
                            style={[s.input, s.medGridItem]}
                            value={med.dosage}
                            onChangeText={updateMedField(med.id, 'dosage')}
                            placeholder="Dosage (e.g., 500mg)"
                            placeholderTextColor={doctorColors.textMuted}
                        />
                        <TextInput
                            style={[s.input, s.medGridItem]}
                            value={med.frequency}
                            onChangeText={updateMedField(med.id, 'frequency')}
                            placeholder="Frequency (e.g., 1-0-1)"
                            placeholderTextColor={doctorColors.textMuted}
                        />
                        <TextInput
                            style={[s.input, s.medGridItem]}
                            value={med.duration}
                            onChangeText={updateMedField(med.id, 'duration')}
                            placeholder="Duration (e.g., 5 days)"
                            placeholderTextColor={doctorColors.textMuted}
                        />
                    </View>
                    <TextInput
                        style={s.input}
                        value={med.instructions}
                        onChangeText={updateMedField(med.id, 'instructions')}
                        placeholder="Special instructions (e.g., after meals)"
                        placeholderTextColor={doctorColors.textMuted}
                    />
                </View>
            ))}

            <View style={s.separator} />

            <FormField
                label="General Advice"
                value={formData.advice}
                onChangeText={updateField('advice')}
                placeholder="Diet, rest, precautions, etc."
                multiline
            />

            <FormField
                label="Follow-up Date"
                value={formData.followUpDate}
                onChangeText={updateField('followUpDate')}
                placeholder="YYYY-MM-DD (e.g., 2026-05-15)"
            />

            {/* Time Picker — shows when a valid follow-up date is entered */}
            {/^\d{4}-\d{2}-\d{2}$/.test(formData.followUpDate) && !isNaN(Date.parse(formData.followUpDate)) && (
                <FollowUpTimePicker
                    value={formData.followUpTime || '09:00'}
                    onChange={(val: string) => setFormData((prev) => ({ ...prev, followUpTime: val }))}
                />
            )}
        </ScrollView>
    );
}

// ─── Preview Tab (Rx Paper Pad) ─────────────────────────────────────────────

function PreviewTab({
    formData,
    vitals,
    medications,
    doctorProfile,
}: {
    formData: Record<string, string>;
    vitals: Vitals;
    medications: Medication[];
    doctorProfile: DoctorProfile | null;
}) {
    const filledMeds = medications.filter((m) => m.name.trim());
    const currentDate = formatDate();
    const doctorName = doctorProfile?.full_name ?? 'Doctor';
    const doctorSpec = doctorProfile?.specialization ?? '';
    const doctorLicense = doctorProfile?.license_number ?? '';
    const doctorPhone = doctorProfile?.phone_number ?? '';
    const doctorLabel = [doctorSpec, doctorLicense ? `Reg No: ${doctorLicense}` : ''].filter(Boolean).join(' • ');

    const hasVitals = vitals.bp || vitals.pulse || vitals.temp || vitals.weight;
    const vitalsStr = [
        vitals.bp && `BP: ${vitals.bp}`,
        vitals.pulse && `Pulse: ${vitals.pulse}`,
        vitals.temp && `Temp: ${vitals.temp}`,
        vitals.weight && `Weight: ${vitals.weight}`,
    ].filter(Boolean).join(', ');

    return (
        <ScrollView
            style={s.tabScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.tabScrollInner}
        >
            <View style={s.paper}>
                {/* Doctor Header */}
                <View style={s.paperHeader}>
                    <Text style={s.paperDoctorName}>{doctorName}</Text>
                    <Text style={s.paperSubtext}>{doctorLabel}</Text>
                    {doctorPhone ? <Text style={s.paperSubtext}>Tel: {doctorPhone}</Text> : null}
                </View>

                {/* Patient Info Bar */}
                <View style={s.paperPatientBar}>
                    <Text style={s.paperSmall}>
                        <Text style={s.paperBold}>Patient: </Text>
                        {formData.patientName || '—'}
                    </Text>
                    <Text style={s.paperSmall}>
                        <Text style={s.paperBold}>Age: </Text>
                        {formData.patientAge || '—'}
                    </Text>
                    <Text style={s.paperSmall}>
                        <Text style={s.paperBold}>Gender: </Text>
                        {formData.patientGender || '—'}
                    </Text>
                </View>

                {/* Date */}
                <Text style={[s.paperSmall, { marginBottom: spacing.lg }]}>
                    <Text style={s.paperBold}>Date: </Text>{currentDate}
                </Text>

                {/* Chief Complaints & Vitals */}
                {(formData.chiefComplaints || hasVitals) ? (
                    <View style={{ marginBottom: spacing.lg }}>
                        {formData.chiefComplaints ? (
                            <Text style={s.paperSmall}>
                                <Text style={s.paperBold}>C/C: </Text>
                                {formData.chiefComplaints}
                            </Text>
                        ) : null}
                        {hasVitals ? (
                            <Text style={[s.paperSmall, { marginTop: spacing.xxs }]}>
                                <Text style={s.paperBold}>Vitals: </Text>
                                {vitalsStr}
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                {/* Diagnosis */}
                {formData.diagnosis ? (
                    <Text style={[s.paperSmall, { marginBottom: spacing.lg }]}>
                        <Text style={s.paperBold}>Diagnosis: </Text>
                        {formData.diagnosis}
                    </Text>
                ) : null}

                {/* Rx Symbol */}
                <Text style={s.rxSymbol}>℞</Text>

                {/* Medications Table */}
                {filledMeds.length > 0 && (
                    <View style={s.medTable}>
                        {/* Table header */}
                        <View style={[s.medTableRow, s.medTableHeaderRow]}>
                            <Text style={[s.medTableCell, s.medTableNumCol, s.medTableHeaderText]}>#</Text>
                            <Text style={[s.medTableCell, s.medTableNameCol, s.medTableHeaderText]}>Medicine</Text>
                            <Text style={[s.medTableCell, s.medTableCol, s.medTableHeaderText]}>Dosage</Text>
                            <Text style={[s.medTableCell, s.medTableCol, s.medTableHeaderText]}>Freq.</Text>
                            <Text style={[s.medTableCell, s.medTableCol, s.medTableHeaderText]}>Duration</Text>
                        </View>
                        {/* Table body */}
                        {filledMeds.map((med, idx) => (
                            <View key={med.id} style={s.medTableRow}>
                                <Text style={[s.medTableCell, s.medTableNumCol]}>{idx + 1}</Text>
                                <View style={[s.medTableNameCol]}>
                                    <Text style={s.medTableCell}>{med.name}</Text>
                                    {med.instructions ? (
                                        <Text style={s.medTableInstructions}>({med.instructions})</Text>
                                    ) : null}
                                </View>
                                <Text style={[s.medTableCell, s.medTableCol]}>{med.dosage}</Text>
                                <Text style={[s.medTableCell, s.medTableCol]}>{med.frequency}</Text>
                                <Text style={[s.medTableCell, s.medTableCol]}>{med.duration}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Advice */}
                {formData.advice ? (
                    <Text style={[s.paperSmall, { marginTop: spacing.lg }]}>
                        <Text style={s.paperBold}>Advice: </Text>
                        {formData.advice}
                    </Text>
                ) : null}

                {/* Follow-up */}
                {formData.followUpDate ? (
                    <Text style={[s.paperSmall, { marginTop: spacing.sm }]}>
                        <Text style={s.paperBold}>Follow-up: </Text>
                        {formData.followUpDate}
                    </Text>
                ) : null}

                {/* Signature */}
                <View style={s.signatureBlock}>
                    <View style={s.signatureLine} />
                    <Text style={s.signatureName}>{doctorName}</Text>
                    <Text style={s.signatureQual}>{doctorLabel}</Text>
                </View>

                {/* Disclaimer */}
                <View style={s.paperFooter}>
                    <Text style={s.paperDisclaimer}>
                        This prescription is digitally generated. Valid for 30 days from issue date.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

// ─── Follow-Up Time Picker ──────────────────────────────────────────────────

function FollowUpTimePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [hours, minutes] = value.split(':').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');

    const setH = (h: number) => {
        const clamped = ((h % 24) + 24) % 24;
        onChange(`${pad(clamped)}:${pad(minutes)}`);
    };
    const setM = (m: number) => {
        const clamped = ((m % 60) + 60) % 60;
        onChange(`${pad(hours)}:${pad(clamped)}`);
    };

    return (
        <View style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
            <Text style={[s.fieldLabel, { marginBottom: spacing.sm }]}>Follow-up Time</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {/* Hours */}
                <View style={{ alignItems: 'center' }}>
                    <Pressable onPress={() => setH(hours + 1)} hitSlop={6}>
                        <Feather name="chevron-up" size={18} color={doctorColors.textMuted} />
                    </Pressable>
                    <View style={timePickerStyles.cell}>
                        <Text style={timePickerStyles.cellText}>{pad(hours)}</Text>
                    </View>
                    <Pressable onPress={() => setH(hours - 1)} hitSlop={6}>
                        <Feather name="chevron-down" size={18} color={doctorColors.textMuted} />
                    </Pressable>
                </View>

                <Text style={{ fontFamily: typography.fontFamily.bold, fontSize: 18, color: doctorColors.textMuted }}>:</Text>

                {/* Minutes */}
                <View style={{ alignItems: 'center' }}>
                    <Pressable onPress={() => setM(minutes + 1)} hitSlop={6}>
                        <Feather name="chevron-up" size={18} color={doctorColors.textMuted} />
                    </Pressable>
                    <View style={timePickerStyles.cell}>
                        <Text style={timePickerStyles.cellText}>{pad(minutes)}</Text>
                    </View>
                    <Pressable onPress={() => setM(minutes - 1)} hitSlop={6}>
                        <Feather name="chevron-down" size={18} color={doctorColors.textMuted} />
                    </Pressable>
                </View>

                <Text style={{ fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: doctorColors.textMuted, marginLeft: spacing.xs }}>hrs</Text>
            </View>
        </View>
    );
}

const timePickerStyles = StyleSheet.create({
    cell: {
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
        borderRadius: radii.sm,
        paddingVertical: spacing.sm,
        backgroundColor: doctorColors.surface,
    },
    cellText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
});

// ─── Slot Picker Overlay (conflict resolution) ──────────────────────────────

function SlotPickerOverlay({
    date,
    slots,
    loading,
    onSelect,
    onSkip,
}: {
    date: string;
    slots: AvailableSlot[];
    loading: boolean;
    onSelect: (slot: AvailableSlot) => void;
    onSkip: () => void;
}) {
    const [selected, setSelected] = useState<string | null>(null);

    const fmtDate = new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
        <Modal transparent animationType="fade" visible>
            <View style={slotStyles.overlay}>
                <View style={slotStyles.card}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
                        <View style={slotStyles.warningIcon}>
                            <Feather name="alert-circle" size={20} color="#D97706" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={slotStyles.title}>Time Slot Unavailable</Text>
                            <Text style={slotStyles.subtitle}>The selected time is already booked</Text>
                        </View>
                    </View>

                    {/* Date badge */}
                    <View style={slotStyles.dateBadge}>
                        <Feather name="calendar" size={14} color={doctorColors.textMuted} />
                        <Text style={slotStyles.dateText}>{fmtDate}</Text>
                    </View>

                    {/* Slots */}
                    {loading ? (
                        <View style={{ paddingVertical: spacing['4xl'], alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={doctorColors.primary} />
                            <Text style={{ color: doctorColors.textMuted, marginTop: spacing.sm, ...typography.size.sm }}>Loading available slots…</Text>
                        </View>
                    ) : slots.length === 0 ? (
                        <View style={{ paddingVertical: spacing['4xl'], alignItems: 'center' }}>
                            <Feather name="clock" size={28} color={doctorColors.borderLight} />
                            <Text style={{ color: doctorColors.textMuted, marginTop: spacing.sm, ...typography.size.sm }}>No available slots on this day.</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={{ ...typography.size.xs, fontFamily: typography.fontFamily.medium, color: doctorColors.textMuted, marginBottom: spacing.sm }}>Available Slots</Text>
                            <View style={slotStyles.grid}>
                                {slots.map((slot) => (
                                    <Pressable
                                        key={slot.start_time}
                                        onPress={() => setSelected(slot.start_time)}
                                        style={[
                                            slotStyles.slotBtn,
                                            selected === slot.start_time && slotStyles.slotBtnActive,
                                        ]}
                                    >
                                        <Text style={[
                                            slotStyles.slotText,
                                            selected === slot.start_time && slotStyles.slotTextActive,
                                        ]}>{slot.start_time}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
                        <Pressable onPress={onSkip} style={({ pressed }) => [slotStyles.skipBtn, pressed && { opacity: 0.7 }]}>
                            <Text style={slotStyles.skipText}>Skip</Text>
                        </Pressable>
                        {slots.length > 0 && (
                            <Pressable
                                onPress={() => {
                                    const slot = slots.find((sl) => sl.start_time === selected);
                                    if (slot) onSelect(slot);
                                }}
                                disabled={!selected}
                                style={({ pressed }) => [
                                    slotStyles.bookBtn,
                                    !selected && { opacity: 0.4 },
                                    pressed && { opacity: 0.7 },
                                ]}
                            >
                                <Feather name="calendar" size={14} color="#fff" />
                                <Text style={slotStyles.bookText}>Book Follow-Up</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const slotStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    card: { backgroundColor: '#fff', borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 400, ...shadows.elevated },
    warningIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: typography.fontFamily.bold, ...typography.size.base, color: doctorColors.textPrimary },
    subtitle: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: doctorColors.textMuted },
    dateBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: doctorColors.surfaceMuted, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginVertical: spacing.md },
    dateText: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: doctorColors.textSecondary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    slotBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: doctorColors.borderLight, backgroundColor: '#fff' },
    slotBtnActive: { backgroundColor: doctorColors.primary, borderColor: doctorColors.primary },
    slotText: { fontFamily: typography.fontFamily.medium, ...typography.size.xs, color: doctorColors.textPrimary },
    slotTextActive: { color: '#fff' },
    skipBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: doctorColors.borderLight, alignItems: 'center' },
    skipText: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: doctorColors.textPrimary },
    bookBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: doctorColors.primary },
    bookText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: '#fff' },
});

// ─── Main Component ───────────────────────────────────────────────────

export default function NewPrescriptionModal({
    visible,
    onClose,
    patientId,
    patientName = '',
    patientAge = '',
    patientGender = '',
    onPrescriptionCreated,
}: NewPrescriptionModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('edit');
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showSlotPicker, setShowSlotPicker] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [followUpBooked, setFollowUpBooked] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({
        patientName,
        patientAge,
        patientGender,
        diagnosis: '',
        chiefComplaints: '',
        advice: '',
        followUpDate: '',
        followUpTime: '09:00',
    });
    const [vitals, setVitals] = useState<Vitals>({ ...emptyVitals });
    const [medications, setMedications] = useState<Medication[]>([emptyMedication()]);

    // Fetch doctor profile on open
    useEffect(() => {
        if (visible && token) {
            getDoctorProfile(token).then(setDoctorProfile).catch(() => { });
        }
        if (visible) {
            setShowSuccess(false);
            setActiveTab('edit');
            setShowSlotPicker(false);
            setAvailableSlots([]);
            setFollowUpBooked(false);
        }
    }, [visible, token]);

    // Reset form when patient changes
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            patientName,
            patientAge,
            patientGender,
        }));
    }, [patientName, patientAge, patientGender]);

    const handleSaveAndSend = useCallback(async () => {
        if (!formData.diagnosis.trim()) {
            Alert.alert('Required', 'Please enter a diagnosis before saving.');
            return;
        }

        // 1. Save to backend if linked to a patient
        if (patientId && doctorProfile && token) {
            setIsSaving(true);
            try {
                const hasVitals = vitals.bp || vitals.pulse || vitals.temp || vitals.weight;
                await createMedicalRecord(token, {
                    patient_id: patientId,
                    doctor_id: doctorProfile.id,
                    diagnosis: formData.diagnosis,
                    symptoms: formData.chiefComplaints || null,
                    treatment: formData.advice || null,
                    follow_up_date: (/^\d{4}-\d{2}-\d{2}$/.test(formData.followUpDate) && !isNaN(Date.parse(formData.followUpDate))) ? formData.followUpDate : null,
                    vitals: hasVitals ? { bp: vitals.bp, pulse: vitals.pulse, temp: vitals.temp, weight: vitals.weight } as Record<string, string> : null,
                    prescriptions: medications
                        .filter(m => m.name.trim())
                        .map(m => ({
                            medication_name: m.name,
                            dosage: m.dosage || null,
                            frequency: m.frequency || null,
                            duration: m.duration || null,
                            notes: m.instructions || null,
                        })),
                });

                // ── Follow-up appointment creation ──
                const validDate = /^\d{4}-\d{2}-\d{2}$/.test(formData.followUpDate) && !isNaN(Date.parse(formData.followUpDate));
                if (validDate && formData.followUpTime) {
                    try {
                        const me = await getMe(token);
                        const hospitalId = me?.hospital_id;
                        if (hospitalId) {
                            const scheduledTime = new Date(
                                `${formData.followUpDate}T${formData.followUpTime}:00`
                            ).toISOString();

                            await createAppointment(token, {
                                doctor_id: doctorProfile.id,
                                patient_id: patientId,
                                hospital_id: hospitalId,
                                scheduled_time: scheduledTime,
                                duration_minutes: 15,
                                appointment_type: 'FOLLOW_UP',
                                reason: `Follow-up: ${formData.diagnosis}`,
                            });
                            setFollowUpBooked(true);
                        }
                    } catch (followUpErr: any) {
                        // 409 = slot conflict → show slot picker
                        if (followUpErr instanceof ApiError && followUpErr.status === 409) {
                            setSlotsLoading(true);
                            setShowSlotPicker(true);
                            try {
                                const slots = await getAvailableSlots(
                                    token,
                                    doctorProfile.id,
                                    formData.followUpDate,
                                );
                                setAvailableSlots(slots);
                            } catch {
                                setAvailableSlots([]);
                            } finally {
                                setSlotsLoading(false);
                            }
                            setIsSaving(false);
                            // Don't proceed to success — wait for slot pick
                            return;
                        }
                        // Other errors — still proceed (prescription was saved)
                        console.error('Follow-up booking failed:', followUpErr);
                    }
                }

                onPrescriptionCreated?.();
            } catch (err) {
                console.error('Failed to save prescription:', err);
            } finally {
                setIsSaving(false);
            }
        }

        // 2. Switch to preview and show success
        setActiveTab('preview');
        setShowSuccess(true);
    }, [formData, vitals, medications, patientId, doctorProfile, token, onPrescriptionCreated]);

    // ── Handle slot pick from the conflict picker ──
    const handleSlotPick = useCallback(async (slot: AvailableSlot) => {
        if (!patientId || !doctorProfile || !token) return;
        setIsSaving(true);
        try {
            const me = await getMe(token);
            const hospitalId = me?.hospital_id;
            if (!hospitalId) return;

            const scheduledTime = new Date(
                `${formData.followUpDate}T${slot.start_time}:00`
            ).toISOString();

            await createAppointment(token, {
                doctor_id: doctorProfile.id,
                patient_id: patientId,
                hospital_id: hospitalId,
                scheduled_time: scheduledTime,
                duration_minutes: 15,
                appointment_type: 'FOLLOW_UP',
                reason: `Follow-up: ${formData.diagnosis}`,
            });
            setFollowUpBooked(true);
        } catch (e) {
            console.error('Failed to book follow-up:', e);
        } finally {
            setIsSaving(false);
            setShowSlotPicker(false);
            setActiveTab('preview');
            setShowSuccess(true);
            onPrescriptionCreated?.();
        }
    }, [patientId, doctorProfile, token, formData.followUpDate, formData.diagnosis, onPrescriptionCreated]);

    const handleWhatsApp = useCallback(() => {
        // Build text summary for WhatsApp
        const doctorName = doctorProfile?.full_name ?? 'Doctor';
        const lines: string[] = [];
        lines.push(`*Prescription — Dr. ${doctorName}*`);
        lines.push(`Date: ${formatDate()}`);
        lines.push('');
        if (formData.patientName) lines.push(`Patient: ${formData.patientName}`);
        if (formData.chiefComplaints) lines.push(`Complaints: ${formData.chiefComplaints}`);
        if (formData.diagnosis) lines.push(`Diagnosis: ${formData.diagnosis}`);
        const hasV = vitals.bp || vitals.pulse || vitals.temp || vitals.weight;
        if (hasV) {
            const vs = [vitals.bp && `BP: ${vitals.bp}`, vitals.pulse && `Pulse: ${vitals.pulse}`, vitals.temp && `Temp: ${vitals.temp}`, vitals.weight && `Weight: ${vitals.weight}`].filter(Boolean).join(', ');
            lines.push(`Vitals: ${vs}`);
        }
        lines.push('');
        lines.push('*Medications:*');
        medications.filter(m => m.name.trim()).forEach((m, i) => {
            lines.push(`${i + 1}. ${m.name} ${m.dosage} - ${m.frequency} for ${m.duration}`);
            if (m.instructions) lines.push(`   _${m.instructions}_`);
        });
        if (formData.advice) { lines.push(''); lines.push(`Advice: ${formData.advice}`); }
        if (formData.followUpDate) lines.push(`Follow-up: ${formData.followUpDate}`);

        const text = encodeURIComponent(lines.join('\n'));
        Linking.openURL(`https://wa.me/?text=${text}`).catch(() =>
            Alert.alert('Error', 'Could not open WhatsApp'),
        );
    }, [formData, vitals, medications, doctorProfile]);

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
                        <View>
                            <Text style={s.headerTitle}>Create Prescription</Text>
                            <Text style={s.headerSubtitle}>
                                Fill in the details. Signature & date added automatically.
                            </Text>
                        </View>
                    </View>

                    {/* Segmented Control */}
                    <View style={s.segmentRow}>
                        {([
                            { id: 'edit' as TabId, label: 'Edit Form', icon: 'edit-3' as const },
                            { id: 'preview' as TabId, label: 'Preview', icon: 'eye' as const },
                        ]).map((tab) => {
                            const active = activeTab === tab.id;
                            return (
                                <Pressable
                                    key={tab.id}
                                    onPress={() => setActiveTab(tab.id)}
                                    style={[s.segmentBtn, active && s.segmentBtnActive]}
                                >
                                    <Feather
                                        name={tab.icon}
                                        size={14}
                                        color={active ? '#fff' : doctorColors.textMuted}
                                    />
                                    <Text style={[s.segmentText, active && s.segmentTextActive]}>
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Tab Content */}
                    {activeTab === 'edit' ? (
                        <EditFormTab
                            formData={formData}
                            setFormData={setFormData}
                            vitals={vitals}
                            setVitals={setVitals}
                            medications={medications}
                            setMedications={setMedications}
                        />
                    ) : (
                        <PreviewTab formData={formData} vitals={vitals} medications={medications} doctorProfile={doctorProfile} />
                    )}

                    {/* Footer */}
                    <View style={s.footer}>
                        {showSuccess ? (
                            <>
                                <Pressable
                                    onPress={handleWhatsApp}
                                    style={({ pressed }) => [s.footerOutline, pressed && { opacity: 0.7 }]}
                                >
                                    <Feather name="message-circle" size={15} color={doctorColors.primary} />
                                    <Text style={[s.footerOutlineText, { color: doctorColors.primary }]}>WhatsApp</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        // PDF download requires expo-print / expo-sharing — note for later install
                                        Alert.alert(
                                            'PDF Download',
                                            'PDF generation requires expo-print and expo-sharing packages. Install them with: npx expo install expo-print expo-sharing',
                                        );
                                    }}
                                    style={({ pressed }) => [
                                        s.footerPrimary,
                                        pressed && { backgroundColor: doctorColors.primaryDark },
                                    ]}
                                >
                                    <Feather name="download" size={15} color="#fff" />
                                    <Text style={s.footerPrimaryText}>Download PDF</Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Pressable
                                    onPress={onClose}
                                    style={({ pressed }) => [s.footerOutline, pressed && { opacity: 0.7 }]}
                                >
                                    <Text style={s.footerOutlineText}>Close</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleSaveAndSend}
                                    disabled={isSaving}
                                    style={({ pressed }) => [
                                        s.footerPrimary,
                                        isSaving && { opacity: 0.6 },
                                        pressed && { backgroundColor: doctorColors.primaryDark },
                                    ]}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Feather name="check" size={15} color="#fff" />
                                            <Text style={s.footerPrimaryText}>Save & Preview</Text>
                                        </>
                                    )}
                                </Pressable>
                            </>
                        )}
                    </View>
                </Animated.View>
            </Modal>

            <ThemedAlert
                visible={showSuccess}
                variant="success"
                icon="check-circle"
                title="Prescription Saved"
                message={`Prescription for ${formData.patientName || 'patient'} saved successfully.${followUpBooked ? ' Follow-up appointment booked.' : ''} You can now download or share via WhatsApp.`}
                confirmLabel="Continue"
                onConfirm={() => setShowSuccess(false)}
            />

            {/* ── Slot Picker Overlay (conflict resolution) ── */}
            {showSlotPicker && (
                <SlotPickerOverlay
                    date={formData.followUpDate}
                    slots={availableSlots}
                    loading={slotsLoading}
                    onSelect={handleSlotPick}
                    onSkip={() => {
                        setShowSlotPicker(false);
                        setActiveTab('preview');
                        setShowSuccess(true);
                        onPrescriptionCreated?.();
                    }}
                />
            )}
        </>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    // Shell
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.93,
        backgroundColor: doctorColors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },
    handleRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: doctorColors.border },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
    },
    headerSubtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
        marginTop: spacing.xxs,
    },


    // Segmented Control
    segmentRow: {
        flexDirection: 'row',
        marginHorizontal: spacing.xl,
        backgroundColor: doctorColors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.xxs,
        marginBottom: spacing.md,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radii.sm,
    },
    segmentBtnActive: {
        backgroundColor: doctorColors.primary,
        ...shadows.card,
    },
    segmentText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },
    segmentTextActive: {
        color: '#fff',
        fontFamily: typography.fontFamily.semiBold,
    },

    // Tab ScrollView
    tabScroll: { flex: 1 },
    tabScrollInner: { padding: spacing.xl, paddingBottom: spacing['6xl'] },

    // Section Label
    sectionLabel: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },

    // Form fields
    fieldGroup: { marginBottom: spacing.lg },
    fieldLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
        marginBottom: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        backgroundColor: doctorColors.surface,
    },
    inputMultiline: {
        minHeight: 64,
        paddingTop: spacing.md,
    },
    tripleRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    vitalsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    vitalField: {
        flex: 1,
        minWidth: '45%',
    },
    vitalLabel: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 10,
        color: doctorColors.textMuted,
        marginBottom: spacing.xxs,
    },
    smallFieldGroup: { flex: 1 },
    separator: {
        height: 1,
        backgroundColor: doctorColors.borderLight,
        marginVertical: spacing.xl,
    },

    // Medications
    medsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
    },
    addBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
    },
    medCard: {
        padding: spacing.md,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surfaceMuted,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    medCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    medCardTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    medGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    medGridItem: {
        width: '48%',
        flexGrow: 1,
    },

    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    footerOutline: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.border,
    },
    footerOutlineText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    footerPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    footerPrimaryText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: '#FFFFFF',
    },

    // ─── Preview (Rx Paper) ─────────────────────────────────────────────
    paper: {
        backgroundColor: '#FFFFFF',
        borderRadius: radii.md,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...shadows.elevated,
    },
    paperHeader: {
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: doctorColors.primary,
        paddingBottom: spacing.lg,
        marginBottom: spacing.lg,
    },
    paperDoctorName: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 20,
        color: doctorColors.primary,
    },
    paperSubtext: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 11,
        color: doctorColors.textMuted,
        marginTop: 2,
    },
    paperClinic: {
        fontFamily: typography.fontFamily.medium,
        fontSize: 12,
        color: doctorColors.textPrimary,
    },

    paperPatientBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F7FAFC',
        borderRadius: radii.sm,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    paperSmall: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 12,
        color: doctorColors.textSecondary,
    },
    paperBold: {
        fontFamily: typography.fontFamily.semiBold,
        color: doctorColors.textPrimary,
    },

    rxSymbol: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 28,
        color: doctorColors.primary,
        marginBottom: spacing.md,
    },

    // Medications table
    medTable: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: radii.sm,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    medTableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    medTableHeaderRow: {
        backgroundColor: '#EDF2F7',
    },
    medTableHeaderText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 11,
        color: doctorColors.textPrimary,
    },
    medTableCell: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 11,
        color: doctorColors.textPrimary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
    },
    medTableNumCol: {
        width: 28,
        textAlign: 'center',
    },
    medTableNameCol: {
        flex: 2,
    },
    medTableCol: {
        flex: 1,
    },
    medTableInstructions: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 10,
        fontStyle: 'italic',
        color: doctorColors.textMuted,
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.xs,
    },

    // Signature
    signatureBlock: {
        alignItems: 'flex-end',
        marginTop: spacing['4xl'],
    },
    signatureLine: {
        width: 160,
        borderTopWidth: 1,
        borderTopColor: doctorColors.textPrimary,
        marginTop: spacing['4xl'],
        paddingTop: spacing.xs,
    },
    signatureName: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 12,
        color: doctorColors.textPrimary,
        textAlign: 'right',
    },
    signatureQual: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 11,
        color: doctorColors.textMuted,
        textAlign: 'right',
    },

    // Paper footer
    paperFooter: {
        marginTop: spacing['2xl'],
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        alignItems: 'center',
    },
    paperDisclaimer: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 10,
        color: doctorColors.textMuted,
        textAlign: 'center',
    },
});
