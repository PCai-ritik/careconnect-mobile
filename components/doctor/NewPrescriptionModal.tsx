/**
 * CareConnect — New Prescription Modal (Doctor-Facing)
 *
 * 1:1 adaptation of the web PrescriptionTemplate.tsx.
 * Two-tab layout: "Edit Form" and "Live Preview" (Rx paper pad).
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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
}

interface NewPrescriptionModalProps {
    visible: boolean;
    onClose: () => void;
    patientName?: string;
    patientAge?: string;
}

type TabId = 'edit' | 'preview';

// ─── Doctor Info (matching web) ─────────────────────────────────────────────

const doctorInfo = {
    name: 'Dr. Rohan Mehta',
    qualification: 'MBBS, MD',
    specialty: 'General Physician',
    regNumber: 'MCI-12345',
    clinic: 'CareConnect Clinic',
    address: '42 Medical Park Rd, Bengaluru - 560001',
    phone: '+91 98765 43210',
};

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

// ─── Edit Form Tab ──────────────────────────────────────────────────────────

function EditFormTab({
    formData,
    setFormData,
    medications,
    setMedications,
}: {
    formData: Record<string, string>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
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

            <FormField
                label="Vitals"
                value={formData.vitals}
                onChangeText={updateField('vitals')}
                placeholder="BP: 120/80, Temp: 98.6°F, Pulse: 72"
            />

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
                placeholder="e.g., 15 Apr 2026"
            />
        </ScrollView>
    );
}

// ─── Preview Tab (Rx Paper Pad) ─────────────────────────────────────────────

function PreviewTab({
    formData,
    medications,
}: {
    formData: Record<string, string>;
    medications: Medication[];
}) {
    const filledMeds = medications.filter((m) => m.name.trim());
    const currentDate = formatDate();

    return (
        <ScrollView
            style={s.tabScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.tabScrollInner}
        >
            <View style={s.paper}>
                {/* Doctor Header */}
                <View style={s.paperHeader}>
                    <Text style={s.paperDoctorName}>{doctorInfo.name}</Text>
                    <Text style={s.paperSubtext}>{doctorInfo.qualification}</Text>
                    <Text style={s.paperSubtext}>{doctorInfo.specialty}</Text>
                    <Text style={s.paperSubtext}>Reg. No: {doctorInfo.regNumber}</Text>
                    <Text style={[s.paperClinic, { marginTop: spacing.sm }]}>
                        {doctorInfo.clinic}
                    </Text>
                    <Text style={s.paperSubtext}>{doctorInfo.address}</Text>
                    <Text style={s.paperSubtext}>Tel: {doctorInfo.phone}</Text>
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
                {(formData.chiefComplaints || formData.vitals) ? (
                    <View style={{ marginBottom: spacing.lg }}>
                        {formData.chiefComplaints ? (
                            <Text style={s.paperSmall}>
                                <Text style={s.paperBold}>C/C: </Text>
                                {formData.chiefComplaints}
                            </Text>
                        ) : null}
                        {formData.vitals ? (
                            <Text style={[s.paperSmall, { marginTop: spacing.xxs }]}>
                                <Text style={s.paperBold}>Vitals: </Text>
                                {formData.vitals}
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
                    <Text style={s.signatureName}>{doctorInfo.name}</Text>
                    <Text style={s.signatureQual}>{doctorInfo.qualification}</Text>
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

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NewPrescriptionModal({
    visible,
    onClose,
    patientName = '',
    patientAge = '',
}: NewPrescriptionModalProps) {
    const [activeTab, setActiveTab] = useState<TabId>('edit');
    const [formData, setFormData] = useState<Record<string, string>>({
        patientName,
        patientAge,
        patientGender: '',
        diagnosis: '',
        chiefComplaints: '',
        vitals: '',
        advice: '',
        followUpDate: '',
    });
    const [medications, setMedications] = useState<Medication[]>([emptyMedication()]);

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <Pressable style={s.backdrop} onPress={onClose} />

            {/* Sheet */}
            <View style={s.sheet}>
                {/* Handle */}
                <View style={s.handleRow}>
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
                    <Pressable
                        onPress={onClose}
                        hitSlop={12}
                        style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.5 }]}
                    >
                        <Feather name="x" size={20} color={doctorColors.textMuted} />
                    </Pressable>
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
                        medications={medications}
                        setMedications={setMedications}
                    />
                ) : (
                    <PreviewTab formData={formData} medications={medications} />
                )}

                {/* Footer */}
                <View style={s.footer}>
                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [s.footerOutline, pressed && { opacity: 0.7 }]}
                    >
                        <Text style={s.footerOutlineText}>Close</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            // TODO: Generate PDF & send
                        }}
                        style={({ pressed }) => [
                            s.footerPrimary,
                            pressed && { backgroundColor: doctorColors.primaryDark },
                        ]}
                    >
                        <Feather name="download" size={15} color="#fff" />
                        <Text style={s.footerPrimaryText}>Download & Send PDF</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
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
    closeBtn: {
        padding: spacing.sm,
        borderRadius: radii.full,
        backgroundColor: doctorColors.surfaceMuted,
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
