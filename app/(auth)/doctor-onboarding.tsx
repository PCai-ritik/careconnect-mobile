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
import {
    doctorColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';

// -- Types --

interface DaySchedule {
    enabled: boolean;
    startTime: string;
    endTime: string;
}

interface VerificationData {
    licenseNumber: string;
    licenseState: string;
    hospitalAffiliation: string;
    bio: string;
    localDocumentUri: string;
    specialization: string;
    experience: string;
}

interface AvailabilityData {
    schedule: Record<string, DaySchedule>;
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

// -- Mock AI Function --

// TODO: [BACKEND GATE] Replace with real OCR/AI API.
// This function simulates sending a document to an AI service
// that extracts medical license information from uploaded credentials.
async function mockAnalyzeDocument(_fileUri: string): Promise<{
    licenseNumber: string;
    licenseState: string;
    hospitalAffiliation: string;
}> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                licenseNumber: 'MD-8472910',
                licenseState: 'California, USA',
                hospitalAffiliation: 'Cedars-Sinai Medical Center',
            });
        }, 2500);
    });
}

// -- Constants --

const STEPS = [
    { title: 'Verification', icon: 'shield' as const },
    { title: 'Availability', icon: 'calendar' as const },
    { title: 'Payments', icon: 'credit-card' as const },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_OPTIONS = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00',
];

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
        startTime: '09:00',
        endTime: '17:00',
    },
}), {} as Record<string, DaySchedule>);

// -- Component --

export default function DoctorOnboardingScreen() {
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);

    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    // Step 1: Verification
    const [verification, setVerification] = useState<VerificationData>({
        licenseNumber: '',
        licenseState: '',
        hospitalAffiliation: '',
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
        if (currentStep < 2) {
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

            const extracted = await mockAnalyzeDocument(file.uri);

            setVerification((prev) => ({
                ...prev,
                licenseNumber: extracted.licenseNumber,
                licenseState: extracted.licenseState,
                hospitalAffiliation: extracted.hospitalAffiliation,
            }));
        } catch {
            Alert.alert('Upload Failed', 'Could not read the document. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // -- Schedule Helpers --

    const toggleDay = (day: string) => {
        setAvailability((prev) => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: { ...prev.schedule[day], enabled: !prev.schedule[day].enabled },
            },
        }));
    };

    const cycleTime = (day: string, field: 'startTime' | 'endTime') => {
        setAvailability((prev) => {
            const current = prev.schedule[day][field];
            const idx = TIME_OPTIONS.indexOf(current);
            const next = TIME_OPTIONS[(idx + 1) % TIME_OPTIONS.length];
            return {
                ...prev,
                schedule: {
                    ...prev.schedule,
                    [day]: { ...prev.schedule[day], [field]: next },
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

        const payload = {
            verification: {
                licenseNumber: verification.licenseNumber,
                licenseState: verification.licenseState,
                hospitalAffiliation: verification.hospitalAffiliation,
                bio: verification.bio,
                documentUri: verification.localDocumentUri,
            },
            availability: {
                schedule: availability.schedule,
                consultationDuration: availability.consultationDuration,
            },
            payments: {
                consultationFee: payments.consultationFee,
                currency: payments.currency,
                bankName: payments.bankName,
                accountNumber: payments.accountNumber,
                routingNumber: payments.routingNumber,
                termsAccepted: payments.termsAccepted,
                hipaaAccepted: payments.hipaaAccepted,
                privacyAccepted: payments.privacyAccepted,
            },
        };

        console.log('[Mock Onboarding] Complete doctor onboarding payload:', JSON.stringify(payload, null, 2));

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setShowCompleteModal(true);
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
                            Your doctor profile has been set up successfully. You can now sign in to start consulting.
                        </Text>
                        <Pressable
                            style={({ pressed }) => [
                                styles.modalButton,
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={() => {
                                setShowCompleteModal(false);
                                router.replace('/(auth)/login?role=doctor');
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
                                <Text style={styles.microLabel}>HOSPITAL / CLINIC AFFILIATION</Text>
                                <View style={styles.inlineInputRow}>
                                    <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                    <TextInput
                                        style={styles.inlineInput}
                                        placeholder="e.g. Doon Medical College"
                                        placeholderTextColor={doctorColors.textMuted}
                                        value={verification.hospitalAffiliation}
                                        onChangeText={(v) => setVerification((p) => ({ ...p, hospitalAffiliation: v }))}
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
                            <Text style={styles.microLabel}>WEEKLY SCHEDULE</Text>
                            <View style={styles.scheduleList}>
                                {DAYS.map((day) => {
                                    const sched = availability.schedule[day];
                                    return (
                                        <View key={day} style={styles.scheduleRow}>
                                            <View style={styles.scheduleDayRow}>
                                                <Switch
                                                    value={sched.enabled}
                                                    onValueChange={() => toggleDay(day)}
                                                    trackColor={{ false: doctorColors.border, true: doctorColors.primaryLight }}
                                                    thumbColor={sched.enabled ? doctorColors.primary : doctorColors.textMuted}
                                                />
                                                <Text style={[styles.dayName, !sched.enabled && styles.dayNameDisabled]}>
                                                    {day}
                                                </Text>
                                            </View>
                                            {sched.enabled && (
                                                <View style={styles.timeRow}>
                                                    <Pressable style={styles.timeButton} onPress={() => cycleTime(day, 'startTime')}>
                                                        <Text style={styles.timeText}>{sched.startTime}</Text>
                                                    </Pressable>
                                                    <Text style={styles.timeSeparator}>to</Text>
                                                    <Pressable style={styles.timeButton} onPress={() => cycleTime(day, 'endTime')}>
                                                        <Text style={styles.timeText}>{sched.endTime}</Text>
                                                    </Pressable>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
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

                    {/* ── Step 3: Payments & Consent ───────────────── */}
                    {currentStep === 2 && (
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

    // Schedule
    scheduleList: {
        gap: spacing.sm,
    },
    scheduleRow: {
        borderWidth: 1,
        borderColor: doctorColors.border,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surface,
        padding: spacing.md,
        gap: spacing.sm,
    },
    scheduleDayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    dayName: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    dayNameDisabled: {
        color: doctorColors.textMuted,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginLeft: spacing['4xl'],
    },
    timeButton: {
        borderWidth: 1,
        borderColor: doctorColors.border,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: doctorColors.background,
    },
    timeText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
    },
    timeSeparator: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
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
