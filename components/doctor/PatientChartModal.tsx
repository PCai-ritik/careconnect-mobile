/**
 * CareConnect — Patient Chart Modal (Doctor-Facing)
 *
 * 1:1 mobile adaptation of the web PatientHistoryDialog.tsx.
 * 90%-height bottom sheet with 3 tabs:
 *   1. Consultation History (selectable list + detail view)
 *   2. Patient Profile (personal + medical info)
 *   3. Medications (flat list of all prescriptions)
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
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
import { PatientProfile as RealPatientProfile, MedicalRecord } from '@/services/types';
import { useAuth } from '@/hooks/useAuth';
import { getPatientRecords } from '@/services/doctor';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Helpers to convert MedicalRecord → display format ──────────────────────

function formatRecordDate(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPrescriptionStrings(record: MedicalRecord): string[] {
    return record.prescriptions.map(p => {
        const parts = [p.medication_name];
        if (p.dosage) parts.push(p.dosage);
        if (p.frequency) parts.push(`- ${p.frequency}`);
        if (p.duration) parts.push(`for ${p.duration}`);
        return parts.join(' ');
    });
}

function getVitals(record: MedicalRecord): { bp: string; pulse: string; temp: string; weight: string } {
    const v = record.vitals as Record<string, string> | null;
    return {
        bp: v?.bp ?? '—',
        pulse: v?.pulse ?? '—',
        temp: v?.temp ?? '—',
        weight: v?.weight ?? '—',
    };
}

// ─── Avatar Color (same hash as dashboard) ──────────────────────────────────

const AVATAR_COLORS = [
    '#C7D2FE', '#A5B4FC', '#BAE6FD', '#99F6E4',
    '#D9F99D', '#FDE68A', '#FECACA', '#DDD6FE',
];

const getAvatarColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ─── Types ──────────────────────────────────────────────────────────────────

type TabId = 'history' | 'profile' | 'medications';

interface PatientChartModalProps {
    visible: boolean;
    patient: RealPatientProfile | null;
    onClose: () => void;
    onNewPrescription?: () => void;
}

const TAB_CONFIG: { id: TabId; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'history', label: 'History', icon: 'file-text' },
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'medications', label: 'Medications', icon: 'package' },
];

// ─── Sub-Components ─────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
    return (
        <View style={s.infoRow}>
            <Feather name={icon} size={16} color={doctorColors.textMuted} />
            <View style={s.infoRowText}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

function Badge({ label, variant }: { label: string; variant: 'danger' | 'info' }) {
    const bg = variant === 'danger' ? '#FEE2E2' : doctorColors.primaryLight;
    const color = variant === 'danger' ? doctorColors.error : doctorColors.primary;
    return (
        <View style={[s.badge, { backgroundColor: bg }]}>
            <Text style={[s.badgeText, { color }]}>{label}</Text>
        </View>
    );
}

// ─── Tab: Consultation History ──────────────────────────────────────────────

function HistoryTab({ records }: { records: MedicalRecord[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggle = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    if (records.length === 0) {
        return (
            <View style={s.historyContainer}>
                <Text style={s.sectionLabel}>Past Consultations (0)</Text>
                <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
                    <Feather name="file-text" size={32} color={doctorColors.textMuted} />
                    <Text style={{ ...typography.size.sm, color: doctorColors.textMuted, marginTop: spacing.md }}>No consultation records yet</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={s.historyContainer}>
            <Text style={s.sectionLabel}>
                Past Consultations ({records.length})
            </Text>
            {records.map((record) => {
                const isOpen = expandedId === record.id;
                const rxStrings = getPrescriptionStrings(record);
                const vitals = getVitals(record);
                return (
                    <View key={record.id} style={s.accordionWrapper}>
                        {/* Accordion Header */}
                        <Pressable
                            onPress={() => toggle(record.id)}
                            style={[
                                s.consultationItem,
                                isOpen && s.consultationItemActive,
                            ]}
                        >
                            <View style={s.consultationItemLeft}>
                                <Text style={s.consultationDiagnosis}>{record.diagnosis}</Text>
                                <Text style={s.consultationDate}>{formatRecordDate(record.created_at)}</Text>
                            </View>
                            <View style={s.rxBadge}>
                                <Text style={s.rxBadgeText}>{record.prescriptions.length} Rx</Text>
                            </View>
                        </Pressable>

                        {/* Accordion Body (inline detail) */}
                        {isOpen && (
                            <View style={s.detailPanel}>
                                {/* Vitals */}
                                <Text style={[s.detailSectionLabel, { marginTop: 0 }]}>Vitals</Text>
                                <View style={s.vitalsGrid}>
                                    <View style={s.vitalItem}>
                                        <Feather name="heart" size={14} color="#EF4444" />
                                        <Text style={s.vitalText}>BP: {vitals.bp}</Text>
                                    </View>
                                    <View style={s.vitalItem}>
                                        <Feather name="activity" size={14} color="#EC4899" />
                                        <Text style={s.vitalText}>Pulse: {vitals.pulse}</Text>
                                    </View>
                                    <View style={s.vitalItem}>
                                        <Feather name="thermometer" size={14} color="#F97316" />
                                        <Text style={s.vitalText}>Temp: {vitals.temp}</Text>
                                    </View>
                                    <View style={s.vitalItem}>
                                        <Feather name="trending-up" size={14} color="#3B82F6" />
                                        <Text style={s.vitalText}>Weight: {vitals.weight}</Text>
                                    </View>
                                </View>

                                <View style={s.separator} />

                                {/* Symptoms */}
                                <Text style={[s.detailSectionLabel, { marginTop: 0 }]}>Symptoms</Text>
                                <Text style={s.detailBody}>{record.symptoms ?? '—'}</Text>

                                {/* Treatment */}
                                <Text style={s.detailSectionLabel}>Treatment</Text>
                                <Text style={s.detailBody}>{record.treatment ?? '—'}</Text>

                                {/* Prescriptions */}
                                <Text style={s.detailSectionLabel}>Prescriptions</Text>
                                {rxStrings.map((rx, i) => (
                                    <View key={i} style={s.rxRow}>
                                        <Feather name="package" size={13} color={doctorColors.primary} />
                                        <Text style={s.rxText}>{rx}</Text>
                                    </View>
                                ))}

                                {/* Follow-up */}
                                {record.follow_up_date && (
                                    <View style={s.followUpBanner}>
                                        <Feather name="clock" size={14} color="#92400E" />
                                        <Text style={s.followUpText}>
                                            Follow-up scheduled: {formatRecordDate(record.follow_up_date)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

// ─── Tab: Patient Profile ───────────────────────────────────────────────────

function ProfileTab({ patient }: { patient: RealPatientProfile }) {
    return (
        <View>
            {/* Personal Information */}
            <Text style={s.sectionLabel}>Personal Information</Text>
            <View style={s.infoCard}>
                <InfoRow icon="user" label="Full Name" value={patient.full_name} />
                <InfoRow icon="calendar" label="Date of Birth" value={patient.date_of_birth ?? '—'} />
                <InfoRow icon="phone" label="Phone" value={patient.whatsapp_number ?? '—'} />
                <InfoRow icon="map-pin" label="Address" value={patient.address ?? '—'} />
                <InfoRow icon="droplet" label="Blood Group" value={patient.blood_group ?? '—'} />
            </View>

            {/* Medical Information */}
            <Text style={[s.sectionLabel, { marginTop: spacing['2xl'] }]}>
                Medical Information
            </Text>

            {/* Allergies */}
            <View style={s.medicalBlock}>
                <View style={s.medicalBlockHeader}>
                    <Feather name="alert-circle" size={15} color={doctorColors.error} />
                    <Text style={s.medicalBlockTitle}>Known Allergies</Text>
                </View>
                <View style={s.badgeRow}>
                    {(patient.allergies?.length ?? 0) > 0 ? (
                        patient.allergies!.map((a) => (
                            <Badge key={a} label={a} variant="danger" />
                        ))
                    ) : (
                        <Text style={s.emptyMedicalText}>No known allergies</Text>
                    )}
                </View>
            </View>

            {/* Existing Conditions */}
            <View style={s.medicalBlock}>
                <View style={s.medicalBlockHeader}>
                    <Feather name="activity" size={15} color={doctorColors.warning} />
                    <Text style={s.medicalBlockTitle}>Existing Conditions</Text>
                </View>
                <View style={s.badgeRow}>
                    {(patient.existing_conditions?.length ?? 0) > 0 ? (
                        patient.existing_conditions!.map((c) => (
                            <Badge key={c} label={c} variant="info" />
                        ))
                    ) : (
                        <Text style={s.emptyMedicalText}>No existing conditions</Text>
                    )}
                </View>
            </View>

            {/* Emergency Contact */}
            <View style={s.medicalBlock}>
                <Text style={s.medicalBlockTitle}>Emergency Contact</Text>
                <View style={s.emergencyCard}>
                    <Text style={s.emergencyName}>{patient.emergency_contact_name ?? '—'}</Text>
                    <Text style={s.emergencyPhone}>{patient.emergency_contact_phone ?? '—'}</Text>
                </View>
            </View>
        </View>
    );
}

// ─── Tab: Medications ───────────────────────────────────────────────────────

function MedicationsTab({ records }: { records: MedicalRecord[] }) {
    const allRx = records.flatMap((r) =>
        r.prescriptions.map((p) => ({
            key: `${r.id}-${p.id}`,
            label: getPrescriptionStrings({ ...r, prescriptions: [p] })[0],
            date: formatRecordDate(r.created_at),
            diagnosis: r.diagnosis,
        })),
    );

    if (allRx.length === 0) {
        return (
            <View>
                <Text style={s.sectionLabel}>Current & Past Medications</Text>
                <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
                    <Feather name="package" size={32} color={doctorColors.textMuted} />
                    <Text style={{ ...typography.size.sm, color: doctorColors.textMuted, marginTop: spacing.md }}>No medications prescribed yet</Text>
                </View>
            </View>
        );
    }

    return (
        <View>
            <Text style={s.sectionLabel}>Current & Past Medications</Text>
            {allRx.map((rx) => (
                <View key={rx.key} style={s.medicationRow}>
                    <View style={s.medicationIcon}>
                        <Feather name="package" size={18} color={doctorColors.primary} />
                    </View>
                    <View style={s.medicationInfo}>
                        <Text style={s.medicationName}>{rx.label}</Text>
                        <Text style={s.medicationMeta}>
                            Prescribed on {rx.date} for {rx.diagnosis}
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PatientChartModal({ visible, patient, onClose, onNewPrescription }: PatientChartModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const [activeTab, setActiveTab] = useState<TabId>('history');
    const { token } = useAuth();
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(false);

    // Fetch records when modal opens
    useEffect(() => {
        if (visible && patient && token) {
            setLoadingRecords(true);
            getPatientRecords(token, patient.id)
                .then(setRecords)
                .catch(() => setRecords([]))
                .finally(() => setLoadingRecords(false));
        }
    }, [visible, patient, token]);

    if (!patient) return null;

    const avatarBg = getAvatarColor(patient.full_name);

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
            <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom }]}>
                {/* Handle */}
                <View style={s.handleRow} {...panHandlers}>
                    <View style={s.handle} />
                </View>

                {/* Header */}
                <View style={s.header}>
                    <View style={s.headerLeft}>
                        <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                            <Feather name="user" size={22} color="#374151" />
                        </View>
                        <View style={s.headerText}>
                            <Text style={s.patientName}>{patient.full_name}</Text>
                            <Text style={s.patientSubtitle}>
                                Patient ID: {patient.id.slice(0, 8)} • {patient.existing_conditions?.join(', ') ?? '—'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tab Bar */}
                <View style={s.tabRow}>
                    {TAB_CONFIG.map((tab) => {
                        const active = activeTab === tab.id;
                        return (
                            <Pressable
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id)}
                                style={[s.tab, active && s.tabActive]}
                            >
                                <Feather
                                    name={tab.icon}
                                    size={14}
                                    color={active ? doctorColors.primary : doctorColors.textMuted}
                                />
                                <Text style={[s.tabText, active && s.tabTextActive]}>
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Tab Content */}
                <ScrollView
                    style={s.tabContent}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.tabContentInner}
                >
                    {loadingRecords ? (
                        <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
                            <ActivityIndicator size="large" color={doctorColors.primary} />
                        </View>
                    ) : (
                        <>
                            {activeTab === 'history' && <HistoryTab records={records} />}
                            {activeTab === 'profile' && <ProfileTab patient={patient} />}
                            {activeTab === 'medications' && <MedicationsTab records={records} />}
                        </>
                    )}
                </ScrollView>

                {/* Footer (matching web) */}
                <View style={s.footer}>
                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            s.footerBtnOutline,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Text style={s.footerBtnOutlineText}>Close</Text>
                    </Pressable>
                    <Pressable
                        onPress={onNewPrescription}
                        style={({ pressed }) => [
                            s.footerBtnPrimary,
                            pressed && { backgroundColor: doctorColors.primaryDark },
                        ]}
                    >
                        <Feather name="file-text" size={15} color="#fff" />
                        <Text style={s.footerBtnPrimaryText}>New Prescription</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </Modal>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.9,
        backgroundColor: doctorColors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },

    // Handle
    handleRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: doctorColors.border },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    patientName: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
    },
    patientSubtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
        marginTop: spacing.xxs,
    },


    // Tabs
    tabRow: {
        flexDirection: 'row',
        marginHorizontal: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: doctorColors.borderLight,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: doctorColors.primary },
    tabText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },
    tabTextActive: { color: doctorColors.primary, fontFamily: typography.fontFamily.semiBold },

    // Scroll content
    tabContent: { flex: 1 },
    tabContentInner: { padding: spacing.xl, paddingBottom: spacing['6xl'] },

    // Shared section label
    sectionLabel: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },

    // ─── History Tab
    historyContainer: {},
    accordionWrapper: {
        marginBottom: spacing.sm,
    },
    consultationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
    },
    consultationItemActive: {
        borderColor: doctorColors.primary,
        backgroundColor: doctorColors.primaryLight,
    },
    consultationItemLeft: { flex: 1, marginRight: spacing.md },
    consultationDiagnosis: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    consultationDate: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginTop: spacing.xxs,
    },
    rxBadge: {
        backgroundColor: doctorColors.surfaceMuted,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.sm,
    },
    rxBadgeText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.xs,
        color: doctorColors.textSecondary,
    },

    // Detail panel
    detailPanel: {
        marginTop: spacing.lg,
        padding: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
    },
    detailTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.lg,
        color: doctorColors.textPrimary,
    },
    detailDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    detailDate: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },
    separator: {
        height: 1,
        backgroundColor: doctorColors.borderLight,
        marginVertical: spacing.lg,
    },
    detailSectionLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    detailBody: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        lineHeight: 20,
    },
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    vitalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        width: '48%',
        paddingVertical: spacing.xs,
    },
    vitalText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    rxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    rxText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        flex: 1,
    },
    followUpBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: '#FFFBEB',
        marginTop: spacing.lg,
    },
    followUpText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: '#92400E',
    },
    emptyDetail: {
        marginTop: spacing['2xl'],
        alignItems: 'center',
        paddingVertical: spacing['4xl'],
    },
    emptyDetailText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginTop: spacing.md,
    },

    // ─── Profile Tab
    infoCard: {
        gap: spacing.lg,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    infoRowText: {},
    infoLabel: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    infoValue: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    medicalBlock: {
        marginTop: spacing.lg,
    },
    medicalBlockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    medicalBlockTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    badge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.full,
    },
    badgeText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
    },
    emptyMedicalText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },
    emergencyCard: {
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surfaceMuted,
        marginTop: spacing.sm,
    },
    emergencyName: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    emergencyPhone: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginTop: spacing.xxs,
    },

    // ─── Medications Tab
    medicationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
        marginBottom: spacing.md,
    },
    medicationIcon: {
        padding: spacing.sm,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primaryLight,
    },
    medicationInfo: { flex: 1 },
    medicationName: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    medicationMeta: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginTop: spacing.xs,
    },

    // ─── Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    footerBtnOutline: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.border,
    },
    footerBtnOutlineText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    footerBtnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    footerBtnPrimaryText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: '#FFFFFF',
    },
});
