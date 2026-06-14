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
    shadows,
    radii,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedText, ThemedView } from '@/components/shared/Themed';
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
    const { colors } = useTheme();
    return (
        <View style={s.infoRow}>
            <Feather name={icon} size={16} color={colors.textMuted} />
            <View style={s.infoRowText}>
                <ThemedText color="muted" size="xs" style={s.infoLabel}>{label}</ThemedText>
                <ThemedText color="primary" weight="semiBold" size="base" style={s.infoValue}>{value}</ThemedText>
            </View>
        </View>
    );
}

function Badge({ label, variant }: { label: string; variant: 'danger' | 'info' }) {
    const { colors } = useTheme();
    const bg = variant === 'danger' ? '#FEE2E2' : colors.primaryLight;
    const color = variant === 'danger' ? '#EF4444' : colors.primary;
    return (
        <View style={[s.badge, { backgroundColor: bg }]}>
            <ThemedText weight="medium" size="sm" style={[s.badgeText, { color }]}>{label}</ThemedText>
        </View>
    );
}

// ─── Tab: Consultation History ──────────────────────────────────────────────

function HistoryTab({ records }: { records: MedicalRecord[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { colors } = useTheme();

    const toggle = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    if (records.length === 0) {
        return (
            <View style={s.historyContainer}>
                <ThemedText color="muted" weight="semiBold" size="sm" style={s.sectionLabel}>Past Consultations (0)</ThemedText>
                <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
                    <Feather name="file-text" size={32} color={colors.textMuted} />
                    <ThemedText color="muted" size="sm" style={{ marginTop: spacing.md }}>No consultation records yet</ThemedText>
                </View>
            </View>
        );
    }

    return (
        <View style={s.historyContainer}>
            <ThemedText color="muted" weight="semiBold" size="sm" style={s.sectionLabel}>
                Past Consultations ({records.length})
            </ThemedText>
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
                                { borderColor: colors.borderLight },
                                isOpen && [s.consultationItemActive, { borderColor: colors.primary, backgroundColor: colors.primaryLight }],
                            ]}
                        >
                            <View style={s.consultationItemLeft}>
                                <ThemedText color="primary" weight="semiBold" size="base" style={s.consultationDiagnosis}>{record.diagnosis}</ThemedText>
                                <ThemedText color="muted" size="sm" style={s.consultationDate}>{formatRecordDate(record.created_at)}</ThemedText>
                            </View>
                            <View style={[s.rxBadge, { backgroundColor: colors.surfaceMuted }]}>
                                <ThemedText color="secondary" weight="medium" size="xs" style={s.rxBadgeText}>{record.prescriptions.length} Rx</ThemedText>
                            </View>
                        </Pressable>

                        {/* Accordion Body (inline detail) */}
                        {isOpen && (
                            <View style={[s.detailPanel, { borderColor: colors.borderLight }]}>
                                {/* Vitals */}
                                <ThemedText color="muted" weight="medium" size="sm" style={[s.detailSectionLabel, { marginTop: 0 }]}>Vitals</ThemedText>
                                <View style={s.vitalsGrid}>
                                    <View style={s.vitalItem}>
                                        <Feather name="heart" size={14} color="#EF4444" />
                                        <ThemedText color="primary" size="sm" style={s.vitalText}>BP: {vitals.bp}</ThemedText>
                                    </View>
                                    <View style={s.vitalItem}>
                                        <Feather name="activity" size={14} color="#EC4899" />
                                        <ThemedText color="primary" size="sm" style={s.vitalText}>Pulse: {vitals.pulse}</ThemedText>
                                    </View>
                                    <View style={s.vitalItem}>
                                        <Feather name="thermometer" size={14} color="#F97316" />
                                        <ThemedText color="primary" size="sm" style={s.vitalText}>Temp: {vitals.temp}</ThemedText>
                                    </View>
                                    <View style={s.vitalItem}>
                                        <Feather name="trending-up" size={14} color="#3B82F6" />
                                        <ThemedText color="primary" size="sm" style={s.vitalText}>Weight: {vitals.weight}</ThemedText>
                                    </View>
                                </View>

                                <View style={[s.separator, { backgroundColor: colors.borderLight }]} />

                                {/* Symptoms */}
                                <ThemedText color="muted" weight="medium" size="sm" style={[s.detailSectionLabel, { marginTop: 0 }]}>Symptoms</ThemedText>
                                <ThemedText color="primary" size="sm" style={s.detailBody}>{record.symptoms ?? '—'}</ThemedText>

                                {/* Treatment */}
                                <ThemedText color="muted" weight="medium" size="sm" style={s.detailSectionLabel}>Treatment</ThemedText>
                                <ThemedText color="primary" size="sm" style={s.detailBody}>{record.treatment ?? '—'}</ThemedText>

                                {/* Prescriptions */}
                                <ThemedText color="muted" weight="medium" size="sm" style={s.detailSectionLabel}>Prescriptions</ThemedText>
                                {rxStrings.map((rx, i) => (
                                    <View key={i} style={s.rxRow}>
                                        <Feather name="package" size={13} color={colors.primary} />
                                        <ThemedText color="primary" size="sm" style={s.rxText}>{rx}</ThemedText>
                                    </View>
                                ))}

                                {/* Follow-up */}
                                {record.follow_up_date && (
                                    <View style={s.followUpBanner}>
                                        <Feather name="clock" size={14} color="#92400E" />
                                        <ThemedText weight="medium" size="sm" style={s.followUpText}>
                                            Follow-up scheduled: {formatRecordDate(record.follow_up_date)}
                                        </ThemedText>
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
    const { colors } = useTheme();
    return (
        <View>
            {/* Personal Information */}
            <ThemedText color="muted" weight="semiBold" size="sm" style={s.sectionLabel}>Personal Information</ThemedText>
            <View style={s.infoCard}>
                <InfoRow icon="user" label="Full Name" value={patient.full_name} />
                <InfoRow icon="calendar" label="Date of Birth" value={patient.date_of_birth ?? '—'} />
                <InfoRow icon="phone" label="Phone" value={patient.whatsapp_number ?? '—'} />
                <InfoRow icon="map-pin" label="Address" value={patient.address ?? '—'} />
                <InfoRow icon="droplet" label="Blood Group" value={patient.blood_group ?? '—'} />
            </View>

            {/* Medical Information */}
            <ThemedText color="muted" weight="semiBold" size="sm" style={[s.sectionLabel, { marginTop: spacing['2xl'] }]}>
                Medical Information
            </ThemedText>

            {/* Allergies */}
            <View style={s.medicalBlock}>
                <View style={s.medicalBlockHeader}>
                    <Feather name="alert-circle" size={15} color="#EF4444" />
                    <ThemedText color="primary" weight="semiBold" size="sm" style={s.medicalBlockTitle}>Known Allergies</ThemedText>
                </View>
                <View style={s.badgeRow}>
                    {(patient.allergies?.length ?? 0) > 0 ? (
                        patient.allergies!.map((a) => (
                            <Badge key={a} label={a} variant="danger" />
                        ))
                    ) : (
                        <ThemedText color="muted" size="sm" style={s.emptyMedicalText}>No known allergies</ThemedText>
                    )}
                </View>
            </View>

            {/* Existing Conditions */}
            <View style={s.medicalBlock}>
                <View style={s.medicalBlockHeader}>
                    <Feather name="activity" size={15} color="#F59E0B" />
                    <ThemedText color="primary" weight="semiBold" size="sm" style={s.medicalBlockTitle}>Existing Conditions</ThemedText>
                </View>
                <View style={s.badgeRow}>
                    {(patient.existing_conditions?.length ?? 0) > 0 ? (
                        patient.existing_conditions!.map((c) => (
                            <Badge key={c} label={c} variant="info" />
                        ))
                    ) : (
                        <ThemedText color="muted" size="sm" style={s.emptyMedicalText}>No existing conditions</ThemedText>
                    )}
                </View>
            </View>

            {/* Emergency Contact */}
            <View style={s.medicalBlock}>
                <ThemedText color="primary" weight="semiBold" size="sm" style={s.medicalBlockTitle}>Emergency Contact</ThemedText>
                <View style={[s.emergencyCard, { backgroundColor: colors.surfaceMuted }]}>
                    <ThemedText color="primary" weight="semiBold" size="base" style={s.emergencyName}>{patient.emergency_contact_name ?? '—'}</ThemedText>
                    <ThemedText color="muted" size="sm" style={s.emergencyPhone}>{patient.emergency_contact_phone ?? '—'}</ThemedText>
                </View>
            </View>
        </View>
    );
}

// ─── Tab: Medications ───────────────────────────────────────────────────────

function MedicationsTab({ records }: { records: MedicalRecord[] }) {
    const { colors } = useTheme();
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
                <ThemedText color="muted" weight="semiBold" size="sm" style={s.sectionLabel}>Current & Past Medications</ThemedText>
                <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
                    <Feather name="package" size={32} color={colors.textMuted} />
                    <ThemedText color="muted" size="sm" style={{ marginTop: spacing.md }}>No medications prescribed yet</ThemedText>
                </View>
            </View>
        );
    }

    return (
        <View>
            <ThemedText color="muted" weight="semiBold" size="sm" style={s.sectionLabel}>Current & Past Medications</ThemedText>
            {allRx.map((rx) => (
                <View key={rx.key} style={[s.medicationRow, { borderColor: colors.borderLight }]}>
                    <View style={[s.medicationIcon, { backgroundColor: colors.primaryLight }]}>
                        <Feather name="package" size={18} color={colors.primary} />
                    </View>
                    <View style={s.medicationInfo}>
                        <ThemedText color="primary" weight="semiBold" size="base" style={s.medicationName}>{rx.label}</ThemedText>
                        <ThemedText color="muted" size="sm" style={s.medicationMeta}>
                            Prescribed on {rx.date} for {rx.diagnosis}
                        </ThemedText>
                    </View>
                </View>
            ))}
        </View>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PatientChartModal({ visible, patient, onClose, onNewPrescription }: PatientChartModalProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
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
            <Animated.View style={[s.sheet, { backgroundColor: colors.surface }, animatedStyle, { paddingBottom: insets.bottom }]}>
                {/* Handle */}
                <View style={s.handleRow} {...panHandlers}>
                    <View style={[s.handle, { backgroundColor: colors.border }]} />
                </View>

                {/* Header */}
                <View style={s.header}>
                    <View style={s.headerLeft}>
                        <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                            <Feather name="user" size={22} color="#374151" />
                        </View>
                        <View style={s.headerText}>
                            <ThemedText color="primary" weight="bold" size="xl" style={s.patientName}>{patient.full_name}</ThemedText>
                            <ThemedText color="muted" size="xs" style={s.patientSubtitle}>
                                Patient ID: {patient.id.slice(0, 8)} • {patient.existing_conditions?.join(', ') ?? '—'}
                            </ThemedText>
                        </View>
                    </View>
                </View>

                {/* Tab Bar */}
                <View style={[s.tabRow, { borderBottomColor: colors.borderLight }]}>
                    {TAB_CONFIG.map((tab) => {
                        const active = activeTab === tab.id;
                        return (
                            <Pressable
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id)}
                                style={[s.tab, active && [s.tabActive, { borderBottomColor: colors.primary }]]}
                            >
                                <Feather
                                    name={tab.icon}
                                    size={14}
                                    color={active ? colors.primary : colors.textMuted}
                                />
                                <ThemedText weight={active ? "semiBold" : "medium"} size="sm" style={[s.tabText, active && [s.tabTextActive, { color: colors.primary }]]}>
                                    {tab.label}
                                </ThemedText>
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
                            <ActivityIndicator size="large" color={colors.primary} />
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
                <View style={[s.footer, { borderTopColor: colors.borderLight }]}>
                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            s.footerBtnOutline,
                            { borderColor: colors.border },
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <ThemedText color="primary" weight="medium" size="sm" style={s.footerBtnOutlineText}>Close</ThemedText>
                    </Pressable>
                    <Pressable
                        onPress={onNewPrescription}
                        style={({ pressed }) => [
                            s.footerBtnPrimary,
                            { backgroundColor: colors.primary },
                            pressed && { opacity: 0.85 },
                        ]}
                    >
                        <Feather name="file-text" size={15} color="#fff" />
                        <ThemedText weight="semiBold" size="sm" style={s.footerBtnPrimaryText}>New Prescription</ThemedText>
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
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },

    // Handle
    handleRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
    handle: { width: 40, height: 4, borderRadius: 2 },

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
    },
    patientSubtitle: {
        marginTop: spacing.xxs,
    },


    // Tabs
    tabRow: {
        flexDirection: 'row',
        marginHorizontal: spacing.xl,
        borderBottomWidth: 1,
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
    tabActive: { },
    tabText: {
    },
    tabTextActive: { },

    // Scroll content
    tabContent: { flex: 1 },
    tabContentInner: { padding: spacing.xl, paddingBottom: spacing['6xl'] },

    // Shared section label
    sectionLabel: {
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
    },
    consultationItemActive: {
    },
    consultationItemLeft: { flex: 1, marginRight: spacing.md },
    consultationDiagnosis: {
    },
    consultationDate: {
        marginTop: spacing.xxs,
    },
    rxBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radii.sm,
    },
    rxBadgeText: {
    },

    // Detail panel
    detailPanel: {
        marginTop: spacing.lg,
        padding: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    detailTitle: {
    },
    detailDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    detailDate: {
    },
    separator: {
        height: 1,
        marginVertical: spacing.lg,
    },
    detailSectionLabel: {
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    detailBody: {
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
    },
    rxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    rxText: {
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
        color: '#92400E',
    },
    emptyDetail: {
        marginTop: spacing['2xl'],
        alignItems: 'center',
        paddingVertical: spacing['4xl'],
    },
    emptyDetailText: {
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
    },
    infoValue: {
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
    },
    emptyMedicalText: {
    },
    emergencyCard: {
        padding: spacing.md,
        borderRadius: radii.md,
        marginTop: spacing.sm,
    },
    emergencyName: {
    },
    emergencyPhone: {
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
        marginBottom: spacing.md,
    },
    medicationIcon: {
        padding: spacing.sm,
        borderRadius: radii.md,
    },
    medicationInfo: { flex: 1 },
    medicationName: {
    },
    medicationMeta: {
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
    },
    footerBtnOutline: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    footerBtnOutlineText: {
    },
    footerBtnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.md,
    },
    footerBtnPrimaryText: {
        color: '#FFFFFF',
    },
});
