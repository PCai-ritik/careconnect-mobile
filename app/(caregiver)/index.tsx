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
    Pressable,
    ScrollView,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    Linking,
    Alert,
    RefreshControl,
    Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
    spacing,
    typography,
    radii,
    shadows,
    getBranding,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { getMyAppointments, getDoctorsByHospital, getPatientRecords, getLinkedPatients, bookAppointment, addPatient, updatePatient, getJoinToken } from '@/services/caregiver';
import type { DoctorProfile, Appointment, MedicalRecord, PatientProfile } from '@/services/types';
import MedicalRecordSheet from '@/components/MedicalRecordSheet';
import PatientThemedAlert from '@/components/patient/PatientThemedAlert';
import AddPatientSheet from '@/components/caregiver/AddPatientSheet';
import PatientChartSheet from '@/components/caregiver/PatientChartSheet';
import SmartJoinButton from '@/components/SmartJoinButton';
import { ThemedView, ThemedText } from '@/components/shared/Themed';

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

const DEFAULT_SPEC = { icon: 'plus-circle' as FeatherIcon, color: '#3B82F6' }; // Default color

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
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const ms = useMs(colors);

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

    const [refreshing, setRefreshing] = useState(false);

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
            setRefreshing(false);
        }
    }, [token, user?.hospitalId]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAll();
    }, [fetchAll]);

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

    const isProcessingSummary = useMemo(() => {
        if (!upcomingAppointment) return false;
        if (upcomingAppointment.status !== 'IN_PROGRESS') return false;
        const endTimeMs = new Date(upcomingAppointment.scheduled_time).getTime() + ((upcomingAppointment.duration_minutes || 30) * 60 * 1000);
        return Date.now() > endTimeMs;
    }, [upcomingAppointment]);

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
        <ThemedView style={ms.stepBody}>
            <ThemedView style={ms.specGrid}>
                {specialties.map((spec) => {
                    const meta = getSpecMeta(spec);
                    return (
                        <Pressable
                            key={spec}
                            style={({ pressed }) => [ms.specCard, pressed && { opacity: 0.8 }]}
                            onPress={() => handleSpecialtySelect(spec)}
                        >
                            <ThemedView style={[ms.specIconCircle, { backgroundColor: meta.color + '18' }]}>
                                <Feather name={meta.icon} size={22} color={meta.color} />
                            </ThemedView>
                            <ThemedText weight="medium" size="sm" style={ms.specName}>{spec}</ThemedText>
                        </Pressable>
                    );
                })}
            </ThemedView>
        </ThemedView>
    );

    const renderStep2 = () => (
        <ThemedView style={ms.stepBody}>
            {filteredDoctors.length === 0 ? (
                <ThemedText size="sm" color="muted" style={ms.emptyText}>No doctors available for this specialty.</ThemedText>
            ) : (
                filteredDoctors.map((doc) => {
                    const meta = getSpecMeta(doc.specialization);
                    return (
                        <Pressable
                            key={doc.id}
                            style={({ pressed }) => [ms.doctorCard, pressed && { opacity: 0.85 }]}
                            onPress={() => handleDoctorSelect(doc.id)}
                        >
                            <ThemedView style={[ms.doctorAvatar, { backgroundColor: getAvatarColor(doc.full_name) }]}>
                                <Feather name="user" size={20} color="#374151" />
                            </ThemedView>
                            <ThemedView style={ms.doctorInfo}>
                                <ThemedText weight="semiBold" size="base" style={ms.doctorName}>{doc.full_name}</ThemedText>
                                <ThemedText size="sm" color="muted" style={ms.doctorMeta}>
                                    {doc.years_of_experience ?? ''}  •  {doc.hospital_affiliation ?? ''}
                                </ThemedText>
                                <ThemedText weight="medium" size="sm" color="primary" style={ms.doctorFee}>
                                    {currencySymbol(doc.currency)}{doc.consultation_fee ?? 0} / {doc.consultation_duration_minutes ?? 30} min
                                </ThemedText>
                            </ThemedView>
                            <Feather name="chevron-right" size={18} color={colors.textMuted} />
                        </Pressable>
                    );
                })
            )}
        </ThemedView>
    );

    const renderStep3 = () => {
        return (
            <ThemedView style={ms.stepBody}>
                {/* Month header with nav arrows */}
                <ThemedView style={ms.calHeader}>
                    <Pressable onPress={goPrevMonth} disabled={!canGoPrev} style={({ pressed }) => [ms.calNav, !canGoPrev && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}>
                        <Feather name="chevron-left" size={20} color={colors.textPrimary} />
                    </Pressable>
                    <ThemedText weight="semiBold" size="lg" style={ms.calMonthTitle}>{MONTH_NAMES[calMonth]} {calYear}</ThemedText>
                    <Pressable onPress={goNextMonth} disabled={!canGoNext} style={({ pressed }) => [ms.calNav, !canGoNext && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}>
                        <Feather name="chevron-right" size={20} color={colors.textPrimary} />
                    </Pressable>
                </ThemedView>

                {/* Day-of-week header */}
                <ThemedView style={ms.calDowRow}>
                    {DAY_HDR.map((d) => (
                        <ThemedText weight="medium" size="sm" color="muted" key={d} style={ms.calDowText}>{d}</ThemedText>
                    ))}
                </ThemedView>

                {/* Calendar grid */}
                {monthGrid.map((week, wi) => (
                    <ThemedView key={wi} style={ms.calWeekRow}>
                        {week.map((cell, ci) => {
                            if (!cell) return <ThemedView key={ci} style={ms.calCell} />;

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
                                    <ThemedText weight="regular" size="base" style={[
                                        ms.calCellText,
                                        today && !selected && ms.calCellTodayText,
                                        selected && ms.calCellSelectedText,
                                        disabled && ms.calCellDisabledText,
                                    ]}>
                                        {cell.getDate()}
                                    </ThemedText>
                                </Pressable>
                            );
                        })}
                    </ThemedView>
                ))}

                {/* Time slots — 3-column symmetric grid */}
                {selectedDate && (
                    <>
                        <ThemedText weight="semiBold" size="sm" color="secondary" style={[ms.subLabel, { marginTop: spacing.xl }]}>Select a Time</ThemedText>
                        {timeSlots.length === 0 ? (
                            <ThemedText size="sm" color="muted" style={ms.emptyText}>Doctor is unavailable on this date.</ThemedText>
                        ) : (
                            <ThemedView style={ms.timeGrid}>
                                {timeSlots.map((slot) => (
                                    <Pressable
                                        key={slot}
                                        onPress={() => setSelectedTime(slot)}
                                        style={[ms.timePill, selectedTime === slot && ms.timePillSelected]}
                                    >
                                        <ThemedText weight="medium" size="sm" style={[ms.timePillText, selectedTime === slot && ms.timePillTextSelected]}>
                                            {slot}
                                        </ThemedText>
                                    </Pressable>
                                ))}
                            </ThemedView>
                        )}
                    </>
                )}

                {/* Continue button */}
                <Pressable
                    style={[ms.continueButton, !selectedTime && ms.continueButtonDisabled]}
                    disabled={!selectedTime}
                    onPress={() => setBookingStep(4)}
                >
                    <ThemedText weight="semiBold" size="base" style={[ms.continueText, !selectedTime && ms.continueTextDisabled]}>Continue</ThemedText>
                </Pressable>
            </ThemedView>
        );
    };

    const renderStep4 = () => {
        const doc = selectedDoctor;
        if (!doc || !selectedDate || !selectedTime) return null;
        const dateStr = `${DAY_HDR[selectedDate.getDay()]}, ${MONTH_ABBR[selectedDate.getMonth()]} ${selectedDate.getDate()}`;

        return (
            <ThemedView style={ms.stepBody}>
                {/* Booking summary */}
                <ThemedView style={ms.summaryCard}>
                    <ThemedText weight="semiBold" size="lg" style={ms.summaryTitle}>Booking Summary</ThemedText>
                    {[
                        { label: 'Doctor', value: doc.full_name },
                        { label: 'Specialty', value: doc.specialization },
                        { label: 'Date & Time', value: `${dateStr} at ${selectedTime}` },
                        { label: 'Duration', value: `${doc.consultation_duration_minutes ?? 30} min` },
                    ].map((item) => (
                        <ThemedView key={item.label} style={ms.summaryRow}>
                            <ThemedView style={ms.summaryDotContainer}>
                                <ThemedView style={ms.summaryDot} />
                            </ThemedView>
                            <ThemedView style={ms.summaryContent}>
                                <ThemedText size="sm" color="secondary" style={ms.summaryLabel}>{item.label}</ThemedText>
                                <ThemedText weight="medium" size="base" style={ms.summaryValue}>{item.value}</ThemedText>
                            </ThemedView>
                        </ThemedView>
                    ))}
                    <ThemedView style={ms.summaryDivider} />
                    <ThemedView style={ms.summaryFeeRow}>
                        <ThemedText weight="medium" size="base" style={ms.summaryFeeLabel}>Consultation Fee</ThemedText>
                        <ThemedText weight="semiBold" size="lg" style={ms.summaryFeeValue}>
                            {currencySymbol(doc.currency)}{doc.consultation_fee ?? 0}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>

                {/* Payment method selection */}
                <ThemedText weight="semiBold" size="sm" color="secondary" style={ms.subLabel}>Payment Method</ThemedText>
                <ThemedView style={ms.paymentGrid}>
                    {doctorPaymentMethods.map((pm) => {
                        const isActive = selectedPayment === pm.id;
                        return (
                            <Pressable
                                key={pm.id}
                                onPress={() => setSelectedPayment(pm.id)}
                                style={[ms.paymentCard, isActive && ms.paymentCardActive]}
                            >
                                <ThemedView style={[ms.paymentIcon, isActive && ms.paymentIconActive]}>
                                    <Feather name={pm.icon} size={20} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                                </ThemedView>
                                <ThemedText weight="medium" size="base" style={[ms.paymentLabel, isActive && ms.paymentLabelActive]}>{pm.label}</ThemedText>
                                {isActive && (
                                    <ThemedView style={ms.paymentCheck}>
                                        <Feather name="check" size={14} color={colors.primary} />
                                    </ThemedView>
                                )}
                            </Pressable>
                        );
                    })}
                </ThemedView>

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
                            <ThemedText weight="semiBold" size="base" style={ms.payButtonText}>Pay & Book Consultation</ThemedText>
                        </>
                    )}
                </Pressable>
                <ThemedText style={ms.payNote}>
                    You'll receive a confirmation with the video call link after payment.
                </ThemedText>
            </ThemedView>
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
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* ── 1. Header ── */}
                <ThemedView style={styles.header}>
                    <ThemedView style={styles.headerLeft}>
                        {getBranding().logoUrl ? (
                            <Image
                                source={{ uri: getBranding().logoUrl as string }}
                                style={styles.logoImage}
                            />
                        ) : (
                            <Image
                                source={require('@/assets/images/stethescope.png')}
                                style={styles.logoImage}
                            />
                        )}
                        <ThemedText weight="bold" size="xl" style={styles.brandText}>{getBranding().name || 'CareConnect'}</ThemedText>
                    </ThemedView>
                    <Pressable style={styles.avatarWrapper} onPress={() => setIsProfileMenuOpen(true)}>
                        <ThemedView style={[styles.avatar, { backgroundColor: getAvatarColor('Caregiver') }]}>
                            <Feather name="user" size={20} color="#374151" />
                        </ThemedView>
                        {hasNotifications && <ThemedView style={styles.notificationDot} />}
                    </Pressable>
                </ThemedView>

                {/* ── 2. Welcome ── */}
                <ThemedView style={styles.welcomeSection}>
                    <ThemedText weight="bold" size="2xl" style={styles.greeting}>Welcome back</ThemedText>
                    <ThemedText color="secondary" style={styles.subtitle}>Manage your health appointments and records</ThemedText>
                </ThemedView>

                {/* ── 3. Next Up Card ── */}
                {upcomingAppointment && (
                    <ThemedView style={styles.nextUpCard}>
                        <ThemedText weight="semiBold" size="xs" style={styles.nextUpLabel}>NEXT UP</ThemedText>
                        <ThemedView style={styles.nextUpBody}>
                            <ThemedView style={styles.nextUpRow}>
                                <ThemedView style={[styles.doctorAvatar, { backgroundColor: getAvatarColor(upcomingAppointment.doctor_id) }]}>
                                    <Feather name="user" size={20} color="#374151" />
                                </ThemedView>
                                <ThemedView style={styles.nextUpInfo}>
                                    <ThemedText weight="semiBold" size="base" style={styles.nextUpDoctor}>{doctors.find(d => d.id === upcomingAppointment.doctor_id)?.full_name ?? 'Doctor'}'s Appointment</ThemedText>
                                    <ThemedText size="sm" color="muted" style={styles.nextUpSpec}>{upcomingAppointment.appointment_type}</ThemedText>
                                </ThemedView>
                            </ThemedView>
                            <ThemedView style={styles.nextUpTimeRow}>
                                <Feather name="clock" size={14} color={colors.textMuted} />
                                <ThemedText weight="medium" size="sm" style={styles.nextUpTime}>{new Date(upcomingAppointment.scheduled_time).toLocaleString()}</ThemedText>
                            </ThemedView>
                        </ThemedView>
                        <ThemedView style={{ flexDirection: 'row', gap: spacing.sm }}>
                            {isProcessingSummary ? (
                                <ThemedView style={[styles.nextUpJoinBtn, { backgroundColor: colors.primaryLight, flex: 1 }]}>
                                    <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.sm }} />
                                    <ThemedText weight="semiBold" size="sm" style={[styles.nextUpJoinText, { color: colors.primaryDark }]}>Processing Summary...</ThemedText>
                                </ThemedView>
                            ) : (
                                <>
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
                                        <Feather name="share-2" size={18} color={colors.primary} />
                                    </Pressable>
                                    <SmartJoinButton
                                        scheduledTime={upcomingAppointment.scheduled_time}
                                        durationMinutes={upcomingAppointment.duration_minutes || 30}
                                        appointmentStatus={upcomingAppointment.status}
                                        role="caregiver"
                                        onPress={() => router.push(`/(caregiver)/consultation/${upcomingAppointment.id}` as any)}
                                        style={{ flex: 1 }}
                                    />
                                </>
                            )}
                        </ThemedView>
                    </ThemedView>
                )}

                {/* ── 4. Book CTA ── */}
                <Pressable style={({ pressed }) => [styles.bookCta, pressed && { opacity: 0.85 }]}
                    onPress={openBookingWizard}>
                    <ThemedView style={styles.bookCtaIconCircle}>
                        <Feather name="plus" size={20} color={colors.primary} />
                    </ThemedView>
                    <ThemedView style={styles.bookCtaTextBlock}>
                        <ThemedText weight="semiBold" size="base" style={styles.bookCtaTitle}>Book New Consultation</ThemedText>
                        <ThemedText size="sm" color="muted" style={styles.bookCtaSubtitle}>Find a specialist and schedule your visit</ThemedText>
                    </ThemedView>
                    <Feather name="chevron-right" size={20} color={colors.primary} />
                </Pressable>

                {/* ── 5. Patients Under Care ── */}
                <ThemedView style={styles.sectionHeader}>
                    <ThemedText weight="semiBold" size="lg" style={styles.sectionTitle}>Patients Under Care</ThemedText>
                </ThemedView>
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
                                <ThemedView style={[styles.patientAvatar, { backgroundColor: getAvatarColor(pt.full_name) }]}>
                                    <ThemedText weight="bold" size="lg" style={styles.patientAvatarText}>
                                        {pt.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </ThemedText>
                                </ThemedView>
                                <ThemedView style={styles.patientInfo}>
                                    <ThemedText weight="semiBold" size="base" style={styles.patientName} numberOfLines={1}>{pt.full_name}</ThemedText>
                                    <ThemedText size="sm" color="muted" style={styles.patientMeta}>
                                        {age ? `${age} yrs` : ''}{age && pt.blood_group ? ' • ' : ''}{pt.blood_group ?? ''}
                                        {pt.existing_conditions && pt.existing_conditions.length > 0
                                            ? ` • ${pt.existing_conditions.join(', ')}`
                                            : ''}
                                    </ThemedText>
                                </ThemedView>
                                <Feather name="chevron-right" size={18} color={colors.textMuted} />
                            </Pressable>
                        );
                    })
                ) : (
                    <Pressable
                        style={({ pressed }) => [styles.emptyPatientCard, pressed && { opacity: 0.85 }]}
                        onPress={() => setIsAddPatientOpen(true)}
                    >
                        <Feather name="user-plus" size={20} color={colors.textMuted} />
                        <ThemedText size="sm" color="muted" style={styles.emptyPatientText}>No patients added yet. Tap to add your first patient.</ThemedText>
                    </Pressable>
                )}

                {/* ── 6. Recent Records ── */}
                <ThemedView style={styles.sectionHeader}>
                    <ThemedText weight="semiBold" size="lg" style={styles.sectionTitle}>Recent Records</ThemedText>
                    <Pressable onPress={() => router.push('/(caregiver)/records' as any)}>
                        <ThemedText weight="medium" size="sm" color="primary" style={styles.viewAllLink}>View All</ThemedText>
                    </Pressable>
                </ThemedView>
                {records.slice(0, 5).map((record) => (
                    <Pressable key={record.id}
                        style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.85 }]}
                        onPress={() => { setSelectedRecord(record); setIsRecordSheetOpen(true); }}>
                        <ThemedView style={styles.recordContent}>
                            <ThemedText weight="semiBold" size="base" style={styles.recordDiagnosis}>{record.diagnosis}</ThemedText>
                            <ThemedText size="sm" color="muted" style={styles.recordMeta}>Doctor  •  {new Date(record.created_at).toLocaleDateString()}</ThemedText>
                        </ThemedView>
                        <Feather name="chevron-right" size={18} color={colors.textMuted} />
                    </Pressable>
                ))}

                {/* ── 7. Past Consultations ── */}
                <ThemedView style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                    <ThemedText weight="semiBold" size="lg" style={styles.sectionTitle}>Past Consultations</ThemedText>
                </ThemedView>
                {appointments.filter(a => a.status === 'COMPLETED').slice(0, 5).map((appt) => (
                    <Pressable
                        key={appt.id}
                        style={({ pressed }) => [styles.recordCard, pressed && { opacity: 0.85 }]}
                        onPress={() => router.push({ pathname: '/(caregiver)/post-call-summary', params: { appointmentId: appt.id } } as any)}
                    >
                        <ThemedView style={styles.recordContent}>
                            <ThemedText weight="semiBold" size="base" style={styles.recordDiagnosis}>
                                Dr. {doctors.find(d => d.id === appt.doctor_id)?.full_name ?? 'Unknown'}
                            </ThemedText>
                            <ThemedText size="sm" color="muted" style={styles.recordMeta}>
                                {new Date(appt.scheduled_time).toLocaleDateString()} • Video Consultation
                            </ThemedText>
                        </ThemedView>
                        <Feather name="chevron-right" size={18} color={colors.textMuted} />
                    </Pressable>
                ))}
                {appointments.filter(a => a.status === 'COMPLETED').length === 0 && (
                    <ThemedText size="sm" color="muted" style={{ textAlign: 'center', marginTop: spacing.sm }}>
                        No past consultations yet.
                    </ThemedText>
                )}

                <ThemedView style={{ height: spacing['3xl'] }} />
            </ScrollView>

            {/* ═══ AVATAR DROPDOWN MENU ═══ */}
            <Modal animationType="fade" transparent visible={isProfileMenuOpen} onRequestClose={() => setIsProfileMenuOpen(false)}>
                <Pressable style={styles.dropdownBackdrop} onPress={() => setIsProfileMenuOpen(false)}>
                    <ThemedView style={styles.dropdownMenu}>
                        {[
                            { icon: 'user' as const, label: 'Profile', route: '/(caregiver)/profile' },
                            { icon: 'file-text' as const, label: 'Your Reports', route: '/(caregiver)/records' },
                        ].map((item) => (
                            <Pressable
                                key={item.label}
                                style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: colors.primaryLight }]}
                                onPress={() => { setIsProfileMenuOpen(false); router.push(item.route as any); }}
                            >
                                <Feather name={item.icon} size={18} color={colors.primary} />
                                <ThemedText weight="medium" size="base" style={styles.dropdownItemText}>{item.label}</ThemedText>
                            </Pressable>
                        ))}
                        <ThemedView style={styles.dropdownDivider} />
                        <Pressable
                            style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: '#FEE2E2' }]}
                            onPress={() => { setIsProfileMenuOpen(false); setShowLogoutAlert(true); }}
                        >
                            <Feather name="log-out" size={18} color="#EF4444" />
                            <ThemedText weight="medium" size="base" style={[styles.dropdownItemText, { color: '#EF4444' }]}>Logout</ThemedText>
                        </Pressable>
                    </ThemedView>
                </Pressable>
            </Modal>

            {/* ═══ BOOKING BOTTOM SHEET MODAL ═══ */}
            <Modal animationType="slide" transparent visible={isBookingOpen} onRequestClose={closeBooking}>
                <Pressable style={ms.backdrop} onPress={closeBooking}><ThemedView /></Pressable>
                <ThemedView style={[ms.sheet, { paddingBottom: insets.bottom }]}>
                    <ThemedView style={ms.handleBar} />
                    <ThemedView style={ms.sheetHeader}>
                        {bookingStep > 1 ? (
                            <Pressable onPress={goBackStep} style={ms.navCircle}>
                                <Feather name="arrow-left" size={20} color={colors.textPrimary} />
                            </Pressable>
                        ) : <ThemedView style={{ width: 36 }} />}
                        <ThemedText weight="semiBold" size="lg" style={ms.sheetTitle}>{STEP_TITLES[bookingStep - 1]}</ThemedText>
                        <Pressable onPress={closeBooking} style={ms.navCircle}>
                            <Feather name="x" size={20} color={colors.textMuted} />
                        </Pressable>
                    </ThemedView>
                    <ThemedView style={ms.progressRow}>
                        {[1, 2, 3, 4].map((s) => (
                            <ThemedView key={s} style={[ms.progressDot, s <= bookingStep && ms.progressDotActive]} />
                        ))}
                    </ThemedView>
                    <ScrollView contentContainerStyle={ms.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {bookingStep === 1 && renderStep1()}
                        {bookingStep === 2 && renderStep2()}
                        {bookingStep === 3 && renderStep3()}
                        {bookingStep === 4 && renderStep4()}
                    </ScrollView>
                </ThemedView>
            </Modal>

            {/* ═══ SUCCESS MODAL (themed) ═══ */}
            <Modal animationType="fade" transparent visible={showSuccess} onRequestClose={dismissSuccess}>
                <ThemedView style={ms.successOverlay}>
                    <ThemedView style={ms.successCard}>
                        <ThemedView style={ms.successIconCircle}>
                            <Feather name="check" size={32} color="#FFFFFF" />
                        </ThemedView>
                        <ThemedText weight="bold" size="xl" style={ms.successTitle}>Booking Confirmed!</ThemedText>
                        <ThemedText size="sm" color="secondary" style={ms.successBody}>
                            Your consultation with {selectedDoctor?.full_name ?? 'your doctor'} has been booked successfully. You'll receive a confirmation email shortly.
                        </ThemedText>
                        <Pressable style={({ pressed }) => [ms.successButton, pressed && { opacity: 0.85 }]}
                            onPress={dismissSuccess}>
                            <ThemedText weight="semiBold" size="base" style={ms.successButtonText}>Back to Dashboard</ThemedText>
                            <Feather name="arrow-right" size={18} color="#FFFFFF" />
                        </Pressable>
                    </ThemedView>
                </ThemedView>
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

const useStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    logoImage: { width: 34, height: 34, resizeMode: 'contain' },
    brandText: { fontFamily: typography.fontFamily.bold, ...typography.size.lg, color: colors.textPrimary },
    avatarWrapper: { position: 'relative' },

    // Dropdown
    dropdownBackdrop: { flex: 1 },
    dropdownMenu: { position: 'absolute', top: 70, right: 20, width: 200, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, paddingVertical: spacing.sm, ...shadows.elevated },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    dropdownItemText: { fontFamily: typography.fontFamily.medium, ...typography.size.base, color: colors.textPrimary },
    dropdownDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs },
    avatar: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: '#FFFFFF' },
    notificationDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.background },
    welcomeSection: { marginBottom: spacing['2xl'] },
    greeting: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: colors.textPrimary, marginBottom: spacing.xs },
    subtitle: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textMuted },
    nextUpCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.borderLight, ...shadows.elevated },
    nextUpLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.xs, color: colors.primary, letterSpacing: 1, marginBottom: spacing.md },
    nextUpBody: { marginBottom: spacing.lg },
    nextUpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    doctorAvatar: { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    doctorAvatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: colors.primary },
    nextUpInfo: { flex: 1 },
    nextUpDoctor: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary },
    nextUpSpec: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textSecondary },
    nextUpTimeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 44 + spacing.md },
    nextUpTime: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.textMuted },
    nextUpJoinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, paddingVertical: spacing.md },
    nextUpJoinText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base },
    nextUpShareBtn: { width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    joinCallButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radii.md },
    joinCallText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    bookCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing['2xl'], gap: spacing.md },
    bookCtaIconCircle: { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.card },
    bookCtaTextBlock: { flex: 1 },
    bookCtaTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary },
    bookCtaSubtitle: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textSecondary, marginTop: spacing.xxs },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    sectionTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.lg, color: colors.textPrimary },
    viewAllLink: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.primary },
    recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight, ...shadows.card },
    recordContent: { flex: 1 },
    recordDiagnosis: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary, marginBottom: spacing.xxs },
    recordMeta: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textMuted },

    // Patient cards (full-width rows)
    patientCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radii.md,
        padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1,
        borderColor: colors.borderLight, gap: spacing.md, ...shadows.card,
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
        color: colors.textPrimary, marginBottom: 2,
    },
    patientMeta: {
        fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: colors.textMuted,
    },
    emptyPatientCard: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.lg, marginBottom: spacing.xl,
        borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed',
    },
    emptyPatientText: {
        flex: 1, fontFamily: typography.fontFamily.regular, ...typography.size.sm,
        color: colors.textMuted,
    },

    // FAB
    fab: {
        position: 'absolute', bottom: 24, right: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.elevated,
    },
});

// ─── Modal Styles ───────────────────────────────────────────────────────────

const useMs = (colors: any) => StyleSheet.create({
    // Backdrop + sheet
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadows.elevated },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },

    // Header
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    navCircle: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.lg, color: colors.textPrimary, flex: 1, textAlign: 'center' },

    // Progress
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderLight },
    progressDotActive: { backgroundColor: colors.primary, width: 24, borderRadius: 4 },

    // Scroll
    sheetScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing['6xl'] },
    stepBody: { paddingTop: spacing.md },

    // Step 1 — Specialty grid
    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    specCard: {
        width: '47%' as unknown as number,
        backgroundColor: colors.surfaceMuted, borderRadius: radii.lg,
        paddingVertical: spacing.xl, paddingHorizontal: spacing.md,
        alignItems: 'center', gap: spacing.sm,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    specIconCircle: { width: 48, height: 48, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    specName: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.textPrimary, textAlign: 'center' },

    // Step 2 — Doctor list
    doctorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
    doctorAvatar: { width: 48, height: 48, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    doctorAvatarText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm },
    doctorInfo: { flex: 1 },
    doctorName: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary },
    doctorMeta: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textMuted, marginTop: spacing.xxs },
    doctorFee: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.primary, marginTop: spacing.xs },

    // Step 3 — Calendar
    subLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    calMonthTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary },
    calNav: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    calDowRow: { flexDirection: 'row', marginBottom: spacing.xs },
    calDowText: { flex: 1, textAlign: 'center', fontFamily: typography.fontFamily.medium, ...typography.size.xs, color: colors.textMuted },
    calWeekRow: { flexDirection: 'row', marginBottom: spacing.xxs },
    calCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, margin: 1 },
    calCellToday: { borderWidth: 1.5, borderColor: colors.primary },
    calCellSelected: { backgroundColor: colors.primary },
    calCellDisabled: { opacity: 0.3 },
    calCellText: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.textPrimary },
    calCellTodayText: { color: colors.primary, fontFamily: typography.fontFamily.bold },
    calCellSelectedText: { color: '#FFFFFF', fontFamily: typography.fontFamily.bold },
    calCellDisabledText: { color: colors.textMuted },

    // Time grid — fixed 3 columns
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    timePill: { width: '31%' as unknown as number, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
    timePillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    timePillText: { fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: colors.textPrimary },
    timePillTextSelected: { color: '#FFFFFF' },
    continueButton: { marginTop: spacing['2xl'], backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
    continueButtonDisabled: { backgroundColor: colors.border },
    continueText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    continueTextDisabled: { color: colors.textMuted },

    // Step 4 — Summary
    summaryCard: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.borderLight },
    summaryTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: colors.textPrimary, marginBottom: spacing.lg },
    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, gap: spacing.md },
    summaryDotContainer: { width: 20, paddingTop: spacing.xs, alignItems: 'center' },
    summaryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    summaryContent: { flex: 1 },
    summaryLabel: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textMuted },
    summaryValue: { fontFamily: typography.fontFamily.medium, ...typography.size.base, color: colors.textPrimary, marginTop: spacing.xxs },
    summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
    summaryFeeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryFeeLabel: { fontFamily: typography.fontFamily.medium, ...typography.size.base, color: colors.textPrimary },
    summaryFeeValue: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: colors.primary },

    // Step 4 — Payment method
    paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
    paymentCard: {
        width: '48%' as unknown as number,
        backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.md, borderWidth: 1.5, borderColor: colors.borderLight,
        alignItems: 'center', gap: spacing.xs, position: 'relative',
    },
    paymentCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    paymentIcon: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    paymentIconActive: { backgroundColor: colors.primary },
    paymentLabel: { fontFamily: typography.fontFamily.semiBold, ...typography.size.sm, color: colors.textPrimary, textAlign: 'center' },
    paymentLabelActive: { color: colors.primaryDark },
    paymentDesc: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textMuted, textAlign: 'center' },
    paymentDescActive: { color: colors.textSecondary },
    paymentCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

    // Pay button
    payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: radii.md, marginBottom: spacing.md },
    payButtonText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },
    payNote: { fontFamily: typography.fontFamily.regular, ...typography.size.xs, color: colors.textMuted, textAlign: 'center' },

    // Success modal
    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
    successCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['3xl'], alignItems: 'center', width: '100%', ...shadows.elevated },
    successIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    successTitle: { fontFamily: typography.fontFamily.bold, ...typography.size.xl, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
    successBody: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing['2xl'], lineHeight: 22 },
    successButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing['2xl'], borderRadius: radii.md, width: '100%' },
    successButtonText: { fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF' },

    // Shared
    emptyText: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing['3xl'] },
});
