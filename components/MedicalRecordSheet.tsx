/**
 * CareConnect — Medical Record Bottom Sheet
 *
 * Reusable themed bottom sheet that displays full details
 * for a single medical record. Used on both the dashboard
 * and the dedicated records page.
 *
 * Props: visible, record (MedicalRecord | null), onClose
 *
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
 */

import {
    View,
    Text,
    Pressable,
    ScrollView,
    Modal,
    StyleSheet,
    Dimensions,
    Animated,
    Alert,
    ActivityIndicator,
} from 'react-native';

import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
    patientColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import type { MedicalRecord, PatientProfile } from '@/services/types';
import { useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { generatePrescriptionHTML } from '@/services/prescription-template';
import { useAuth } from '@/hooks/useAuth';
import { getDoctorById } from '@/services/doctor';
import { getHospitalBranding } from '@/services/caregiver';
import { API_BASE_URL } from '@/services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface Props {
    visible: boolean;
    record: MedicalRecord | null;
    onClose: () => void;
    patient?: PatientProfile | null;
}

function getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('');
}

async function generateAndDownloadPDF(
    record: MedicalRecord,
    token: string,
    patient?: PatientProfile | null,
    hospitalId?: string,
): Promise<void> {
    try {
        const [doctorProfile, branding] = await Promise.all([
            getDoctorById(record.doctor_id, token),
            hospitalId ? getHospitalBranding(hospitalId).catch(() => null) : Promise.resolve(null),
        ]);

        const logoUrl = branding?.logo_url
            ? branding.logo_url.startsWith('http')
                ? branding.logo_url
                : `${API_BASE_URL}${branding.logo_url}`
            : undefined;

        const html = generatePrescriptionHTML({
            record,
            doctor: {
                name: doctorProfile?.full_name || 'Doctor',
                specialization: doctorProfile?.specialization || 'Medical Professional',
                license: doctorProfile?.license_number || '',
                phone: doctorProfile?.phone_number ?? undefined,
                clinicName: doctorProfile?.clinic_name ?? undefined,
                clinicAddress: doctorProfile?.clinic_address ?? undefined,
            },
            hospital: {
                name: branding?.name || 'CareConnect',
                primaryColor: branding?.brand_color || '#1a3a52',
                secondaryColor: '#7bc041',
                headingFont: 'Segoe UI, sans-serif',
                bodyFont: 'Segoe UI, sans-serif',
                logoUrl,
            },
            patient,
        });
        console.log('📄 PDF Gen: HTML generated, converting to PDF...');

        const pdf = await Print.printToFileAsync({ html, base64: false });

        // Build a human-readable filename: prescription-<patient>-<short-id>.pdf
        const patientSlug = (patient?.full_name || 'patient')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        const shortId = record.id.replace(/-/g, '').slice(0, 6);
        const filename = `prescription-${patientSlug}-${shortId}.pdf`;

        const srcFile = new File(pdf.uri);
        const destFile = new File(Paths.cache, filename);
        if (destFile.exists) destFile.delete();
        srcFile.copy(destFile);

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(destFile.uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Prescription - ${record.diagnosis}`,
                UTI: 'com.adobe.pdf',
            });
        } else {
            Alert.alert('Success', `PDF saved as ${filename}`);
        }
    } catch (error) {
        console.error('📄 PDF Gen: Error -', error);
        console.error('Error generating PDF:', error);
        Alert.alert('Error', 'Failed to generate prescription PDF.');
    }
}

export default function MedicalRecordSheet({ visible, record, onClose, patient }: Props) {
    const insets = useSafeAreaInsets();
    const [isDownloading, setIsDownloading] = useState(false);
    const { token, user } = useAuth();

    const handleDownload = async () => {
        if (!record || isDownloading || !token) return;
        setIsDownloading(true);
        try {
            await generateAndDownloadPDF(record, token, patient, user?.hospitalId);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <ThemedBottomSheet visible={visible} onClose={onClose}>
            {record && (
                    <>

                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            bounces={true}
                        >
                            {/* Doctor info */}
                            <View style={styles.doctorRow}>
                                <View style={styles.doctorAvatar}>
                                    <Text style={styles.doctorAvatarText}>
                                        {getInitials('Doctor')}
                                    </Text>
                                </View>
                                <View style={styles.doctorInfo}>
                                    <Text style={styles.doctorName}>Doctor</Text>
                                    <Text style={styles.doctorDate}>{new Date(record.created_at).toLocaleDateString()}</Text>
                                </View>
                            </View>

                            {/* Diagnosis */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Feather name="activity" size={16} color={patientColors.primary} />
                                    <Text style={styles.sectionLabel}>Diagnosis</Text>
                                </View>
                                <Text style={styles.diagnosisText}>{record.diagnosis}</Text>
                            </View>

                            {/* Symptoms */}
                            {record.symptoms && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Feather name="list" size={16} color={patientColors.primary} />
                                        <Text style={styles.sectionLabel}>Symptoms</Text>
                                    </View>
                                    {record.symptoms.split(', ').map((s, i) => (
                                        <View key={i} style={styles.bulletRow}>
                                            <View style={styles.bullet} />
                                            <Text style={styles.bulletText}>{s.trim()}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Treatment */}
                            {record.treatment && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Feather name="clipboard" size={16} color={patientColors.primary} />
                                        <Text style={styles.sectionLabel}>Treatment</Text>
                                    </View>
                                    <Text style={styles.bodyText}>{record.treatment}</Text>
                                </View>
                            )}

                            {/* Prescriptions */}
                            {record.prescriptions.length > 0 && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Feather name="package" size={16} color={patientColors.primary} />
                                        <Text style={styles.sectionLabel}>Prescriptions</Text>
                                    </View>
                                    {record.prescriptions.map((p) => (
                                        <View key={p.id} style={styles.bulletRow}>
                                            <View style={styles.bullet} />
                                            <Text style={styles.bulletText}>
                                                {p.medication_name}{p.dosage ? ` — ${p.dosage}` : ''}{p.frequency ? ` (${p.frequency})` : ''}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Follow-up */}
                            {record.follow_up_date && (
                                <View style={styles.followUpBox}>
                                    <View style={styles.sectionHeader}>
                                        <Feather name="calendar" size={16} color={patientColors.primary} />
                                        <Text style={styles.sectionLabel}>Follow-Up</Text>
                                    </View>
                                    <Text style={styles.followUpText}>{new Date(record.follow_up_date).toLocaleDateString()}</Text>
                                </View>
                            )}

                            {/* Download */}
                            <Pressable
                                style={({ pressed }) => [styles.downloadBtn, pressed && { opacity: 0.8 }, isDownloading && { opacity: 0.6 }]}
                                onPress={handleDownload}
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <>
                                        <ActivityIndicator size="small" color={patientColors.primary} />
                                        <Text style={styles.downloadText}>Generating...</Text>
                                    </>
                                ) : (
                                    <>
                                        <Feather name="download" size={18} color={patientColors.primary} />
                                        <Text style={styles.downloadText}>Download PDF</Text>
                                    </>
                                )}
                            </Pressable>

                            <View style={{ height: spacing['3xl'] }} />
                        </ScrollView>
                    </>
            )}
            
        </ThemedBottomSheet>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    
    
    
    

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.lg,
        color: patientColors.textPrimary,
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: radii.full,
        backgroundColor: patientColors.surfaceMuted,
        alignItems: 'center', justifyContent: 'center',
    },

    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

    // Doctor
    doctorRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        marginBottom: spacing.xl, backgroundColor: patientColors.surfaceMuted,
        borderRadius: radii.md, padding: spacing.md,
    },
    doctorAvatar: {
        width: 44, height: 44, borderRadius: radii.full,
        backgroundColor: patientColors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
    },
    doctorAvatarText: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.sm,
        color: patientColors.primary,
    },
    doctorInfo: { flex: 1 },
    doctorName: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base,
        color: patientColors.textPrimary,
    },
    doctorDate: {
        fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: patientColors.textMuted,
    },

    // Sections
    section: { marginBottom: spacing.lg },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    sectionLabel: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.sm,
        color: patientColors.textSecondary, textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    diagnosisText: {
        fontFamily: typography.fontFamily.bold, ...typography.size.lg,
        color: patientColors.textPrimary, lineHeight: 26,
    },
    bodyText: {
        fontFamily: typography.fontFamily.regular, ...typography.size.base,
        color: patientColors.textPrimary, lineHeight: 22,
    },
    bulletRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        gap: spacing.sm, marginBottom: spacing.xs, paddingLeft: spacing.xs,
    },
    bullet: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: patientColors.primary, marginTop: 8,
    },
    bulletText: {
        flex: 1, fontFamily: typography.fontFamily.regular,
        ...typography.size.base, color: patientColors.textPrimary, lineHeight: 22,
    },

    // Follow-up
    followUpBox: {
        backgroundColor: patientColors.primaryLight, borderRadius: radii.md,
        padding: spacing.md, marginBottom: spacing.lg,
    },
    followUpText: {
        fontFamily: typography.fontFamily.medium, ...typography.size.base,
        color: patientColors.primaryDark, lineHeight: 22,
    },

    // Download
    downloadBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radii.md,
        borderWidth: 1.5, borderColor: patientColors.primary,
    },
    downloadText: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base,
        color: patientColors.primary,
    },
});
