/**
 * CareConnect — New Prescription Modal (Doctor-Facing)
 *
 * 1:1 adaptation of the web NewPrescriptionSheet.tsx.
 * Two-tab layout: "Edit Form" and "Live Preview" (Rx paper pad).
 * Wired to POST /medical-records with structured vitals.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
    shadows,
    radii,
    typography,
    doctorColors,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedText, ThemedView } from '@/components/shared/Themed';
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
    const { colors } = useTheme();
    return (
        <View style={s.fieldGroup}>
            <ThemedText color="primary" weight="medium" size="sm" style={s.fieldLabel}>{label}</ThemedText>
            <TextInput
                style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }, multiline && s.inputMultiline]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
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
    const { colors } = useTheme();
    return (
        <View style={s.smallFieldGroup}>
            <ThemedText color="primary" weight="medium" size="sm" style={s.fieldLabel}>{label}</ThemedText>
            <TextInput
                style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
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
    const { colors } = useTheme();
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
            <ThemedText color="muted" weight="semiBold" size="sm" style={s.sectionLabel}>Patient Details</ThemedText>
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
            <ThemedText color="primary" weight="medium" size="sm" style={s.fieldLabel}>Vitals</ThemedText>
            <View style={s.vitalsRow}>
                <View style={s.vitalField}>
                    <ThemedText color="muted" size="xs" style={s.vitalLabel}>BP (mmHg)</ThemedText>
                    <TextInput
                        style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                        value={vitals.bp}
                        onChangeText={(v) => setVitals(prev => ({ ...prev, bp: v }))}
                        placeholder="120/80"
                        placeholderTextColor={colors.textMuted}
                    />
                </View>
                <View style={s.vitalField}>
                    <ThemedText color="muted" size="xs" style={s.vitalLabel}>Pulse (bpm)</ThemedText>
                    <TextInput
                        style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                        value={vitals.pulse}
                        onChangeText={(v) => setVitals(prev => ({ ...prev, pulse: v }))}
                        placeholder="72"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                    />
                </View>
                <View style={s.vitalField}>
                    <ThemedText color="muted" size="xs" style={s.vitalLabel}>Temp (°F)</ThemedText>
                    <TextInput
                        style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                        value={vitals.temp}
                        onChangeText={(v) => setVitals(prev => ({ ...prev, temp: v }))}
                        placeholder="98.6"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                    />
                </View>
                <View style={s.vitalField}>
                    <ThemedText color="muted" size="xs" style={s.vitalLabel}>Weight (kg)</ThemedText>
                    <TextInput
                        style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                        value={vitals.weight}
                        onChangeText={(v) => setVitals(prev => ({ ...prev, weight: v }))}
                        placeholder="70"
                        placeholderTextColor={colors.textMuted}
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

            <View style={[s.separator, { backgroundColor: colors.borderLight }]} />

            {/* Medications */}
            <View style={s.medsHeader}>
                <ThemedText color="muted" weight="semiBold" size="sm" style={s.sectionLabel}>Medications</ThemedText>
                <Pressable
                    onPress={addMedication}
                    style={({ pressed }) => [s.addBtn, { borderColor: colors.primary }, pressed && { opacity: 0.7 }]}
                >
                    <Feather name="plus" size={14} color={colors.primary} />
                    <ThemedText color="brand" weight="medium" size="sm" style={s.addBtnText}>Add</ThemedText>
                </Pressable>
            </View>

            {medications.map((med, index) => (
                <View key={med.id} style={[s.medCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
                    <View style={s.medCardHeader}>
                        <ThemedText color="primary" weight="semiBold" size="sm" style={s.medCardTitle}>Medicine {index + 1}</ThemedText>
                        {medications.length > 1 && (
                            <Pressable
                                onPress={() => removeMedication(med.id)}
                                hitSlop={8}
                            >
                                <Feather name="trash-2" size={16} color="#EF4444" />
                            </Pressable>
                        )}
                    </View>
                    <View style={s.medGrid}>
                        <TextInput
                            style={[s.input, s.medGridItem, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={med.name}
                            onChangeText={updateMedField(med.id, 'name')}
                            placeholder="Medicine name"
                            placeholderTextColor={colors.textMuted}
                        />
                        <TextInput
                            style={[s.input, s.medGridItem, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={med.dosage}
                            onChangeText={updateMedField(med.id, 'dosage')}
                            placeholder="Dosage (e.g., 500mg)"
                            placeholderTextColor={colors.textMuted}
                        />
                        <TextInput
                            style={[s.input, s.medGridItem, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={med.frequency}
                            onChangeText={updateMedField(med.id, 'frequency')}
                            placeholder="Frequency (e.g., 1-0-1)"
                            placeholderTextColor={colors.textMuted}
                        />
                        <TextInput
                            style={[s.input, s.medGridItem, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                            value={med.duration}
                            onChangeText={updateMedField(med.id, 'duration')}
                            placeholder="Duration (e.g., 5 days)"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                    <TextInput
                        style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface }]}
                        value={med.instructions}
                        onChangeText={updateMedField(med.id, 'instructions')}
                        placeholder="Special instructions (e.g., after meals)"
                        placeholderTextColor={colors.textMuted}
                    />
                </View>
            ))}

            <View style={[s.separator, { backgroundColor: colors.borderLight }]} />

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
    const { colors } = useTheme();
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
            <View style={[s.paper, { backgroundColor: colors.surface }]}>
                {/* Doctor Header */}
                <View style={[s.paperHeader, { borderBottomColor: colors.borderLight }]}>
                    <ThemedText color="primary" weight="bold" size="2xl" style={s.paperDoctorName}>{doctorName}</ThemedText>
                    <ThemedText color="muted" size="sm" style={s.paperSubtext}>{doctorLabel}</ThemedText>
                    {doctorPhone ? <ThemedText color="muted" size="sm" style={s.paperSubtext}>Tel: {doctorPhone}</ThemedText> : null}
                </View>

                {/* Patient Info Bar */}
                <View style={[s.paperPatientBar, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}>
                    <ThemedText color="primary" size="sm" style={s.paperSmall}>
                        <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>Patient: </ThemedText>
                        {formData.patientName || '—'}
                    </ThemedText>
                    <ThemedText color="primary" size="sm" style={s.paperSmall}>
                        <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>Age: </ThemedText>
                        {formData.patientAge || '—'}
                    </ThemedText>
                    <ThemedText color="primary" size="sm" style={s.paperSmall}>
                        <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>Gender: </ThemedText>
                        {formData.patientGender || '—'}
                    </ThemedText>
                </View>

                {/* Date */}
                <ThemedText color="primary" size="sm" style={[s.paperSmall, { marginBottom: spacing.lg }]}>
                    <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>Date: </ThemedText>{currentDate}
                </ThemedText>

                {/* Chief Complaints & Vitals */}
                {(formData.chiefComplaints || hasVitals) ? (
                    <View style={{ marginBottom: spacing.lg }}>
                        {formData.chiefComplaints ? (
                            <ThemedText color="primary" size="sm" style={s.paperSmall}>
                                <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>C/C: </ThemedText>
                                {formData.chiefComplaints}
                            </ThemedText>
                        ) : null}
                        {hasVitals ? (
                            <ThemedText color="primary" size="sm" style={[s.paperSmall, { marginTop: spacing.xxs }]}>
                                <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>Vitals: </ThemedText>
                                {vitalsStr}
                            </ThemedText>
                        ) : null}
                    </View>
                ) : null}

                {/* Diagnosis */}
                {formData.diagnosis ? (
                    <ThemedText color="primary" size="sm" style={[s.paperSmall, { marginBottom: spacing.lg }]}>
                        <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>Diagnosis: </ThemedText>
                        {formData.diagnosis}
                    </ThemedText>
                ) : null}

                {/* Rx Symbol */}
                <Text style={[s.rxSymbol, { color: colors.primaryLight }]}>℞</Text>

                {/* Medications Table */}
                {filledMeds.length > 0 && (
                    <View style={[s.medTable, { borderColor: colors.borderLight }]}>
                        {/* Table header */}
                        <View style={[s.medTableRow, s.medTableHeaderRow, { backgroundColor: colors.surfaceMuted, borderBottomColor: colors.borderLight }]}>
                            <ThemedText color="secondary" weight="semiBold" size="xs" style={[s.medTableCell, s.medTableNumCol, s.medTableHeaderText]}>#</ThemedText>
                            <ThemedText color="secondary" weight="semiBold" size="xs" style={[s.medTableCell, s.medTableNameCol, s.medTableHeaderText]}>Medicine</ThemedText>
                            <ThemedText color="secondary" weight="semiBold" size="xs" style={[s.medTableCell, s.medTableCol, s.medTableHeaderText]}>Dosage</ThemedText>
                            <ThemedText color="secondary" weight="semiBold" size="xs" style={[s.medTableCell, s.medTableCol, s.medTableHeaderText]}>Freq.</ThemedText>
                            <ThemedText color="secondary" weight="semiBold" size="xs" style={[s.medTableCell, s.medTableCol, s.medTableHeaderText]}>Duration</ThemedText>
                        </View>
                        {/* Table body */}
                        {filledMeds.map((med, idx) => (
                            <View key={med.id} style={[s.medTableRow, { borderBottomColor: colors.borderLight }]}>
                                <ThemedText color="primary" size="sm" style={[s.medTableCell, s.medTableNumCol]}>{idx + 1}</ThemedText>
                                <View style={[s.medTableNameCol]}>
                                    <ThemedText color="primary" size="sm" style={s.medTableCell}>{med.name}</ThemedText>
                                    {med.instructions ? (
                                        <ThemedText color="muted" size="xs" style={s.medTableInstructions}>({med.instructions})</ThemedText>
                                    ) : null}
                                </View>
                                <ThemedText color="primary" size="sm" style={[s.medTableCell, s.medTableCol]}>{med.dosage}</ThemedText>
                                <ThemedText color="primary" size="sm" style={[s.medTableCell, s.medTableCol]}>{med.frequency}</ThemedText>
                                <ThemedText color="primary" size="sm" style={[s.medTableCell, s.medTableCol]}>{med.duration}</ThemedText>
                            </View>
                        ))}
                    </View>
                )}

                {/* Advice */}
                {formData.advice ? (
                    <ThemedText color="primary" size="sm" style={[s.paperSmall, { marginTop: spacing.lg }]}>
                        <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>Advice: </ThemedText>
                        {formData.advice}
                    </ThemedText>
                ) : null}

                {/* Follow-up */}
                {formData.followUpDate ? (
                    <ThemedText color="primary" size="sm" style={[s.paperSmall, { marginTop: spacing.sm }]}>
                        <ThemedText color="primary" weight="bold" size="sm" style={s.paperBold}>Follow-up: </ThemedText>
                        {formData.followUpDate}
                    </ThemedText>
                ) : null}

                {/* Signature */}
                <View style={s.signatureBlock}>
                    <View style={[s.signatureLine, { backgroundColor: colors.borderLight }]} />
                    <ThemedText color="primary" weight="semiBold" size="sm" style={s.signatureName}>{doctorName}</ThemedText>
                    <ThemedText color="muted" size="xs" style={s.signatureQual}>{doctorLabel}</ThemedText>
                </View>

                {/* Disclaimer */}
                <View style={[s.paperFooter, { borderTopColor: colors.borderLight }]}>
                    <ThemedText color="muted" size="xs" style={s.paperDisclaimer}>
                        This prescription is digitally generated. Valid for 30 days from issue date.
                    </ThemedText>
                </View>
            </View>
        </ScrollView>
    );
}

// ─── Follow-Up Time Picker ──────────────────────────────────────────────────

function FollowUpTimePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const { colors } = useTheme();
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
            <ThemedText color="primary" weight="medium" size="sm" style={[s.fieldLabel, { marginBottom: spacing.sm }]}>Follow-up Time</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {/* Hours */}
                <View style={{ alignItems: 'center' }}>
                    <Pressable onPress={() => setH(hours + 1)} hitSlop={6}>
                        <Feather name="chevron-up" size={18} color={colors.textMuted} />
                    </Pressable>
                    <View style={[timePickerStyles.cell, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
                        <ThemedText color="primary" weight="medium" size="base" style={timePickerStyles.cellText}>{pad(hours)}</ThemedText>
                    </View>
                    <Pressable onPress={() => setH(hours - 1)} hitSlop={6}>
                        <Feather name="chevron-down" size={18} color={colors.textMuted} />
                    </Pressable>
                </View>

                <ThemedText color="muted" weight="bold" size="lg" style={{ fontSize: 18 }}>:</ThemedText>

                {/* Minutes */}
                <View style={{ alignItems: 'center' }}>
                    <Pressable onPress={() => setM(minutes + 1)} hitSlop={6}>
                        <Feather name="chevron-up" size={18} color={colors.textMuted} />
                    </Pressable>
                    <View style={[timePickerStyles.cell, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
                        <ThemedText color="primary" weight="medium" size="base" style={timePickerStyles.cellText}>{pad(minutes)}</ThemedText>
                    </View>
                    <Pressable onPress={() => setM(minutes - 1)} hitSlop={6}>
                        <Feather name="chevron-down" size={18} color={colors.textMuted} />
                    </Pressable>
                </View>

                <ThemedText color="muted" size="sm" style={{ marginLeft: spacing.xs }}>hrs</ThemedText>
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
    const { colors } = useTheme();
    const [selected, setSelected] = useState<string | null>(null);

    const fmtDate = new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
        <Modal transparent animationType="fade" visible>
            <View style={slotStyles.overlay}>
                <View style={[slotStyles.card, { backgroundColor: colors.surface }]}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
                        <View style={slotStyles.warningIcon}>
                            <Feather name="alert-circle" size={20} color="#D97706" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText color="primary" weight="bold" size="base" style={slotStyles.title}>Time Slot Unavailable</ThemedText>
                            <ThemedText color="muted" size="xs" style={slotStyles.subtitle}>The selected time is already booked</ThemedText>
                        </View>
                    </View>

                    {/* Date badge */}
                    <View style={[slotStyles.dateBadge, { backgroundColor: colors.surfaceMuted }]}>
                        <Feather name="calendar" size={14} color={colors.textMuted} />
                        <ThemedText color="secondary" size="sm" style={slotStyles.dateText}>{fmtDate}</ThemedText>
                    </View>

                    {/* Slots */}
                    {loading ? (
                        <View style={{ paddingVertical: spacing['4xl'], alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <ThemedText color="muted" size="sm" style={{ marginTop: spacing.sm }}>Loading available slots…</ThemedText>
                        </View>
                    ) : slots.length === 0 ? (
                        <View style={{ paddingVertical: spacing['4xl'], alignItems: 'center' }}>
                            <Feather name="clock" size={28} color={colors.borderLight} />
                            <ThemedText color="muted" size="sm" style={{ marginTop: spacing.sm }}>No available slots on this day.</ThemedText>
                        </View>
                    ) : (
                        <>
                            <ThemedText color="muted" weight="medium" size="xs" style={{ marginBottom: spacing.sm }}>Available Slots</ThemedText>
                            <View style={slotStyles.grid}>
                                {slots.map((slot) => (
                                    <Pressable
                                        key={slot.start_time}
                                        onPress={() => setSelected(slot.start_time)}
                                        style={[
                                            slotStyles.slotBtn,
                                            { borderColor: colors.borderLight, backgroundColor: colors.surface },
                                            selected === slot.start_time && [slotStyles.slotBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                                        ]}
                                    >
                                        <ThemedText weight="medium" size="xs" style={[
                                            slotStyles.slotText,
                                            selected === slot.start_time ? slotStyles.slotTextActive : { color: colors.textPrimary },
                                        ]}>{slot.start_time}</ThemedText>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
                        <Pressable onPress={onSkip} style={({ pressed }) => [slotStyles.skipBtn, { borderColor: colors.borderLight }, pressed && { opacity: 0.7 }]}>
                            <ThemedText color="primary" weight="medium" size="sm" style={slotStyles.skipText}>Skip</ThemedText>
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
                                    { backgroundColor: colors.primary },
                                    !selected && { opacity: 0.4 },
                                    pressed && { opacity: 0.7 },
                                ]}
                            >
                                <Feather name="calendar" size={14} color="#fff" />
                                <ThemedText weight="semiBold" size="sm" style={slotStyles.bookText}>Book Follow-Up</ThemedText>
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
    const { colors } = useTheme();
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
                <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom, backgroundColor: colors.surface }]}>
                    {/* Handle */}
                    <View style={s.handleRow} {...panHandlers}>
                        <View style={[s.handle, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Header */}
                    <View style={s.header}>
                        <View>
                            <ThemedText color="primary" weight="bold" size="xl" style={s.headerTitle}>Create Prescription</ThemedText>
                            <ThemedText color="muted" size="xs" style={s.headerSubtitle}>
                                Fill in the details. Signature & date added automatically.
                            </ThemedText>
                        </View>
                    </View>

                    {/* Segmented Control */}
                    <View style={[s.segmentRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}>
                        {([
                            { id: 'edit' as TabId, label: 'Edit Form', icon: 'edit-3' as const },
                            { id: 'preview' as TabId, label: 'Preview', icon: 'eye' as const },
                        ]).map((tab) => {
                            const active = activeTab === tab.id;
                            return (
                                <Pressable
                                    key={tab.id}
                                    onPress={() => setActiveTab(tab.id)}
                                    style={[s.segmentBtn, active && [s.segmentBtnActive, { backgroundColor: colors.surface, borderColor: colors.borderLight, shadowColor: colors.textPrimary }]]}
                                >
                                    <Feather
                                        name={tab.icon}
                                        size={14}
                                        color={active ? colors.primary : colors.textMuted}
                                    />
                                    <ThemedText weight={active ? "semiBold" : "medium"} size="sm" style={[s.segmentText, active ? [s.segmentTextActive, { color: colors.primary }] : { color: colors.textSecondary }]}>
                                        {tab.label}
                                    </ThemedText>
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
                    <View style={[s.footer, { borderTopColor: colors.borderLight, backgroundColor: colors.surface }]}>
                        {showSuccess ? (
                            <>
                                <Pressable
                                    onPress={handleWhatsApp}
                                    style={({ pressed }) => [s.footerOutline, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                                >
                                    <Feather name="message-circle" size={15} color={colors.primary} />
                                    <ThemedText color="brand" weight="medium" size="sm" style={[s.footerOutlineText, { color: colors.primary }]}>WhatsApp</ThemedText>
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
                                        { backgroundColor: colors.primary },
                                        pressed && { backgroundColor: colors.primaryDark },
                                    ]}
                                >
                                    <Feather name="download" size={15} color="#fff" />
                                    <ThemedText weight="semiBold" size="sm" style={s.footerPrimaryText}>Download PDF</ThemedText>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Pressable
                                    onPress={onClose}
                                    style={({ pressed }) => [s.footerOutline, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                                >
                                    <ThemedText weight="medium" size="sm" style={[s.footerOutlineText, { color: colors.textPrimary }]}>Close</ThemedText>
                                </Pressable>
                                <Pressable
                                    onPress={handleSaveAndSend}
                                    disabled={isSaving}
                                    style={({ pressed }) => [
                                        s.footerPrimary,
                                        { backgroundColor: colors.primary },
                                        isSaving && { opacity: 0.6 },
                                        pressed && { backgroundColor: colors.primaryDark },
                                    ]}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Feather name="check" size={15} color="#fff" />
                                            <ThemedText weight="semiBold" size="sm" style={s.footerPrimaryText}>Save & Preview</ThemedText>
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
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },
    handleRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
    handle: { width: 40, height: 4, borderRadius: 2 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
    },
    headerSubtitle: {
        marginTop: spacing.xxs,
    },


    // Segmented Control
    segmentRow: {
        flexDirection: 'row',
        marginHorizontal: spacing.xl,
        borderRadius: radii.md,
        padding: spacing.xxs,
        marginBottom: spacing.md,
        borderWidth: 1,
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
        borderWidth: 1,
        ...shadows.card,
    },
    segmentText: {
    },
    segmentTextActive: {
    },

    // Tab ScrollView
    tabScroll: { flex: 1 },
    tabScrollInner: { padding: spacing.xl, paddingBottom: spacing['6xl'] },

    // Section Label
    sectionLabel: {
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },

    // Form fields
    fieldGroup: { marginBottom: spacing.lg },
    fieldLabel: {
        marginBottom: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
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
        marginBottom: spacing.xxs,
    },
    smallFieldGroup: { flex: 1 },
    separator: {
        height: 1,
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
    },
    addBtnText: {
    },
    medCard: {
        padding: spacing.md,
        borderWidth: 1,
        borderRadius: radii.md,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    medCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    medCardTitle: {
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
    },
    footerOutline: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    footerOutlineText: {
    },
    footerPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
    },
    footerPrimaryText: {
        color: '#FFFFFF',
    },

    // ─── Preview (Rx Paper) ─────────────────────────────────────────────
    paper: {
        borderRadius: radii.md,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...shadows.elevated,
    },
    paperHeader: {
        alignItems: 'center',
        borderBottomWidth: 1,
        paddingBottom: spacing.lg,
        marginBottom: spacing.lg,
    },
    paperDoctorName: {
    },
    paperSubtext: {
        marginTop: 2,
    },
    paperClinic: {
    },

    paperPatientBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderRadius: radii.sm,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
    },
    paperSmall: {
    },
    paperBold: {
    },

    rxSymbol: {
        fontSize: 28,
        marginBottom: spacing.md,
    },

    // Medications table
    medTable: {
        borderWidth: 1,
        borderRadius: radii.sm,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    medTableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    medTableHeaderRow: {
        borderBottomWidth: 1,
    },
    medTableHeaderText: {
    },
    medTableCell: {
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
        fontStyle: 'italic',
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
        marginTop: spacing['4xl'],
        paddingTop: spacing.xs,
    },
    signatureName: {
        textAlign: 'right',
    },
    signatureQual: {
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
