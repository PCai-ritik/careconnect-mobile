/**
 * CareConnect — Caregiver Dashboard + 4-Step Booking Wizard
 *
 * Dashboard layout:
 *   1. Header: logo + user avatar with notification dot
 *   2. Welcome greeting
 *   3. "Next Up" contextual card
 *   4. "Book New Consultation" CTA → opens booking modal
 *   5. Recent Medical Records scrollable list
 *
 * Booking Modal (bottom sheet):
 *   Step 1: Choose Specialty (icon + color per specialty)
 *   Step 2: Select Doctor
 *   Step 3: Pick Date & Time (month calendar + 3×n time grid)
 *   Step 4: Confirm, select payment method & pay
 *
 * Uses patientColors design tokens + StyleSheet.create(). No Nativewind.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
    View,
    Text,
    Image,
    Pressable,
    ScrollView,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
    patientColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getMyAppointments, getDoctorsByHospital, getPatientRecords, getLinkedPatients, bookAppointment, addPatient, updatePatient, getJoinToken } from '@/services/caregiver';
import type { DoctorProfile, Appointment, MedicalRecord, PatientProfile } from '@/services/types';
import MedicalRecordSheet from '@/components/MedicalRecordSheet';
import PatientThemedAlert from '@/components/patient/PatientThemedAlert';
import AddPatientSheet from '@/components/caregiver/AddPatientSheet';
import PatientChartSheet from '@/components/caregiver/PatientChartSheet';
import SmartJoinButton from '@/components/SmartJoinButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

// ─── Specialty Icon + Color Map ─────────────────────────────────────────────
// Mirrors the web app's icon/color assignments (Lucide → Feather equivalents)

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];

const SPECIALTY_MAP: Record<string, { icon: FeatherIcon; color: string }> = {
    'General Practice': { icon: 'activity', color: '#3B82F6' }, // blue
    'Cardiology': { icon: 'heart', color: '#EF4444' }, // red
    'Neurology': { icon: 'cpu', color: '#8B5CF6' }, // purple
    'Ophthalmology': { icon: 'eye', color: '#06B6D4' }, // cyan
    'Orthopedics': { icon: 'shield', color: '#F97316' }, // orange
    'Pediatrics': { icon: 'smile', color: '#EC4899' }, // pink
    'Dermatology': { icon: 'sun', color: '#F59E0B' }, // amber
    'Internal Medicine': { icon: 'trending-up', color: '#22C55E' }, // green
    'Psychiatry': { icon: 'message-circle', color: '#6366F1' }, // indigo
    'ENT (Otolaryngology)': { icon: 'headphones', color: '#14B8A6' }, // teal
};

const DEFAULT_SPEC = { icon: 'plus-circle' as FeatherIcon, color: patientColors.primary };

function getSpecMeta(spec: string) {
    return SPECIALTY_MAP[spec] ?? DEFAULT_SPEC;
}

// ─── Payment Methods (matches onboarding PAYMENT_METHODS) ───────────────────

const PAYMENT_METHODS: { id: string; label: string; icon: FeatherIcon }[] = [
    { id: 'upi', label: 'UPI', icon: 'smartphone' },
    { id: 'card', label: 'Credit / Debit', icon: 'credit-card' },
    { id: 'netbanking', label: 'Net Banking', icon: 'globe' },
    { id: 'cash', label: 'Pay at Clinic', icon: 'dollar-sign' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_HDR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isToday(d: Date): boolean {
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isPast(d: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
}

/** Build a month grid (6 rows × 7 cols). Cells outside the month are null. */
function buildMonthGrid(year: number, month: number): (Date | null)[][] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();
    const grid: (Date | null)[][] = [];
    let day = 1;

    for (let row = 0; row < 6; row++) {
        const week: (Date | null)[] = [];
        for (let col = 0; col < 7; col++) {
            if (row === 0 && col < startDow) {
                week.push(null);
            } else if (day > totalDays) {
                week.push(null);
            } else {
                week.push(new Date(year, month, day));
                day++;
            }
        }
        grid.push(week);
        if (day > totalDays) break;
    }
    return grid;
}

/** Generate time slots between start/end using duration (minutes) */
function generateTimeSlots(startTime: string, endTime: string, durationStr: string): string[] {
    const duration = parseInt(durationStr, 10) || 30;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const slots: string[] = [];

    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        slots.push(`${displayH}:${min.toString().padStart(2, '0')} ${period}`);
    }
    return slots;
}

function getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('');
}

// ─── Avatar Pastel Colors (same palette as doctor dashboard) ─────────────────

const AVATAR_COLORS = [
    '#FBCFE8', '#FED7AA', '#A5F3FC', '#BBF7D0',
    '#A5B4FC', '#BAE6FD', '#99F6E4', '#D9F99D',
    '#FDE68A', '#FECACA', '#DDD6FE',
];

const getAvatarColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

function currencySymbol(code: string): string {
    return ({ INR: '₹', USD: '$', EUR: '€', GBP: '£' } as Record<string, string>)[code] || code;
}

function isSameDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CaregiverDashboardScreen() {
    const router = useRouter();
    const { user, token, logout } = useAuth();
    const insets = useSafeAreaInsets();

    // -- API data --
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // -- UI state --
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
    const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
    const [isPatientChartOpen, setIsPatientChartOpen] = useState(false);
    const [showNoPatientsAlert, setShowNoPatientsAlert] = useState(false);

    // -- Calendar month navigation --
    const now = new Date();
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [calYear, setCalYear] = useState(now.getFullYear());

    // -- Fetch data from API --
    const fetchAll = useCallback(async () => {
        if (!token) return;
        try {
            const [appts, pts] = await Promise.all([
                getMyAppointments(token),
                getLinkedPatients(token),
            ]);
            setAppointments(appts);
            setPatients(pts);
            // Fetch doctors for name resolution in Next Up card
            const hospitalId = user?.hospitalId ?? pts[0]?.hospital_id ?? '';
            if (hospitalId) {
                try {
                    const docs = await getDoctorsByHospital(hospitalId);
                    setDoctors(docs);
                } catch { }
            }
            // Fetch records for the first linked patient (if any)
            if (pts.length > 0) {
                const recs = await getPatientRecords(token, pts[0].id);
                setRecords(recs);
            }
        } catch (e) {
            console.error('Caregiver dashboard fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openBookingWizard = async () => {
        // Guard: require at least one patient before booking
        if (patients.length === 0) {
            setShowNoPatientsAlert(true);
            return;
        }
        setIsBookingOpen(true);
        if (doctors.length === 0) {
            try {
                const hospitalId = user?.hospitalId ?? patients[0]?.hospital_id ?? '';
                const docs = await getDoctorsByHospital(hospitalId);
                setDoctors(docs);
            } catch (e) {
                console.error('Failed to fetch doctors:', e);
            }
        }
    };

    // -- Derived data --
    const upcomingAppointment = appointments.find(
        (a) => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS',
    ) ?? null;
    const hasNotifications = records.length > 0;

    const specialties = useMemo(
        () => [...new Set(doctors.map((d) => d.specialization))],
        [doctors],
    );
    const filteredDoctors = useMemo(
        () => doctors.filter((d) => d.specialization === selectedSpecialty),
        [selectedSpecialty, doctors],
    );
    const selectedDoctor = useMemo(
        () => doctors.find((d) => d.id === selectedDoctorId) ?? null,
        [selectedDoctorId, doctors],
    );
    const monthGrid = useMemo(() => buildMonthGrid(calYear, calMonth), [calYear, calMonth]);
    const timeSlots = useMemo(() => {
        if (!selectedDoctor || !selectedDate) return [];
        const dayName = DAY_NAMES[selectedDate.getDay()];
        const slot = selectedDoctor.availability_slots.find(
            (s) => s.day_of_week === dayName && s.is_enabled,
        );
        if (!slot) return [];
        const duration = String(selectedDoctor.consultation_duration_minutes ?? 30);
        return generateTimeSlots(slot.start_time, slot.end_time, duration);
    }, [selectedDoctor, selectedDate]);
    const doctorPaymentMethods = useMemo(() => {
        if (!selectedDoctor) return PAYMENT_METHODS;
        const accepted = selectedDoctor.accepted_payment_methods ?? [];
        if (accepted.length === 0) return PAYMENT_METHODS;
        return PAYMENT_METHODS.filter((pm) => accepted.includes(pm.id));
    }, [selectedDoctor]);

    // -- Actions --
    const resetBooking = () => {
        setBookingStep(1);
        setSelectedSpecialty(null);
        setSelectedDoctorId(null);
        setSelectedDate(null);
        setSelectedTime(null);
        setSelectedPayment(null);
        setIsSubmitting(false);
        const n = new Date();
        setCalMonth(n.getMonth());
        setCalYear(n.getFullYear());
    };
    const closeBooking = () => {
        setIsBookingOpen(false);
        resetBooking();
    };
    const handleSpecialtySelect = (spec: string) => {
        setSelectedSpecialty(spec);
        setSelectedDoctorId(null);
        setBookingStep(2);
    };
    const handleDoctorSelect = (id: string) => {
        setSelectedDoctorId(id);
        setSelectedDate(null);
        setSelectedTime(null);
        setSelectedPayment(null);
        setBookingStep(3);
    };
    const handleConfirmBooking = async () => {
        if (!token || !selectedDoctor || !selectedDate || !selectedTime || !patients[0]) return;
        setIsSubmitting(true);
        try {
            // Build ISO scheduled_time from selectedDate + selectedTime
            const [timePart, period] = selectedTime.split(' ');
            const [hStr, mStr] = timePart.split(':');
            let hours = parseInt(hStr, 10);
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            const scheduled = new Date(selectedDate);
            scheduled.setHours(hours, parseInt(mStr, 10), 0, 0);

            await bookAppointment(token, {
                doctor_id: selectedDoctor.id,
                patient_id: patients[0].id,
                hospital_id: user?.hospitalId ?? patients[0]?.hospital_id ?? '',
                scheduled_time: scheduled.toISOString(),
                duration_minutes: selectedDoctor.consultation_duration_minutes ?? 30,
                appointment_type: 'VIDEO',
            });

            // Update patient to link them to this doctor (needed for doctor-level isolation)
            await updatePatient(token, patients[0].id, {
                doctor_id: selectedDoctor.id,
            });

            setIsBookingOpen(false);
            setShowSuccess(true);
            fetchAll(); // refresh appointments
        } catch (e) {
            console.error('Booking failed:', e);
        } finally {
            setIsSubmitting(false);
        }
    };
    const dismissSuccess = () => {
        setShowSuccess(false);
        resetBooking();
    };
    const goBackStep = () => {
        if (bookingStep === 2) { setSelectedSpecialty(null); setSelectedDoctorId(null); }
        else if (bookingStep === 3) { setSelectedDoctorId(null); setSelectedDate(null); setSelectedTime(null); }
        else if (bookingStep === 4) { setSelectedPayment(null); }
        setBookingStep((s) => Math.max(1, s - 1));
    };
    const goNextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
        else setCalMonth((m) => m + 1);
    };
    const goPrevMonth = () => {
        const n = new Date();
        if (calYear === n.getFullYear() && calMonth === n.getMonth()) return; // can't go before current month
        if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
        else setCalMonth((m) => m - 1);
    };
    // Limit to current month + next month
    const canGoNext = (() => {
        const n = new Date();
        const maxMonth = n.getMonth() + 1;
        const maxYear = n.getFullYear() + (maxMonth > 11 ? 1 : 0);
        const capped = maxMonth % 12;
        return calYear < maxYear || (calYear === maxYear && calMonth < capped);
    })();
    const canGoPrev = (() => {
        const n = new Date();
        return calYear > n.getFullYear() || calMonth > n.getMonth();
    })();

    // ── Step renderers ──

    const renderStep1 = () => (
        <View style={ms.stepBody}>
            <View style={ms.specGrid}>
                {specialties.map((spec) => {
                    const meta = getSpecMeta(spec);
                    return (
                        <Pressable
                            key={spec}
                            style={({ pressed }) => [ms.specCard, pressed && { opacity: 0.8 }]}
                            onPress={() => handleSpecialtySelect(spec)}
                        >
                            <View style={[ms.specIconCircle, { backgroundColor: meta.color + '18' }]}>
                                <Feather name={meta.icon} size={22} color={meta.color} />
                            </View>
                            <Text style={ms.specName}>{spec}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={ms.stepBody}>
            {filteredDoctors.length === 0 ? (
                <Text style={ms.emptyText}>No doctors available for this specialty.</Text>
            ) : (
                filteredDoctors.map((doc) => {
                    const meta = getSpecMeta(doc.specialization);
                    return (
                        <Pressable
                            key={doc.id}
                            style={({ pressed }) => [ms.doctorCard, pressed && { opacity: 0.85 }]}
                            onPress={() => handleDoctorSelect(doc.id)}
                        >
                            <View style={[ms.doctorAvatar, { backgroundColor: getAvatarColor(doc.full_name) }]}>
                                <Feather name="user" size={20} color="#374151" />
                            </View>
                            <View style={ms.doctorInfo}>
                                <Text style={ms.doctorName}>{doc.full_name}</Text>
                                <Text style={ms.doctorMeta}>
                                    {doc.years_of_experience ?? ''}  •  {doc.hospital_affiliation ?? ''}
                                </Text>
                                <Text style={ms.doctorFee}>
                                    {currencySymbol(doc.currency)}{doc.consultation_fee ?? 0} / {doc.consultation_duration_minutes ?? 30} min
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={18} color={patientColors.textMuted} />
                        </Pressable>
                    );
                })
            )}
        </View>
    );

    const renderStep3 = () => {
        return (
            <View style={ms.stepBody}>
                {/* Month header with nav arrows */}
                <View style={ms.calHeader}>
                    <Pressable onPress={goPrevMonth} disabled={!canGoPrev} style={({ pressed }) => [ms.calNav, !canGoPrev && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}>
                        <Feather name="chevron-left" size={20} color={patientColors.textPrimary} />
                    </Pressable>
                    <Text style={ms.calMonthTitle}>{MONTH_NAMES[calMonth]} {calYear}</Text>
                    <Pressable onPress={goNextMonth} disabled={!canGoNext} style={({ pressed }) => [ms.calNav, !canGoNext && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}>
                        <Feather name="chevron-right" size={20} color={patientColors.textPrimary} />
                    </Pressable>
                </View>

                {/* Day-of-week header */}
                <View style={ms.calDowRow}>
                    {DAY_HDR.map((d) => (
                        <Text key={d} style={ms.calDowText}>{d}</Text>
                    ))}
                </View>

                {/* Calendar grid */}
                {monthGrid.map((week, wi) => (
                    <View key={wi} style={ms.calWeekRow}>
                        {week.map((cell, ci) => {
                            if (!cell) return <View key={ci} style={ms.calCell} />;

                            const past = isPast(cell);
                            const dayName = DAY_NAMES[cell.getDay()];
                            const dayEnabled = selectedDoctor?.availability_slots.some(
                                (s) => s.day_of_week === dayName && s.is_enabled,
                            ) ?? false;
                            const disabled = past || !dayEnabled;
                            const today = isToday(cell);
                            const selected = isSameDay(cell, selectedDate);

                            return (
                                <Pressable
                                    key={ci}
                                    disabled={disabled}
                                    onPress={() => { setSelectedDate(new Date(cell)); setSelectedTime(null); }}
                                    style={[
                                        ms.calCell,
                                        today && !selected && ms.calCellToday,
                                        selected && ms.calCellSelected,
                                        disabled && ms.calCellDisabled,
                                    ]}
                                >
                                    <Text style={[
                                        ms.calCellText,
                                        today && !selected && ms.calCellTodayText,
                                        selected && ms.calCellSelectedText,
                                        disabled && ms.calCellDisabledText,
                                    ]}>
                                        {cell.getDate()}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}

                {/* Time slots — 3-column symmetric grid */}
                {selectedDate && (
                    <>
                        <Text style={[ms.subLabel, { marginTop: spacing.xl }]}>Select a Time</Text>
                        {timeSlots.length === 0 ? (
                            <Text style={ms.emptyText}>Doctor is unavailable on this date.</Text>
                        ) : (
                            <View style={ms.timeGrid}>
                                {timeSlots.map((slot) => (
                                    <Pressable
                                        key={slot}
                                        onPress={() => setSelectedTime(slot)}
                                        style={[ms.timePill, selectedTime === slot && ms.timePillSelected]}
                                    >
                                        <Text style={[ms.timePillText, selectedTime === slot && ms.timePillTextSelected]}>
                                            {slot}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Continue button */}
                <Pressable
                    style={[ms.continueButton, !selectedTime && ms.continueButtonDisabled]}
                    disabled={!selectedTime}
                    onPress={() => setBookingStep(4)}
                >
                    <Text style={[ms.continueText, !selectedTime && ms.continueTextDisabled]}>Continue</Text>
                </Pressable>
            </View>
        );
    };

    const renderStep4 = () => {
        const doc = selectedDoctor;
        if (!doc || !selectedDate || !selectedTime) return null;
        const dateStr = `${DAY_HDR[selectedDate.getDay()]}, ${MONTH_ABBR[selectedDate.getMonth()]} ${selectedDate.getDate()}`;

        return (
            <View style={ms.stepBody}>
                {/* Booking summary */}
                <View style={ms.summaryCard}>
                    <Text style={ms.summaryTitle}>Booking Summary</Text>
                    {[
                        { label: 'Doctor', value: doc.full_name },
                        { label: 'Specialty', value: doc.specialization },
                        { label: 'Date & Time', value: `${dateStr} at ${selectedTime}` },
                        { label: 'Duration', value: `${doc.consultation_duration_minutes ?? 30} min` },
                    ].map((item) => (
                        <View key={item.label} style={ms.summaryRow}>
                            <View style={ms.summaryDotContainer}>
                                <View style={ms.summaryDot} />
                            </View>
                            <View style={ms.summaryContent}>
                                <Text style={ms.summaryLabel}>{item.label}</Text>
                                <Text style={ms.summaryValue}>{item.value}</Text>
                            </View>
                        </View>
                    ))}
                    <View style={ms.summaryDivider} />
                    <View style={ms.summaryFeeRow}>
                        <Text style={ms.summaryFeeLabel}>Consultation Fee</Text>
                        <Text style={ms.summaryFeeValue}>
                            {currencySymbol(doc.currency)}{doc.consultation_fee ?? 0}
                        </Text>
                    </View>
                </View>

                {/* Payment method selection */}
                <Text style={ms.subLabel}>Payment Method</Text>
                <View style={ms.paymentGrid}>
                    {doctorPaymentMethods.map((pm) => {
                        const isActive = selectedPayment === pm.id;
                        return (
                            <Pressable
                                key={pm.id}
                                onPress={() => setSelectedPayment(pm.id)}
                                style={[ms.paymentCard, isActive && ms.paymentCardActive]}
                            >
                                <View style={[ms.paymentIcon, isActive && ms.paymentIconActive]}>
                                    <Feather name={pm.icon} size={20} color={isActive ? '#FFFFFF' : patientColors.textSecondary} />
                                </View>
                                <Text style={[ms.paymentLabel, isActive && ms.paymentLabelActive]}>{pm.label}</Text>
                                {isActive && (
                                    <View style={ms.paymentCheck}>
                                        <Feather name="check" size={14} color={patientColors.primary} />
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* Pay button */}
                <Pressable
                    style={[ms.payButton, (!selectedPayment || isSubmitting) && { opacity: 0.5 }]}
                    disabled={!selectedPayment || isSubmitting}
                    onPress={handleConfirmBooking}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Feather name="credit-card" size={18} color="#FFFFFF" />
                            <Text style={ms.payButtonText}>Pay & Book Consultation</Text>
                        </>
                    )}
                </Pressable>
                <Text style={ms.payNote}>
                    You'll receive a confirmation with the video call link after payment.
                </Text>
            </View>
        );
    };

    const STEP_TITLES = [
        '1. Choose Specialty',
        '2. Select Doctor',
        '3. Pick Date & Time',
        '4. Confirm & Pay',
    ];

    // ── Main render ──

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ── 1. Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image
                            source={require('@/assets/images/stethescope.png')}
                            style={styles.logoImage}
                        />
                        <Text style={styles.brandText}>CareConnect</Text>
                    </View>
                    <Pressable style={styles.avatarWrapper} onPress={() => setIsProfileMenuOpen(true)}>
                        <View style={[styles.avatar, { backgroundColor: getAvatarColor('Caregiver') }]}>
                            <Feather name="user" size={20} color="#374151" />
                        </View>
                        {hasNotifications && <View style={styles.notificationDot} />}
                    </Pressable>
                </View>

                {/* ── 2. Welcome ── */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.greeting}>Welcome back</Text>
                    <Text style={styles.subtitle}>Manage your health appointments and records</Text>
                </View>

                {/* ── 3. Next Up Card ── */}
                {upcomingAppointment && (
                    <View style={styles.nextUpCard}>
                        <Text style={styles.nextUpLabel}>NEXT UP</Text>
                        <View style={styles.nextUpBody}>
                            <View style={styles.nextUpRow}>
                                <View style={[styles.doctorAvatar, { backgroundColor: getAvatarColor(upcomingAppointment.doctor_id) }]}>
                                    <Feather name="user" size={20} color="#374151" />
                                </View>
                                <View style={styles.nextUpInfo}>
                                    <Text style={styles.nextUpDoctor}>{doctors.find(d => d.id === upcomingAppointment.doctor_id)?.full_name ?? 'Doctor'}'s Appointment</Text>
                                    <Text style={styles.nextUpSpec}>{upcomingAppointment.appointment_type}</Text>
                                </View>
                            </View>
                            <View style={styles.nextUpTimeRow}>
                                <Feather name="clock" size={14} color={patientColors.textMuted} />
                                <Text style={styles.nextUpTime}>{new Date(upcomingAppointment.scheduled_time).toLocaleString()}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <Pressable
                                style={({ pressed }) => [styles.nextUpShareBtn, pressed && { opacity: 0.7 }]}
                                onPress={async () => {
                                    if (!token || !upcomingAppointment) return;
                                    const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://careconnect.app';
                                    try {
                                        const res = await getJoinToken(token, upcomingAppointment.id);
                                        if (!res.patient_join_token) {
                                            Alert.alert('Not ready', 'The doctor needs to start the call first.');
                                            return;
                                        }
                                        const joinUrl = `${WEB_URL}/join/${upcomingAppointment.id}?token=${encodeURIComponent(res.patient_join_token)}`;
                                        const msg = `Hi! Your CareConnect video consultation is ready.\n\nJoin here: ${joinUrl}`;
                                        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
                                    } catch (err: any) {
                                        Alert.alert('Share failed', err.message);
                                    }
                                }}
                            >
                                <Feather name="share-2" size={18} color={patientColors.primary} />
                            </Pressable>
                            <SmartJoinButton
                                scheduledTime={upcomingAppointment.scheduled_time}
                                durationMinutes={upcomingAppointment.duration_minutes || 30}
                                role="caregiver"
                                onPress={() => router.push(`/(caregiver)/consultation/${upcomingAppointment.id}` as any)}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                )}

                {/* ── 4. Book CTA ── */}
                <Pressable style={({ pressed }) => [styles.bookCta, pressed && { opacity: 0.85 }]}
                    onPress={openBookingWizard}>
                    <View style={styles.bookCtaIconCircle}>
                        <Feather name="plus" size={20} color={patientColors.primary} />
                    </View>
                    <View style={styles.bookCtaTextBlock}>
                        <Text style={styles.bookCtaTitle}>Book New Consultation</Text>
                        <Text style={styles.bookCtaSubtitle}>Find a specialist and schedule your visit</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={patientColors.primary} />
                </Pressable>

                {/* ── 5. Patients Under Care ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Patients Under Care</Text>
                </View>
                {patients.length > 0 ? (
                    patients.map((pt) => {
                        const age = pt.date_of_birth
                            ? Math.floor((Date.now() - new Date(pt.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                            : null;
                        return (
                            <Pressable
                                key={pt.id}
                                style={({ pressed }) => [styles.patientCard, pressed && { opacity: 0.85 }]}
                                onPress={() => { setSelectedPatient(pt); setIsPatientChartOpen(true); }}
                            >
                                <View style={[styles.patientAvatar, { backgroundColor: getAvatarColor(pt.full_name) }]}>
                                    <Text style={styles.patientAvatarText}>
                                        {pt.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </Text>
                                </View>
                                <View style={styles.patientInfo}>
                                    <Text style={styles.patientName} numberOfLines={1}>{pt.full_name}</Text>
                                    <Text style={styles.patientMeta}>
                                        {age ? `${age} yrs` : ''}{age && pt.blood_group ? ' • ' : ''}{pt.blood_group ?? ''}
                                        {pt.existing_conditions && pt.existing_conditions.length > 0
                                            ? ` • ${pt.existing_conditions.join(', ')}`
                                            : ''}
                                    </Text>
                                </View>
                                <Feather name="chevron-right" size={18} color={patientColors.textMuted} />
                            </Pressable>
                        );
                    })
                ) : (
                    <Pressable
                        style={({ pressed }) => [styles.emptyPatientCard, pressed && { opacity: 0.85 }]}
                        onPress={() => setIsAddPatientOpen(true)}
                    >
                        <Feather name="user-plus" size={20} color={patientColors.textMuted} />
                        <Text style={styles.emptyPatientText}>No patients added yet. Tap to add your first patient.</Text>
                    </Pressable>
                )}

                {/* ── 6. Recent Records ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Records</Text>
                    <Pressable onPress={() => router.push('/(caregiver)/records' as any)}>
                        <Text style={styles.viewAllLink}>View All</Text>
                    </Pressable>
                </View>
                {records.slice(0, 5).map((record) => (
                    <Pressable key={record.id}
                        style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.85 }]}
                        onPress={() => { setSelectedRecord(record); setIsRecordSheetOpen(true); }}>
                        <View style={styles.recordContent}>
                            <Text style={styles.recordDiagnosis}>{record.diagnosis}</Text>
                            <Text style={styles.recordMeta}>Doctor  •  {new Date(record.created_at).toLocaleDateString()}</Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={patientColors.textMuted} />
                    </Pressable>
                ))}
                <View style={{ height: spacing['3xl'] }} />
            </ScrollView>

            {/* ═══ AVATAR DROPDOWN MENU ═══ */}
            <Modal animationType="fade" transparent visible={isProfileMenuOpen} onRequestClose={() => setIsProfileMenuOpen(false)}>
                <Pressable style={styles.dropdownBackdrop} onPress={() => setIsProfileMenuOpen(false)}>
                    <View style={styles.dropdownMenu}>
                        {[
                            { icon: 'user' as const, label: 'Profile', route: '/(caregiver)/profile' },
                            { icon: 'file-text' as const, label: 'Your Reports', route: '/(caregiver)/records' },
                        ].map((item) => (
                            <Pressable
                                key={item.label}
                                style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: patientColors.primaryLight }]}
                                onPress={() => { setIsProfileMenuOpen(false); router.push(item.route as any); }}
                            >
                                <Feather name={item.icon} size={18} color={patientColors.primary} />
                                <Text style={styles.dropdownItemText}>{item.label}</Text>
                            </Pressable>
                        ))}
                        <View style={styles.dropdownDivider} />
                        <Pressable
                            style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: '#FEE2E2' }]}
                            onPress={() => { setIsProfileMenuOpen(false); setShowLogoutAlert(true); }}
                        >
                            <Feather name="log-out" size={18} color="#EF4444" />
                            <Text style={[styles.dropdownItemText, { color: '#EF4444' }]}>Logout</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* ═══ BOOKING BOTTOM SHEET MODAL ═══ */}
            <Modal animationType="slide" transparent visible={isBookingOpen} onRequestClose={closeBooking}>
                <Pressable style={ms.backdrop} onPress={closeBooking}><View /></Pressable>
                <View style={[ms.sheet, { paddingBottom: insets.bottom }]}>
                    <View style={ms.handleBar} />
                    <View style={ms.sheetHeader}>
                        {bookingStep > 1 ? (
                            <Pressable onPress={goBackStep} style={ms.navCircle}>
                                <Feather name="arrow-left" size={20} color={patientColors.textPrimary} />
                            </Pressable>
                        ) : <View style={{ width: 36 }} />}
                        <Text style={ms.sheetTitle}>{STEP_TITLES[bookingStep - 1]}</Text>
                        <Pressable onPress={closeBooking} style={ms.navCircle}>
                            <Feather name="x" size={20} color={patientColors.textMuted} />
                        </Pressable>
                    </View>
                    <View style={ms.progressRow}>
                        {[1, 2, 3, 4].map((s) => (
                            <View key={s} style={[ms.progressDot, s <= bookingStep && ms.progressDotActive]} />
                        ))}
                    </View>
                    <ScrollView contentContainerStyle={ms.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {bookingStep === 1 && renderStep1()}
                        {bookingStep === 2 && renderStep2()}
                        {bookingStep === 3 && renderStep3()}
                        {bookingStep === 4 && renderStep4()}
                    </ScrollView>
                </View>
            </Modal>

            {/* ═══ SUCCESS MODAL (themed) ═══ */}
            <Modal animationType="fade" transparent visible={showSuccess} onRequestClose={dismissSuccess}>
                <View style={ms.successOverlay}>
                    <View style={ms.successCard}>
                        <View style={ms.successIconCircle}>
                            <Feather name="check" size={32} color="#FFFFFF" />
                        </View>
                        <Text style={ms.successTitle}>Booking Confirmed!</Text>
                        <Text style={ms.successBody}>
                            Your consultation with {selectedDoctor?.full_name ?? 'your doctor'} has been booked successfully. You'll receive a confirmation email shortly.
                        </Text>
                        <Pressable style={({ pressed }) => [ms.successButton, pressed && { opacity: 0.85 }]}
                            onPress={dismissSuccess}>
                            <Text style={ms.successButtonText}>Back to Dashboard</Text>
                            <Feather name="arrow-right" size={18} color="#FFFFFF" />
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* ═══ MEDICAL RECORD SHEET ═══ */}
            <MedicalRecordSheet
                visible={isRecordSheetOpen}
                record={selectedRecord}
                onClose={() => setIsRecordSheetOpen(false)}
            />

            {/* ═══ LOGOUT CONFIRMATION ═══ */}
            <PatientThemedAlert
                visible={showLogoutAlert}
                variant="danger"
                icon="log-out"
                title="Log Out"
                message="Are you sure you want to log out? You'll need to sign in again to access your account."
                confirmLabel="Log Out"
                cancelLabel="Cancel"
                onConfirm={() => {
                    setShowLogoutAlert(false);
                    logout();
                }}
                onCancel={() => setShowLogoutAlert(false)}
            />

            {/* ═══ NO PATIENTS ALERT ═══ */}
            <PatientThemedAlert
                visible={showNoPatientsAlert}
                variant="warning"
                icon="user-plus"
                title="No Patients Yet"
                message="You need to add at least one patient before booking a consultation. Add a patient to get started."
                confirmLabel="Add Patient"
                cancelLabel="Cancel"
                onConfirm={() => {
                    setShowNoPatientsAlert(false);
                    setIsAddPatientOpen(true);
                }}
                onCancel={() => setShowNoPatientsAlert(false)}
            />

            {/* ═══ ADD PATIENT SHEET ═══ */}
            <AddPatientSheet
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
                onPatientAdded={fetchAll}
                onSubmit={async (data) => {
                    if (!token) return;
                    await addPatient(token, data);
                }}
            />

            {/* ═══ PATIENT CHART SHEET ═══ */}
            <PatientChartSheet
                visible={isPatientChartOpen}
                patient={selectedPatient}
                onClose={() => setIsPatientChartOpen(false)}
                onSave={async (patientId, data) => {
                    if (!token) return;
                    await updatePatient(token, patientId, data);
                    fetchAll();
                }}
            />

            {/* ═══ FLOATING ADD PATIENT FAB ═══ */}
            <Pressable
                style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
                onPress={() => setIsAddPatientOpen(true)}
            >
                <Feather name="plus" size={24} color="#FFFFFF" />
            </Pressable>
        </SafeAreaView>
    );
}

// ─── Dashboard Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: patientColors.background },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    logoImage: { width: 34, height: 34, resizeMode: 'contain' },
    brandText: { fontFamily: typography.fontFamily.bold, ...typography.size.lg, color: patientColors.textPrimary },
    avatarWrapper: { position: 'relative' },

    // Dropdown
    dropdownBackdrop: { flex: 1 },
    dropdownMenu: { position: 'absolute', top: 70, right: 20, width: 200, backgroundColor: patientColors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: patientColors.borderLight, paddingVertical: spacing.sm, ...shadows.elevated },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    dropdownItemText: { fontFamily: typography.fontFamily.medium, ...typography.size.base, color: patientColors.textPrimary },
    dropdownDivider: { height: 1, backgroundColor: patientColors.borderLight, marginVertical: spacing.xs },
    avatar: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: patientColors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: '#FFFFFF' },
    notificationDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: radii.full, backgroundColor: patientColors.error, borderWidth: 2, borderColor: patientColors.background },
    welcomeSection: { marginBottom: spacing['2xl'] },
    greeting: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: patientColors.textPrimary, marginBottom: spacing.xs },
    subtitle: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: patientColors.textMuted },
    nextUpCard: { backgroundColor: patientColors.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: patientColors.borderLight, ...shadows.elevated },
    nextUpLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.xs, color: patientColors.primary, letterSpacing: 1, marginBottom: spacing.md },
    nextUpBody: { marginBottom: spacing.lg },
    nextUpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    doctorAvatar: { width: 44, height: 44, borderRadius: radii.full, backgroundColor: patientColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    doctorAvatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: patientColors.primary },
    nextUpInfo: { flex: 1 },
    nextUpDoctor: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: patientColors.textPrimary },
    nextUpSpec: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: patientColors.textSecondary },
    nextUpTimeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 44 + spacing.md },
    nextUpTime: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: patientColors.textMuted },
    nextUpShareBtn: { width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: patientColors.border, backgroundColor: patientColors.surface },
    joinCallButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: patientColors.primary, paddingVertical: spacing.md, borderRadius: radii.md },
    joinCallText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    bookCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: patientColors.primaryLight, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing['2xl'], gap: spacing.md },
    bookCtaIconCircle: { width: 44, height: 44, borderRadius: radii.full, backgroundColor: patientColors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.card },
    bookCtaTextBlock: { flex: 1 },
    bookCtaTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: patientColors.textPrimary },
    bookCtaSubtitle: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: patientColors.textSecondary, marginTop: spacing.xxs },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    sectionTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.lg, color: patientColors.textPrimary },
    viewAllLink: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: patientColors.primary },
    recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: patientColors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: patientColors.borderLight, ...shadows.card },
    recordContent: { flex: 1 },
    recordDiagnosis: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: patientColors.textPrimary, marginBottom: spacing.xxs },
    recordMeta: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: patientColors.textMuted },

    // Patient cards (full-width rows)
    patientCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: patientColors.surface, borderRadius: radii.md,
        padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1,
        borderColor: patientColors.borderLight, gap: spacing.md, ...shadows.card,
    },
    patientAvatar: {
        width: 44, height: 44, borderRadius: radii.full,
        alignItems: 'center', justifyContent: 'center',
    },
    patientAvatarText: {
        fontFamily: typography.fontFamily.bold, ...typography.size.base, color: '#FFFFFF',
    },
    patientInfo: { flex: 1 },
    patientName: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base,
        color: patientColors.textPrimary, marginBottom: 2,
    },
    patientMeta: {
        fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: patientColors.textMuted,
    },
    emptyPatientCard: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: patientColors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.lg, marginBottom: spacing.xl,
        borderWidth: 1, borderColor: patientColors.borderLight, borderStyle: 'dashed',
    },
    emptyPatientText: {
        flex: 1, fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: patientColors.textMuted,
    },

    // FAB
    fab: {
        position: 'absolute', bottom: 24, right: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: patientColors.primary,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.elevated,
    },
});

// ─── Modal Styles ───────────────────────────────────────────────────────────

const ms = StyleSheet.create({
    // Backdrop + sheet
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, backgroundColor: patientColors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadows.elevated },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: patientColors.border, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },

    // Header
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    navCircle: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: patientColors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.lg, color: patientColors.textPrimary, flex: 1, textAlign: 'center' },

    // Progress
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: patientColors.borderLight },
    progressDotActive: { backgroundColor: patientColors.primary, width: 24, borderRadius: 4 },

    // Scroll
    sheetScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'] },
    stepBody: { paddingTop: spacing.md },

    // Step 1 — Specialty grid
    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    specCard: {
        width: '47%' as unknown as number,
        backgroundColor: patientColors.surfaceMuted, borderRadius: radii.lg,
        paddingVertical: spacing.xl, paddingHorizontal: spacing.md,
        alignItems: 'center', gap: spacing.sm,
        borderWidth: 1, borderColor: patientColors.borderLight,
    },
    specIconCircle: { width: 48, height: 48, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    specName: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: patientColors.textPrimary, textAlign: 'center' },

    // Step 2 — Doctor list
    doctorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: patientColors.surfaceMuted, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md, borderWidth: 1, borderColor: patientColors.borderLight },
    doctorAvatar: { width: 48, height: 48, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    doctorAvatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm },
    doctorInfo: { flex: 1 },
    doctorName: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: patientColors.textPrimary },
    doctorMeta: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: patientColors.textMuted, marginTop: spacing.xxs },
    doctorFee: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: patientColors.primary, marginTop: spacing.xs },

    // Step 3 — Calendar
    subLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: patientColors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    calMonthTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: patientColors.textPrimary },
    calNav: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: patientColors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    calDowRow: { flexDirection: 'row', marginBottom: spacing.xs },
    calDowText: { flex: 1, textAlign: 'center', fontFamily: typography.fontFamily.medium, ...typography.size.xs, color: patientColors.textMuted },
    calWeekRow: { flexDirection: 'row', marginBottom: spacing.xxs },
    calCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, margin: 1 },
    calCellToday: { borderWidth: 1.5, borderColor: patientColors.primary },
    calCellSelected: { backgroundColor: patientColors.primary },
    calCellDisabled: { opacity: 0.3 },
    calCellText: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: patientColors.textPrimary },
    calCellTodayText: { color: patientColors.primary, fontFamily: typography.fontFamily.bold },
    calCellSelectedText: { color: '#FFFFFF', fontFamily: typography.fontFamily.bold },
    calCellDisabledText: { color: patientColors.textMuted },

    // Time grid — fixed 3 columns
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    timePill: { width: '31%' as unknown as number, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: patientColors.border, backgroundColor: patientColors.surface, alignItems: 'center' },
    timePillSelected: { backgroundColor: patientColors.primary, borderColor: patientColors.primary },
    timePillText: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: patientColors.textPrimary },
    timePillTextSelected: { color: '#FFFFFF' },
    continueButton: { marginTop: spacing['2xl'], backgroundColor: patientColors.primary, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
    continueButtonDisabled: { backgroundColor: patientColors.border },
    continueText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    continueTextDisabled: { color: patientColors.textMuted },

    // Step 4 — Summary
    summaryCard: { backgroundColor: patientColors.surfaceMuted, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.xl, borderWidth: 1, borderColor: patientColors.borderLight },
    summaryTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: patientColors.textPrimary, marginBottom: spacing.lg },
    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, gap: spacing.md },
    summaryDotContainer: { width: 20, paddingTop: spacing.xs, alignItems: 'center' },
    summaryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: patientColors.primary },
    summaryContent: { flex: 1 },
    summaryLabel: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: patientColors.textMuted },
    summaryValue: { fontFamily: typography.fontFamily.medium, ...typography.size.base, color: patientColors.textPrimary, marginTop: spacing.xxs },
    summaryDivider: { height: 1, backgroundColor: patientColors.border, marginVertical: spacing.md },
    summaryFeeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryFeeLabel: { fontFamily: typography.fontFamily.medium, ...typography.size.base, color: patientColors.textPrimary },
    summaryFeeValue: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: patientColors.primary },

    // Step 4 — Payment method
    paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
    paymentCard: {
        width: '48%' as unknown as number,
        backgroundColor: patientColors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.md, borderWidth: 1.5, borderColor: patientColors.borderLight,
        alignItems: 'center', gap: spacing.xs, position: 'relative',
    },
    paymentCardActive: { borderColor: patientColors.primary, backgroundColor: patientColors.primaryLight },
    paymentIcon: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: patientColors.surface, alignItems: 'center', justifyContent: 'center' },
    paymentIconActive: { backgroundColor: patientColors.primary },
    paymentLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: patientColors.textPrimary, textAlign: 'center' },
    paymentLabelActive: { color: patientColors.primaryDark },
    paymentDesc: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: patientColors.textMuted, textAlign: 'center' },
    paymentDescActive: { color: patientColors.textSecondary },
    paymentCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 22, height: 22, borderRadius: 11, backgroundColor: patientColors.primaryLight, alignItems: 'center', justifyContent: 'center' },

    // Pay button
    payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: patientColors.primary, paddingVertical: spacing.lg, borderRadius: radii.md, marginBottom: spacing.md },
    payButtonText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    payNote: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: patientColors.textMuted, textAlign: 'center' },

    // Success modal
    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
    successCard: { backgroundColor: patientColors.surface, borderRadius: radii.xl, padding: spacing['3xl'], alignItems: 'center', width: '100%', ...shadows.elevated },
    successIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: patientColors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    successTitle: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: patientColors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
    successBody: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: patientColors.textSecondary, textAlign: 'center', marginBottom: spacing['2xl'], lineHeight: 22 },
    successButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: patientColors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing['2xl'], borderRadius: radii.md, width: '100%' },
    successButtonText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },

    // Shared
    emptyText: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: patientColors.textMuted, textAlign: 'center', paddingVertical: spacing['3xl'] },
});
