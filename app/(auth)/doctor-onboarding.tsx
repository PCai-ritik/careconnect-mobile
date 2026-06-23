/**
 * CareConnect -- Doctor Onboarding Wizard
 *
 * 3-step paginated wizard after doctor registration:
 *   Step 1: Professional Verification (with AI document auto-fill)
 *   Step 2: Availability Schedule
 *   Step 3: Payments and Consent
 *
 * Uses Doctor theme (terracotta). All data is console.logged on completion.
 */

import { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Alert,
    Switch,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { useAuth } from '@/hooks/useAuth';
import { submitDoctorOnboarding, submitDoctorAvailability, verifyMedicalLicense } from '@/services/doctor';
import {
    doctorColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';

// -- Types --

interface TimeInterval {
    startTime: string;
    endTime: string;
}

interface DaySchedule {
    enabled: boolean;
    intervals: TimeInterval[];
}

interface VerificationData {
    licenseNumber: string;
    licenseState: string;
    clinicName: string;
    clinicAddress: string;
    bio: string;
    localDocumentUri: string;
    specialization: string;
    experience: string;
}

interface AvailabilityData {
    schedule: Record<string, DaySchedule>;
    acceptsInPerson: boolean;
    inPersonSchedule: Record<string, DaySchedule>;
    consultationDuration: string;
    timezone: string;
}

interface PaymentsData {
    consultationFee: string;
    currency: string;
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    acceptedPaymentMethods: string[];
    termsAccepted: boolean;
    hipaaAccepted: boolean;
    privacyAccepted: boolean;
}


// -- Constants --

const STEPS = [
    { title: 'Verification', icon: 'shield' as const },
    { title: 'Video', icon: 'camera' as const },
    { title: 'In-Person', icon: 'map-pin' as const },
    { title: 'Payments', icon: 'credit-card' as const },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DURATION_OPTIONS = ['15 min', '30 min', '45 min', '60 min'];

const SPECIALIZATIONS = [
    'General Practice', 'Internal Medicine', 'Cardiology', 'Dermatology',
    'Endocrinology', 'Gastroenterology', 'Neurology', 'Obstetrics & Gynecology',
    'Oncology', 'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Psychiatry',
    'Pulmonology', 'Radiology', 'Rheumatology', 'Surgery', 'Urology',
    'Anesthesiology', 'Emergency Medicine', 'Family Medicine', 'Nephrology',
    'Pathology', 'ENT (Otolaryngology)', 'Ayurveda', 'Homeopathy',
];

const EXPERIENCE_OPTIONS = ['0-2 years', '3-5 years', '6-10 years', '11-20 years', '20+ years'];

const TIMEZONE_OPTIONS = [
    'Asia/Kolkata (IST, UTC+5:30)',
    'Asia/Dubai (GST, UTC+4)',
    'Asia/Singapore (SGT, UTC+8)',
    'Europe/London (GMT/BST)',
    'America/New_York (EST, UTC-5)',
    'America/Los_Angeles (PST, UTC-8)',
];

const CURRENCY_OPTIONS = [
    { code: 'INR', label: '₹ INR – Indian Rupee' },
    { code: 'USD', label: '$ USD – US Dollar' },
    { code: 'EUR', label: '€ EUR – Euro' },
    { code: 'GBP', label: '£ GBP – British Pound' },
];

const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', icon: 'smartphone' as const },
    { id: 'card', label: 'Credit / Debit', icon: 'credit-card' as const },
    { id: 'netbanking', label: 'Net Banking', icon: 'globe' as const },
    { id: 'cash', label: 'Cash', icon: 'dollar-sign' as const },
];

const defaultSchedule: Record<string, DaySchedule> = DAYS.reduce((acc, day) => ({
    ...acc,
    [day]: {
        enabled: day !== 'Saturday' && day !== 'Sunday',
        intervals: [{ startTime: '09:00', endTime: '17:00' }],
    },
}), {} as Record<string, DaySchedule>);

// -- TimeDial --

function pad(n: number) {
    return String(n).padStart(2, '0');
}

function TimeDial({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [h, m] = value.split(':').map(Number);
    const setH = (next: number) => onChange(`${pad(((next % 24) + 24) % 24)}:${pad(m)}`);
    const setM = (next: number) => onChange(`${pad(h)}:${pad(((next % 60) + 60) % 60)}`);

    return (
        <View style={dialS.row}>
            <View style={dialS.col}>
                <Pressable onPress={() => setH(h + 1)} hitSlop={8} style={dialS.arrow}>
                    <Feather name="chevron-up" size={14} color={doctorColors.primary} />
                </Pressable>
                <View style={dialS.digitBox}>
                    <Text style={dialS.digit}>{pad(h)}</Text>
                </View>
                <Pressable onPress={() => setH(h - 1)} hitSlop={8} style={dialS.arrow}>
                    <Feather name="chevron-down" size={14} color={doctorColors.primary} />
                </Pressable>
            </View>
            <Text style={dialS.colon}>:</Text>
            <View style={dialS.col}>
                <Pressable onPress={() => setM(m + 15)} hitSlop={8} style={dialS.arrow}>
                    <Feather name="chevron-up" size={14} color={doctorColors.primary} />
                </Pressable>
                <View style={dialS.digitBox}>
                    <Text style={dialS.digit}>{pad(m)}</Text>
                </View>
                <Pressable onPress={() => setM(m - 15)} hitSlop={8} style={dialS.arrow}>
                    <Feather name="chevron-down" size={14} color={doctorColors.primary} />
                </Pressable>
            </View>
        </View>
    );
}

const dialS = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    col: { alignItems: 'center', gap: 2 },
    arrow: { width: 28, height: 20, alignItems: 'center', justifyContent: 'center' },
    digitBox: {
        width: 32,
        paddingVertical: 4,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: doctorColors.border,
        backgroundColor: doctorColors.surface,
        alignItems: 'center',
    },
    digit: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 13,
        color: doctorColors.textPrimary,
    },
    colon: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 16,
        color: doctorColors.textMuted,
        marginBottom: 2,
        marginHorizontal: 1,
    },
});

// -- DayCard --

function DayCard({
    day,
    sched,
    onToggle,
    onUpdateInterval,
    onAddInterval,
    onRemoveInterval,
}: {
    day: string;
    sched: DaySchedule;
    onToggle: () => void;
    onUpdateInterval: (idx: number, field: 'startTime' | 'endTime', value: string) => void;
    onAddInterval: () => void;
    onRemoveInterval: (idx: number) => void;
}) {
    return (
        <View style={[
            cardS.card,
            {
                borderColor: sched.enabled ? doctorColors.primary + '33' : doctorColors.border,
                backgroundColor: sched.enabled ? doctorColors.primaryLight + '18' : doctorColors.surface,
            },
        ]}>
            <View style={cardS.topRow}>
                <Text style={[cardS.dayName, { color: sched.enabled ? doctorColors.textPrimary : doctorColors.textMuted }]}>
                    {day}
                </Text>
                <Switch
                    value={sched.enabled}
                    onValueChange={onToggle}
                    trackColor={{ false: doctorColors.border, true: doctorColors.primary }}
                    thumbColor="#FFFFFF"
                />
            </View>
            {sched.enabled && (
                <View style={cardS.intervals}>
                    {sched.intervals.map((interval, idx) => (
                        <View key={idx} style={cardS.intervalRow}>
                            <TimeDial
                                value={interval.startTime}
                                onChange={(v) => onUpdateInterval(idx, 'startTime', v)}
                            />
                            <Text style={cardS.toText}>to</Text>
                            <TimeDial
                                value={interval.endTime}
                                onChange={(v) => onUpdateInterval(idx, 'endTime', v)}
                            />
                            <View style={cardS.ctrlBtns}>
                                {sched.intervals.length > 1 && (
                                    <Pressable
                                        onPress={() => onRemoveInterval(idx)}
                                        hitSlop={6}
                                        style={({ pressed }) => [cardS.ctrlBtn, pressed && { opacity: 0.6 }]}
                                    >
                                        <Feather name="x" size={14} color="#EF4444" />
                                    </Pressable>
                                )}
                                {idx === sched.intervals.length - 1 && (
                                    <Pressable
                                        onPress={onAddInterval}
                                        hitSlop={6}
                                        style={({ pressed }) => [cardS.ctrlBtn, pressed && { opacity: 0.6 }]}
                                    >
                                        <Feather name="plus" size={14} color={doctorColors.primary} />
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const cardS = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dayName: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 15,
    },
    intervals: {
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    intervalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    toText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: 12,
        color: doctorColors.textMuted,
    },
    ctrlBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginLeft: spacing.xs,
    },
    ctrlBtn: {
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.sm,
    },
});

// -- Component --

export default function DoctorOnboardingScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const scrollRef = useRef<ScrollView>(null);

    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    // Step 1: Verification
    const [verification, setVerification] = useState<VerificationData>({
        licenseNumber: '',
        licenseState: '',
        clinicName: '',
        clinicAddress: '',
        bio: '',
        localDocumentUri: '',
        specialization: '',
        experience: '',
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [specSearchText, setSpecSearchText] = useState('');
    const [showSpecDropdown, setShowSpecDropdown] = useState(false);
    const [showExpDropdown, setShowExpDropdown] = useState(false);

    // Step 2: Availability
    const [availability, setAvailability] = useState<AvailabilityData>({
        schedule: { ...defaultSchedule },
        acceptsInPerson: true,
        inPersonSchedule: { ...defaultSchedule },
        consultationDuration: '30 min',
        timezone: 'Asia/Kolkata (IST, UTC+5:30)',
    });
    const [showDurationDropdown, setShowDurationDropdown] = useState(false);
    const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);

    // Step 3: Payments
    const [payments, setPayments] = useState<PaymentsData>({
        consultationFee: '',
        currency: 'INR',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        acceptedPaymentMethods: ['upi'],
        termsAccepted: false,
        hipaaAccepted: false,
        privacyAccepted: false,
    });
    const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

    // -- Navigation --

    const goNext = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
    };

    // -- Document Picker --

    const handleDocumentPick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/jpeg', 'image/png'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            setVerification((prev) => ({ ...prev, localDocumentUri: file.uri }));
            setIsAnalyzing(true);

            const SecureStore = await import('expo-secure-store');
            const token = await SecureStore.getItemAsync('careconnect_onboarding_token');
            if (!token) {
                Alert.alert('Session Error', 'Could not retrieve your session. Please go back and try again.');
                return;
            }

            const extracted = await verifyMedicalLicense(
                token,
                file.uri,
                file.name ?? 'license.jpg',
                file.mimeType ?? 'image/jpeg',
            );

            setVerification((prev) => ({
                ...prev,
                licenseNumber: extracted.license_number,
                licenseState: extracted.license_state,
            }));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Could not verify the document. Please try again.';
            Alert.alert('Verification Failed', message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // -- Schedule Helpers --

    const toggleDay = (day: string, target: 'schedule' | 'inPersonSchedule' = 'schedule') => {
        setAvailability((prev) => ({
            ...prev,
            [target]: {
                ...prev[target],
                [day]: { ...prev[target][day], enabled: !prev[target][day].enabled },
            },
        }));
    };

    const updateIntervalField = (day: string, index: number, field: 'startTime' | 'endTime', value: string, target: 'schedule' | 'inPersonSchedule' = 'schedule') => {
        setAvailability((prev) => {
            const intervals = [...prev[target][day].intervals];
            intervals[index] = { ...intervals[index], [field]: value };
            return {
                ...prev,
                [target]: {
                    ...prev[target],
                    [day]: { ...prev[target][day], intervals },
                },
            };
        });
    };

    const addInterval = (day: string, target: 'schedule' | 'inPersonSchedule' = 'schedule') => {
        setAvailability((prev) => ({
            ...prev,
            [target]: {
                ...prev[target],
                [day]: {
                    ...prev[target][day],
                    intervals: [...prev[target][day].intervals, { startTime: '09:00', endTime: '17:00' }],
                },
            },
        }));
    };

    const removeInterval = (day: string, index: number, target: 'schedule' | 'inPersonSchedule' = 'schedule') => {
        setAvailability((prev) => {
            const newIntervals = [...prev[target][day].intervals];
            newIntervals.splice(index, 1);
            return {
                ...prev,
                [target]: {
                    ...prev[target],
                    [day]: { ...prev[target][day], intervals: newIntervals },
                },
            };
        });
    };

    const cycleDuration = () => {
        setShowDurationDropdown((v) => !v);
    };

    const cycleExperience = () => {
        setShowExpDropdown((v) => !v);
    };

    const cycleTimezone = () => {
        setShowTimezoneDropdown((v) => !v);
    };

    const cycleCurrency = () => {
        setShowCurrencyDropdown((v) => !v);
    };

    const togglePaymentMethod = (id: string) => {
        setPayments((p) => {
            const has = p.acceptedPaymentMethods.includes(id);
            return {
                ...p,
                acceptedPaymentMethods: has
                    ? p.acceptedPaymentMethods.filter((m) => m !== id)
                    : [...p.acceptedPaymentMethods, id],
            };
        });
    };

    const filteredSpecs = SPECIALIZATIONS.filter((s) =>
        s.toLowerCase().includes(specSearchText.toLowerCase())
    );

    // -- Final Submit --

    const allConsentsAccepted = payments.termsAccepted && payments.hipaaAccepted && payments.privacyAccepted;

    const handleComplete = async () => {
        if (!allConsentsAccepted) return;
        setIsSubmitting(true);

        try {
            // 1. Read the token stored during registration
            const SecureStore = await import('expo-secure-store');
            const token = await SecureStore.getItemAsync('careconnect_onboarding_token');
            const userJson = await SecureStore.getItemAsync('careconnect_onboarding_user');

            if (!token || !userJson) {
                Alert.alert('Session Expired', 'Please register again.');
                router.replace('/(auth)/doctor-register');
                return;
            }

            // 2. Submit onboarding profile data → PUT /doctors/onboarding
            const durationNum = parseInt(availability.consultationDuration) || 30;
            const feeNum = parseFloat(payments.consultationFee) || 0;

            await submitDoctorOnboarding(token, {
                specialization: verification.specialization,
                years_of_experience: verification.experience,
                license_number: verification.licenseNumber,
                clinic_name: verification.clinicName,
                clinic_address: verification.clinicAddress,
                bio: verification.bio,
                consultation_duration_minutes: durationNum,
                video_consultation_fee: feeNum,
                in_person_consultation_fee: feeNum,
                currency: payments.currency,
                accepted_payment_methods: payments.acceptedPaymentMethods,
            });

            // 3. Submit availability schedule → PUT /doctors/availability
            // Transform Record<string, DaySchedule> → DoctorAvailabilitySlot[]
            let slots: any[] = [];
            Object.entries(availability.schedule).forEach(([day, sched]) => {
                if (sched.enabled) {
                    sched.intervals.forEach((interval) => {
                        slots.push({
                            day_of_week: day.toUpperCase(),
                            start_time: `${interval.startTime}:00`,    // HH:MM → HH:MM:SS
                            end_time: `${interval.endTime}:00`,
                            is_enabled: true,
                            appointment_type: 'VIDEO' as const,
                        });
                    });
                }
            });

            if (availability.acceptsInPerson) {
                Object.entries(availability.inPersonSchedule).forEach(([day, sched]) => {
                    if (sched.enabled) {
                        sched.intervals.forEach((interval) => {
                            slots.push({
                                day_of_week: day.toUpperCase(),
                                start_time: `${interval.startTime}:00`,
                                end_time: `${interval.endTime}:00`,
                                is_enabled: true,
                                appointment_type: 'IN_PERSON' as const,
                            });
                        });
                    }
                });
            }

            // Only submit slots that are enabled to save bandwidth
            const enabledSlots = slots.filter(s => s.is_enabled);
            await submitDoctorAvailability(token, enabledSlots as any);

            // 4. Clean up onboarding tokens
            await SecureStore.deleteItemAsync('careconnect_onboarding_token');
            await SecureStore.deleteItemAsync('careconnect_onboarding_user');

            // 5. Authenticate — this triggers the auth layout redirect to /(doctor)
            const userData = JSON.parse(userJson);
            await login({
                access_token: token,
                token_type: 'bearer',
                user_id: userData.user_id,
                hospital_id: userData.hospital_id || 'unassigned',
                role: userData.role,
            });

            setIsSubmitting(false);
            setShowCompleteModal(true);
        } catch (error: unknown) {
            setIsSubmitting(false);
            const message = error instanceof Error ? error.message : 'Failed to complete onboarding. Please try again.';
            Alert.alert('Onboarding Failed', message);
        }
    };

    // -- Render --

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Completion Modal ───────────────────────────── */}
            <Modal
                visible={showCompleteModal}
                transparent
                animationType="fade"
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconCircle}>
                            <Feather name="check" size={32} color="#FFFFFF" />
                        </View>
                        <Text style={styles.modalTitle}>Welcome aboard!</Text>
                        <Text style={styles.modalBody}>
                            Your doctor profile has been set up successfully. Let&apos;s get started!
                        </Text>
                        <Pressable
                            style={({ pressed }) => [
                                styles.modalButton,
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={() => {
                                setShowCompleteModal(false);
                                router.replace('/(doctor)');
                            }}
                        >
                            <Text style={styles.modalButtonText}>Continue</Text>
                            <Feather name="arrow-right" size={18} color="#FFFFFF" />
                        </Pressable>
                    </View>
                </View>
            </Modal>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Feather name="activity" size={20} color={doctorColors.primary} />
                        <Text style={styles.headerTitle}>Doctor Onboarding</Text>
                    </View>
                    <Text style={styles.stepIndicator}>{currentStep + 1} / {STEPS.length}</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
                    </View>
                    <View style={styles.stepLabels}>
                        {STEPS.map((step, i) => (
                            <Text
                                key={step.title}
                                style={[styles.stepLabel, i <= currentStep && styles.stepLabelActive]}
                            >
                                {step.title}
                            </Text>
                        ))}
                    </View>
                </View>

                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Step 1: Verification ─────────────────────── */}
                    {currentStep === 0 && (
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconCircle}>
                                    <Feather name="shield" size={24} color={doctorColors.primary} />
                                </View>
                                <Text style={styles.stepTitle}>Professional Verification</Text>
                            </View>

                            {/* Document Upload */}
                            <Pressable
                                style={[styles.uploadArea, isAnalyzing && styles.uploadAreaActive]}
                                onPress={handleDocumentPick}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <View style={styles.uploadContent}>
                                        <ActivityIndicator size="small" color={doctorColors.primary} />
                                        <Text style={styles.uploadAnalyzing}>Analyzing document...</Text>
                                    </View>
                                ) : verification.localDocumentUri ? (
                                    <View style={styles.uploadContent}>
                                        <Feather name="check-circle" size={24} color={doctorColors.success} />
                                        <Text style={styles.uploadSuccess}>Document uploaded</Text>
                                        <Text style={styles.uploadHint}>Tap to replace</Text>
                                    </View>
                                ) : (
                                    <View style={styles.uploadContent}>
                                        <Feather name="upload" size={24} color={doctorColors.textMuted} />
                                        <Text style={styles.uploadLabel}>Upload medical license</Text>
                                        <Text style={styles.uploadHint}>PDF, JPG, or PNG</Text>
                                    </View>
                                )}
                            </Pressable>

                            {/* Specialization (searchable dropdown) */}
                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>PRIMARY SPECIALIZATION <Text style={styles.requiredStar}>*</Text></Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. Cardiology"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={showSpecDropdown ? specSearchText : verification.specialization}
                                        onChangeText={(v) => {
                                            setSpecSearchText(v);
                                            setShowSpecDropdown(true);
                                            setVerification((p) => ({ ...p, specialization: v }));
                                        }}
                                        onFocus={() => {
                                            setShowSpecDropdown(true);
                                            setSpecSearchText(verification.specialization);
                                        }}
                                    />
                                    <Pressable onPress={() => setShowSpecDropdown((v) => !v)}>
                                        <Feather name="chevron-down" size={16} color={doctorColors.textMuted} />
                                    </Pressable>
                                </View>
                                {showSpecDropdown && filteredSpecs.length > 0 && (
                                    <View style={styles.dropdownList}>
                                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                            {filteredSpecs.map((spec) => (
                                                <Pressable
                                                    key={spec}
                                                    style={[
                                                        styles.dropdownItem,
                                                        verification.specialization === spec && styles.dropdownItemActive,
                                                    ]}
                                                    onPress={() => {
                                                        setVerification((p) => ({ ...p, specialization: spec }));
                                                        setSpecSearchText('');
                                                        setShowSpecDropdown(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.dropdownItemText,
                                                        verification.specialization === spec && styles.dropdownItemTextActive,
                                                    ]}>{spec}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Experience */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.microLabel}>YEARS OF EXPERIENCE <Text style={styles.requiredStar}>*</Text></Text>
                                <Pressable style={styles.selectorButton} onPress={cycleExperience}>
                                    <Feather name="award" size={16} color={doctorColors.primary} />
                                    <Text style={styles.selectorText}>{verification.experience || 'Select experience'}</Text>
                                    <Feather name="chevron-down" size={16} color={doctorColors.textMuted} />
                                </Pressable>
                                {showExpDropdown && (
                                    <View style={styles.dropdownList}>
                                        {EXPERIENCE_OPTIONS.map((opt) => (
                                            <Pressable
                                                key={opt}
                                                style={[styles.dropdownItem, verification.experience === opt && styles.dropdownItemActive]}
                                                onPress={() => {
                                                    setVerification((p) => ({ ...p, experience: opt }));
                                                    setShowExpDropdown(false);
                                                }}
                                            >
                                                <Text style={[styles.dropdownItemText, verification.experience === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Fields -- Inline Command Style */}
                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>LICENSE NUMBER <Text style={styles.requiredStar}>*</Text></Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. MD-1234567"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={verification.licenseNumber}
                                        onChangeText={(v) => setVerification((p) => ({ ...p, licenseNumber: v }))}
                                    />
                                </View>
                            </View>

                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>LICENSING STATE / COUNTRY <Text style={styles.requiredStar}>*</Text></Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. Uttarakhand, India"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={verification.licenseState}
                                        onChangeText={(v) => setVerification((p) => ({ ...p, licenseState: v }))}
                                    />
                                </View>
                            </View>

                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>CLINIC / HOSPITAL NAME</Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. Doon Medical College"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={verification.clinicName}
                                        onChangeText={(v) => setVerification((p) => ({ ...p, clinicName: v }))}
                                    />
                                </View>
                            </View>

                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>CLINIC / HOSPITAL ADDRESS</Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. 123 Health Ave..."
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={verification.clinicAddress}
                                        onChangeText={(v) => setVerification((p) => ({ ...p, clinicAddress: v }))}
                                    />
                                </View>
                            </View>

                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>PROFESSIONAL BIO</Text>
                                <View style={[styles.inlineInputRow, styles.inlineTextAreaRow]}>
                                    <View style={styles.accentLine} />
                                    <TextInput
                                        style={[styles.inlineInput, styles.inlineTextArea]}
                                        placeholder="Board-certified with 10+ years of..."
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={verification.bio}
                                        onChangeText={(v) => setVerification((p) => ({ ...p, bio: v }))}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>

                            <View style={styles.navRow}>
                                <Pressable style={styles.returnButton} onPress={() => router.back()}>
                                    <Feather name="arrow-left" size={18} color={doctorColors.primary} />
                                    <Text style={styles.returnButtonText}>Return</Text>
                                </Pressable>
                                <Pressable style={styles.nextButton} onPress={goNext}>
                                    <Text style={styles.nextButtonText}>Continue</Text>
                                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* ── Step 2: Availability ─────────────────────── */}
                    {currentStep === 1 && (
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconCircle}>
                                    <Feather name="calendar" size={24} color={doctorColors.primary} />
                                </View>
                                <Text style={styles.stepTitle}>Set Your Availability</Text>
                            </View>

                            {/* Duration selector */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.microLabel}>DEFAULT CONSULTATION DURATION</Text>
                                <Pressable style={styles.selectorButton} onPress={cycleDuration}>
                                    <Feather name="clock" size={16} color={doctorColors.primary} />
                                    <Text style={styles.selectorText}>{availability.consultationDuration}</Text>
                                    <Feather name="chevron-down" size={16} color={doctorColors.textMuted} />
                                </Pressable>
                                {showDurationDropdown && (
                                    <View style={styles.dropdownList}>
                                        {DURATION_OPTIONS.map((opt) => (
                                            <Pressable
                                                key={opt}
                                                style={[styles.dropdownItem, availability.consultationDuration === opt && styles.dropdownItemActive]}
                                                onPress={() => {
                                                    setAvailability((p) => ({ ...p, consultationDuration: opt }));
                                                    setShowDurationDropdown(false);
                                                }}
                                            >
                                                <Text style={[styles.dropdownItemText, availability.consultationDuration === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Timezone selector */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.microLabel}>TIMEZONE <Text style={styles.requiredStar}>*</Text></Text>
                                <Pressable style={styles.selectorButton} onPress={cycleTimezone}>
                                    <Feather name="globe" size={16} color={doctorColors.primary} />
                                    <Text style={[styles.selectorText, { fontSize: 13 }]} numberOfLines={1}>{availability.timezone}</Text>
                                    <Feather name="chevron-down" size={16} color={doctorColors.textMuted} />
                                </Pressable>
                                {showTimezoneDropdown && (
                                    <View style={styles.dropdownList}>
                                        {TIMEZONE_OPTIONS.map((opt) => (
                                            <Pressable
                                                key={opt}
                                                style={[styles.dropdownItem, availability.timezone === opt && styles.dropdownItemActive]}
                                                onPress={() => {
                                                    setAvailability((p) => ({ ...p, timezone: opt }));
                                                    setShowTimezoneDropdown(false);
                                                }}
                                            >
                                                <Text style={[styles.dropdownItemText, availability.timezone === opt && styles.dropdownItemTextActive]} numberOfLines={1}>{opt}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Schedule */}
                            <Text style={styles.microLabel}>VIDEO SCHEDULE</Text>
                            <View>
                                {DAYS.map((day) => (
                                    <DayCard
                                        key={day}
                                        day={day}
                                        sched={availability.schedule[day]}
                                        onToggle={() => toggleDay(day, 'schedule')}
                                        onUpdateInterval={(idx, field, val) => updateIntervalField(day, idx, field, val, 'schedule')}
                                        onAddInterval={() => addInterval(day, 'schedule')}
                                        onRemoveInterval={(idx) => removeInterval(day, idx, 'schedule')}
                                    />
                                ))}
                            </View>

                            <View style={styles.navRow}>
                                <Pressable style={styles.backNavButton} onPress={goBack}>
                                    <Feather name="arrow-left" size={18} color={doctorColors.primary} />
                                    <Text style={styles.backNavText}>Back</Text>
                                </Pressable>
                                <Pressable style={styles.nextButton} onPress={goNext}>
                                    <Text style={styles.nextButtonText}>Continue</Text>
                                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* ── Step 3: In-Person Appointments ───────────────── */}
                    {currentStep === 2 && (
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconCircle}>
                                    <Feather name="map-pin" size={24} color={doctorColors.primary} />
                                </View>
                                <Text style={styles.stepTitle}>In-Person Appointments</Text>
                            </View>

                            <View style={styles.inlineFieldGroup}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.microLabel}>ACCEPT IN-PERSON APPOINTMENTS</Text>
                                        <Text style={{ fontSize: 12, color: doctorColors.textMuted, marginTop: 4 }}>Enable this to allow patients to book clinic visits with you.</Text>
                                    </View>
                                    <Switch
                                        value={availability.acceptsInPerson}
                                        onValueChange={(val) => setAvailability((p) => ({ ...p, acceptsInPerson: val }))}
                                        trackColor={{ false: '#E2E8F0', true: doctorColors.primary + '80' }}
                                        thumbColor={availability.acceptsInPerson ? doctorColors.primary : '#FFFFFF'}
                                    />
                                </View>
                            </View>

                            <View style={[!availability.acceptsInPerson && { opacity: 0.5 }]} pointerEvents={availability.acceptsInPerson ? 'auto' : 'none'}>
                                <Text style={[styles.microLabel, { marginBottom: spacing.sm }]}>IN-PERSON SCHEDULE</Text>
                                {DAYS.map((day) => (
                                    <DayCard
                                        key={day}
                                        day={day}
                                        sched={availability.inPersonSchedule[day]}
                                        onToggle={() => toggleDay(day, 'inPersonSchedule')}
                                        onUpdateInterval={(idx, field, val) => updateIntervalField(day, idx, field, val, 'inPersonSchedule')}
                                        onAddInterval={() => addInterval(day, 'inPersonSchedule')}
                                        onRemoveInterval={(idx) => removeInterval(day, idx, 'inPersonSchedule')}
                                    />
                                ))}
                            </View>

                            <View style={styles.navRow}>
                                <Pressable style={styles.backNavButton} onPress={goBack}>
                                    <Feather name="arrow-left" size={18} color={doctorColors.primary} />
                                    <Text style={styles.backNavText}>Back</Text>
                                </Pressable>
                                <Pressable style={styles.nextButton} onPress={goNext}>
                                    <Text style={styles.nextButtonText}>Continue</Text>
                                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* ── Step 4: Payments & Consent ───────────────── */}
                    {currentStep === 3 && (
                        <View style={styles.stepContent}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIconCircle}>
                                    <Feather name="credit-card" size={24} color={doctorColors.primary} />
                                </View>
                                <Text style={styles.stepTitle}>Payments & Consent</Text>
                            </View>

                            {/* Payment Fields */}
                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>BASE CONSULTATION FEE <Text style={styles.requiredStar}>*</Text></Text>
                                <View style={styles.inlineInputRow}>
                                    <Pressable onPress={cycleCurrency} style={styles.currencyBadge}>
                                        <Text style={styles.currencyBadgeText}>
                                            {CURRENCY_OPTIONS.find((c) => c.code === payments.currency)?.label.charAt(0)}{' '}{payments.currency}
                                        </Text>
                                        <Feather name="chevron-down" size={12} color={doctorColors.primary} />
                                    </Pressable>
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. 800"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={payments.consultationFee}
                                        onChangeText={(v) => setPayments((p) => ({ ...p, consultationFee: v }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                                {showCurrencyDropdown && (
                                    <View style={styles.dropdownList}>
                                        {CURRENCY_OPTIONS.map((opt) => (
                                            <Pressable
                                                key={opt.code}
                                                style={[styles.dropdownItem, payments.currency === opt.code && styles.dropdownItemActive]}
                                                onPress={() => {
                                                    setPayments((p) => ({ ...p, currency: opt.code }));
                                                    setShowCurrencyDropdown(false);
                                                }}
                                            >
                                                <Text style={[styles.dropdownItemText, payments.currency === opt.code && styles.dropdownItemTextActive]}>{opt.label}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>BANK NAME <Text style={styles.requiredStar}>*</Text></Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. State Bank of India"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={payments.bankName}
                                        onChangeText={(v) => setPayments((p) => ({ ...p, bankName: v }))}
                                    />
                                </View>
                            </View>

                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>ACCOUNT NUMBER <Text style={styles.requiredStar}>*</Text></Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="Enter account number"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={payments.accountNumber}
                                        onChangeText={(v) => setPayments((p) => ({ ...p, accountNumber: v }))}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>ROUTING NUMBER <Text style={styles.requiredStar}>*</Text></Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. SBIN0001234"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={payments.routingNumber}
                                        onChangeText={(v) => setPayments((p) => ({ ...p, routingNumber: v }))}
                                    />
                                </View>
                            </View>

                            {/* Payment Methods Grid */}
                            <View style={styles.inlineFieldGroup}>
                                <Text style={styles.microLabel}>ACCEPTED PAYMENT METHODS <Text style={styles.requiredStar}>*</Text></Text>
                                <View style={styles.paymentGrid}>
                                    {PAYMENT_METHODS.map((method) => {
                                        const active = payments.acceptedPaymentMethods.includes(method.id);
                                        return (
                                            <Pressable
                                                key={method.id}
                                                style={[
                                                    styles.paymentCard,
                                                    active && styles.paymentCardActive,
                                                ]}
                                                onPress={() => togglePaymentMethod(method.id)}
                                            >
                                                <Feather
                                                    name={method.icon}
                                                    size={20}
                                                    color={active ? doctorColors.primary : doctorColors.textMuted}
                                                />
                                                <Text style={[
                                                    styles.paymentCardText,
                                                    active && styles.paymentCardTextActive,
                                                ]}>{method.label}</Text>
                                                {active && (
                                                    <View style={styles.paymentCheck}>
                                                        <Feather name="check" size={12} color="#FFFFFF" />
                                                    </View>
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Consent Checkboxes */}
                            <Text style={[styles.microLabel, { marginTop: spacing.lg }]}>AGREEMENTS & CONSENT <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={styles.consentGroup}>
                                <Pressable
                                    style={styles.consentRow}
                                    onPress={() => setPayments((p) => ({ ...p, termsAccepted: !p.termsAccepted }))}
                                >
                                    <Feather
                                        name={payments.termsAccepted ? 'check-square' : 'square'}
                                        size={22}
                                        color={payments.termsAccepted ? doctorColors.primary : doctorColors.textMuted}
                                    />
                                    <Text style={styles.consentText}>
                                        I agree to the Terms of Service and Provider Agreement
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={styles.consentRow}
                                    onPress={() => setPayments((p) => ({ ...p, hipaaAccepted: !p.hipaaAccepted }))}
                                >
                                    <Feather
                                        name={payments.hipaaAccepted ? 'check-square' : 'square'}
                                        size={22}
                                        color={payments.hipaaAccepted ? doctorColors.primary : doctorColors.textMuted}
                                    />
                                    <Text style={styles.consentText}>
                                        I agree to comply with HIPAA regulations and maintain patient confidentiality
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={styles.consentRow}
                                    onPress={() => setPayments((p) => ({ ...p, privacyAccepted: !p.privacyAccepted }))}
                                >
                                    <Feather
                                        name={payments.privacyAccepted ? 'check-square' : 'square'}
                                        size={22}
                                        color={payments.privacyAccepted ? doctorColors.primary : doctorColors.textMuted}
                                    />
                                    <Text style={styles.consentText}>
                                        I have read and accept the Privacy Policy
                                    </Text>
                                </Pressable>
                            </View>

                            <View style={styles.navRow}>
                                <Pressable style={styles.backNavButton} onPress={goBack}>
                                    <Feather name="arrow-left" size={18} color={doctorColors.primary} />
                                    <Text style={styles.backNavText}>Back</Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.nextButton,
                                        styles.completeButton,
                                        (!allConsentsAccepted || isSubmitting) && styles.buttonDisabled,
                                    ]}
                                    onPress={handleComplete}
                                    disabled={!allConsentsAccepted || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <View style={styles.buttonLoadingRow}>
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                            <Text style={styles.nextButtonText}>Completing...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.nextButtonText}>Complete Registration</Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// -- Styles --

const INPUT_HEIGHT = 48;

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: doctorColors.background },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing['2xl'],
        paddingBottom: spacing['3xl'],
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.lg,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.lg,
        color: doctorColors.textPrimary,
    },
    stepIndicator: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },

    // Progress
    progressContainer: {
        paddingHorizontal: spacing['2xl'],
        marginBottom: spacing.xl,
    },
    progressTrack: {
        height: 4,
        backgroundColor: doctorColors.border,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: doctorColors.primary,
        borderRadius: 2,
    },
    stepLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepLabel: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    stepLabelActive: {
        fontFamily: typography.fontFamily.medium,
        color: doctorColors.primary,
    },

    // Step Content
    stepContent: {
        gap: spacing.lg,
    },
    stepHeader: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    stepIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: doctorColors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    stepTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
        marginBottom: spacing.xs,
    },
    stepSubtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
        textAlign: 'center',
    },

    // Upload
    uploadArea: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: doctorColors.border,
        borderRadius: radii.lg,
        padding: spacing['2xl'],
        alignItems: 'center',
    },
    uploadAreaActive: {
        borderColor: doctorColors.primary,
        backgroundColor: doctorColors.primaryLight,
    },
    uploadContent: {
        alignItems: 'center',
        gap: spacing.sm,
    },
    uploadLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
    },
    uploadAnalyzing: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
    },
    uploadSuccess: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.success,
    },
    uploadHint: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },

    // Form Fields — Legacy (Step 2, Step 3)
    fieldGroup: {
        gap: spacing.xs,
    },
    fieldLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: INPUT_HEIGHT,
        borderWidth: 1,
        borderColor: doctorColors.border,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surface,
        paddingHorizontal: spacing.lg,
    },
    textAreaWrapper: {
        height: 120,
        alignItems: 'flex-start',
        paddingVertical: spacing.md,
    },
    input: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: doctorColors.textPrimary,
        height: '100%',
    },
    textArea: {
        textAlignVertical: 'top',
    },

    // Form Fields — Inline Command Style (Step 1)
    inlineFieldGroup: {
        gap: spacing.xxs,
    },
    microLabel: {
        fontSize: 10,
        fontFamily: typography.fontFamily.semiBold,
        letterSpacing: 1.5,
        color: doctorColors.textMuted,
    },
    requiredStar: {
        fontSize: 10,
        color: doctorColors.error,
    },
    inlineInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: doctorColors.border,
        minHeight: 40,
        paddingVertical: spacing.xs,
    },
    inlineTextAreaRow: {
        alignItems: 'flex-start',
        minHeight: 100,
    },
    promptIcon: {
        marginRight: spacing.sm,
    },
    accentLine: {
        width: 2,
        alignSelf: 'stretch',
        backgroundColor: doctorColors.primary,
        borderRadius: 1,
        marginRight: spacing.md,
    },
    inlineInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: typography.fontFamily.regular,
        color: doctorColors.textPrimary,
    },
    inlineTextArea: {
        textAlignVertical: 'top',
        minHeight: 80,
    },
    returnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        height: INPUT_HEIGHT,
        borderRadius: radii.md,
        borderWidth: 1.5,
        borderColor: doctorColors.primary,
        paddingHorizontal: spacing.xl,
    },
    returnButtonText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: doctorColors.primary,
    },

    // Selector Button
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        height: INPUT_HEIGHT,
        borderWidth: 1,
        borderColor: doctorColors.border,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surface,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    selectorText: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },

    // Consent
    consentGroup: {
        gap: spacing.md,
        backgroundColor: doctorColors.surface,
        borderRadius: radii.md,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: doctorColors.border,
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    consentText: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
        lineHeight: 20,
    },

    // Navigation
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    backNavButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    backNavText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: doctorColors.primary,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        height: INPUT_HEIGHT,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
        paddingHorizontal: spacing['2xl'],
        ...shadows.card,
    },
    completeButton: {
        flex: 1,
        justifyContent: 'center',
        marginLeft: spacing.md,
    },
    nextButtonText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },

    // Completion Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing['2xl'],
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: radii.lg,
        padding: spacing['2xl'],
        alignItems: 'center',
        ...shadows.card,
    },
    modalIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: doctorColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    modalBody: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        width: '100%',
        height: INPUT_HEIGHT,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
        ...shadows.card,
    },
    modalButtonText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },

    // Specialization Dropdown
    dropdownList: {
        borderWidth: 1,
        borderColor: doctorColors.border,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surface,
        marginTop: spacing.xs,
    },
    dropdownScroll: {
        maxHeight: 160,
    },
    dropdownItem: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: doctorColors.border,
    },
    dropdownItemActive: {
        backgroundColor: doctorColors.primaryLight,
    },
    dropdownItemText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    dropdownItemTextActive: {
        fontFamily: typography.fontFamily.medium,
        color: doctorColors.primary,
    },

    // Currency Badge
    currencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: doctorColors.border,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginRight: spacing.sm,
        backgroundColor: doctorColors.surface,
    },
    currencyBadgeText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 12,
        color: doctorColors.primary,
    },

    // Payment Methods Grid
    paymentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    paymentCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: doctorColors.border,
        borderRadius: radii.md,
        backgroundColor: doctorColors.background,
    },
    paymentCardActive: {
        borderColor: doctorColors.primary,
        backgroundColor: doctorColors.primaryLight,
    },
    paymentCardText: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    paymentCardTextActive: {
        fontFamily: typography.fontFamily.medium,
        color: doctorColors.primary,
    },
    paymentCheck: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: doctorColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
