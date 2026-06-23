import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Dimensions,
    ActivityIndicator,
    Modal,
    Platform,
    Alert,
} from 'react-native';
import { ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView, ThemedText } from '@/components/shared/Themed';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { typography, spacing, radii, shadows } from '@/constants/theme';
import { getDoctorsByHospital, searchDoctors, bookAppointment, updatePatient, getAvailableSlots } from '@/services/caregiver';
import type { DoctorProfile, PatientProfile } from '@/services/types';

// ─── Constants & Helpers ────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_HDR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];

const SPECIALTY_MAP: Record<string, { icon: FeatherIcon; color: string }> = {
    'General Practice': { icon: 'activity', color: '#3B82F6' },
    'Cardiology': { icon: 'heart', color: '#EF4444' },
    'Neurology': { icon: 'cpu', color: '#8B5CF6' },
    'Ophthalmology': { icon: 'eye', color: '#06B6D4' },
    'Orthopedics': { icon: 'shield', color: '#F97316' },
    'Pediatrics': { icon: 'smile', color: '#EC4899' },
    'Dermatology': { icon: 'sun', color: '#F59E0B' },
    'Internal Medicine': { icon: 'trending-up', color: '#22C55E' },
    'Psychiatry': { icon: 'message-circle', color: '#6366F1' },
    'ENT (Otolaryngology)': { icon: 'headphones', color: '#14B8A6' },
};

const DEFAULT_SPEC = { icon: 'plus-circle' as FeatherIcon, color: '#3B82F6' };
function getSpecMeta(spec: string) { return SPECIALTY_MAP[spec] ?? DEFAULT_SPEC; }

const PAYMENT_METHODS: { id: string; label: string; icon: FeatherIcon }[] = [
    { id: 'upi', label: 'UPI', icon: 'smartphone' },
    { id: 'card', label: 'Credit / Debit', icon: 'credit-card' },
    { id: 'netbanking', label: 'Net Banking', icon: 'globe' },
    { id: 'cash', label: 'Pay at Clinic', icon: 'dollar-sign' },
];

function isToday(d: Date): boolean {
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isPast(d: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const grid: (Date | null)[][] = [];
    let day = 1;
    for (let row = 0; row < 6; row++) {
        const week: (Date | null)[] = [];
        for (let col = 0; col < 7; col++) {
            if (row === 0 && col < startDow) week.push(null);
            else if (day > totalDays) week.push(null);
            else { week.push(new Date(year, month, day)); day++; }
        }
        grid.push(week);
        if (day > totalDays) break;
    }
    return grid;
}

function parseSlotTimeToDate(slotStr: string, baseDate: Date): Date {
    const [timePart, period] = slotStr.split(' ');
    const [hStr, mStr] = timePart.split(':');
    let hours = parseInt(hStr, 10);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const scheduled = new Date(baseDate);
    scheduled.setHours(hours, parseInt(mStr, 10), 0, 0);
    return scheduled;
}

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

const AVATAR_COLORS = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#E0E7FF'];
function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function currencySymbol(code: string): string {
    return ({ INR: '₹', USD: '$', EUR: '€', GBP: '£' } as Record<string, string>)[code] || code;
}

function isSameDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

// ─── Component ──────────────────────────────────────────────────────────────

interface BookingWizardProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    token: string;
    hospitalId: string;
    patients: PatientProfile[];
    onRequireAddPatient?: () => void;
}

export default function BookingWizard({ visible, onClose, onSuccess, token, hospitalId, patients, onRequireAddPatient }: BookingWizardProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const ms = useStyles(colors);

    // Flow Type
    const [flowType, setFlowType] = useState<'TYPE' | 'VIDEO' | 'IN_PERSON'>('TYPE');
    const [bookingStep, setBookingStep] = useState(1);

    // Data
    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Selections
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [conflictMessage, setConflictMessage] = useState('');
    const now = new Date();
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [calYear, setCalYear] = useState(now.getFullYear());
    
    // Performance: Defer heavy render on Android to avoid slide-up stutter
    const [isReady, setIsReady] = useState(Platform.OS === 'ios');

    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

    // Reset wizard when opened
    useEffect(() => {
        if (visible) {
            if (Platform.OS !== 'ios') {
                setTimeout(() => setIsReady(true), 150);
            }
            setFlowType('TYPE');
            setBookingStep(1);
            setSearchQuery('');
            setSelectedSpecialty(null);
            setSelectedDoctorId(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setIsTimeDropdownOpen(false);
            setSelectedPayment(null);
            setShowSuccessModal(false);
            setCalMonth(now.getMonth());
            setCalYear(now.getFullYear());
            // Pre-fetch hospital doctors for Video flow specialty list
            if (hospitalId) {
                getDoctorsByHospital(hospitalId).then(setDoctors).catch(console.error);
            }
        }
    }, [visible, hospitalId]);

    // Derived Data
    const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialization))], [doctors]);
    const filteredDoctors = useMemo(() => {
        if (flowType === 'VIDEO') {
            return doctors.filter((d) => d.specialization === selectedSpecialty);
        }
        return doctors; // For IN_PERSON, doctors array is populated via search API
    }, [flowType, selectedSpecialty, doctors]);

    const selectedDoctor = useMemo(() => doctors.find((d) => d.id === selectedDoctorId) ?? null, [selectedDoctorId, doctors]);

    const monthGrid = useMemo(() => buildMonthGrid(calYear, calMonth), [calYear, calMonth]);

    useEffect(() => {
        let isMounted = true;
        if (!selectedDoctor || !selectedDate) {
            setTimeSlots([]);
            return;
        }

        async function fetchSlots() {
            setIsLoadingSlots(true);
            try {
                // Format date as YYYY-MM-DD
                const d = selectedDate as Date;
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                
                const slotsResponse = await getAvailableSlots(token, selectedDoctor!.id, dateStr, flowType);
                
                if (isMounted) {
                    const now = new Date();
                    const tenHoursFromNow = new Date(now.getTime() + 10 * 60 * 60 * 1000);
                    
                    const filtered = slotsResponse
                        .map(slot => {
                            // Backend returns HH:MM in 24hr, format to HH:MM AM/PM
                            const [hStr, mStr] = slot.start_time.split(':');
                            const h = parseInt(hStr, 10);
                            const period = h >= 12 ? 'PM' : 'AM';
                            const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                            return `${displayH}:${mStr.padStart(2, '0')} ${period}`;
                        })
                        .filter(timeStr => {
                            const slotDate = parseSlotTimeToDate(timeStr, selectedDate as Date);
                            return slotDate > tenHoursFromNow;
                        });
                        
                    setTimeSlots(filtered);
                }
            } catch (error) {
                console.error("Failed to fetch slots:", error);
                if (isMounted) setTimeSlots([]);
            } finally {
                if (isMounted) setIsLoadingSlots(false);
            }
        }
        
        fetchSlots();
        return () => { isMounted = false; };
    }, [selectedDoctor, selectedDate, flowType, token]);

    const handleCalendarContinue = async () => {
        if (!selectedDoctor || !selectedDate || !selectedTime) return;
        setIsLoadingSlots(true);
        try {
            const d = selectedDate as Date;
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const slotsResponse = await getAvailableSlots(token, selectedDoctor.id, dateStr, flowType);
            
            const stillAvailable = slotsResponse.some(slot => {
                const [hStr, mStr] = slot.start_time.split(':');
                const h = parseInt(hStr, 10);
                const period = h >= 12 ? 'PM' : 'AM';
                const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                return `${displayH}:${mStr.padStart(2, '0')} ${period}` === selectedTime;
            });

            if (!stillAvailable) {
                setConflictMessage("This exact time slot was just booked by someone else! Please select another available time.");
                setShowConflictModal(true);
                setSelectedTime(null);
                
                // Re-populate the list with the fresh slots so the taken one disappears immediately
                const now = new Date();
                const tenHoursFromNow = new Date(now.getTime() + 10 * 60 * 60 * 1000);
                const filtered = slotsResponse
                    .map(slot => {
                        const [hStr, mStr] = slot.start_time.split(':');
                        const h = parseInt(hStr, 10);
                        const period = h >= 12 ? 'PM' : 'AM';
                        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                        return `${displayH}:${mStr.padStart(2, '0')} ${period}`;
                    })
                    .filter(timeStr => {
                        const slotDate = parseSlotTimeToDate(timeStr, selectedDate);
                        return slotDate > tenHoursFromNow;
                    });
                setTimeSlots(filtered);
                return;
            }
            
            setBookingStep(flowType === 'VIDEO' ? 4 : 3);
        } catch (error) {
            console.log("Failed to verify slot", error);
            // Proceed anyway and let the backend 409 check catch it at payment if it's truly taken
            setBookingStep(flowType === 'VIDEO' ? 4 : 3);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const doctorPaymentMethods = useMemo(() => {
        if (!selectedDoctor) return PAYMENT_METHODS;
        const accepted = selectedDoctor.accepted_payment_methods ?? [];
        if (accepted.length === 0) return PAYMENT_METHODS;
        return PAYMENT_METHODS.filter((pm) => accepted.includes(pm.id));
    }, [selectedDoctor]);

    // Actions
    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length < 2) {
            setDoctors([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchDoctors(text);
            setDoctors(results);
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setIsSearching(false);
        }
    };

    const selectFlow = (type: 'VIDEO' | 'IN_PERSON') => {
        setFlowType(type);
        setBookingStep(1);
        if (type === 'IN_PERSON') {
            setDoctors([]); // Clear doctors for search mode
        } else {
            // Restore hospital doctors for specialty list
            if (hospitalId) getDoctorsByHospital(hospitalId).then(setDoctors).catch(console.error);
        }
    };

    const goBackStep = () => {
        if (bookingStep === 1) {
            setFlowType('TYPE');
        } else if (bookingStep === 2) {
            if (flowType === 'VIDEO') setSelectedSpecialty(null);
            setSelectedDoctorId(null);
            setBookingStep(1);
        } else if (bookingStep === 3) {
            setSelectedDate(null);
            setSelectedTime(null);
            setBookingStep(2);
        } else if (bookingStep === 4) {
            setSelectedPayment(null);
            setBookingStep(3);
        }
    };

    const handleConfirmBooking = async () => {
        if (!token || !selectedDoctor || !selectedDate || !selectedTime || !patients[0]) return;
        setIsSubmitting(true);
        try {
            const [timePart, period] = selectedTime.split(' ');
            const [hStr, mStr] = timePart.split(':');
            let hours = parseInt(hStr, 10);
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            const scheduled = new Date(selectedDate);
            scheduled.setHours(hours, parseInt(mStr, 10), 0, 0);

            const payload = {
                doctor_id: selectedDoctor.id,
                patient_id: patients[0].id,
                hospital_id: hospitalId,
                scheduled_time: scheduled.toISOString(),
                duration_minutes: selectedDoctor.consultation_duration_minutes ?? 30,
                appointment_type: flowType,
                reason: '',
                location_address: flowType === 'IN_PERSON' ? selectedDoctor.clinic_address : undefined,
            };
            
            console.log("=== FRONTEND PAYLOAD ===", JSON.stringify(payload, null, 2));

            await bookAppointment(token, payload);

            await updatePatient(token, patients[0].id, {
                doctor_id: selectedDoctor.id,
            });

            setBookingStep(5); // Success step
            onSuccess?.();
            setShowSuccessModal(true);
        } catch (error: any) {
            console.log('Booking failed:', error);
            
            // If the backend threw a 409 Conflict, it means the slot was booked by someone else!
            if (error.status === 409) {
                setConflictMessage("This exact time slot was just booked by someone else! Please select another available time.");
                setShowConflictModal(true);
                // Reset step back to time selection
                setBookingStep(3);
                // The useEffect will naturally re-fetch available slots when we are on step 3 
                // because selectedDate and selectedDoctor are still set, but let's clear the selected time
                setSelectedTime(null);
            } else {
                setConflictMessage("We couldn't confirm your appointment right now. Please try again.");
                setShowConflictModal(true);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeAll = () => {
        setShowSuccessModal(false);
        onClose();
        if (showSuccessModal) onSuccess();
    };

    // Calendar Navigation
    const goNextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
        else setCalMonth((m) => m + 1);
    };
    const goPrevMonth = () => {
        const n = new Date();
        if (calYear === n.getFullYear() && calMonth === n.getMonth()) return;
        if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
        else setCalMonth((m) => m - 1);
    };
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

    // ─── Renderers ──────────────────────────────────────────────────────────

    const renderTypeSelection = () => {
        if (patients.length === 0) {
            return (
                <ThemedView style={[ms.stepBody, { alignItems: 'center', paddingTop: spacing['3xl'] }]}>
                    <ThemedView style={[ms.emptyIconCircle, { backgroundColor: colors.primaryLight, marginBottom: spacing.xl }]}>
                        <Feather name="users" size={32} color={colors.primary} />
                    </ThemedView>
                    <ThemedText weight="bold" size="xl" style={{ textAlign: 'center', marginBottom: spacing.sm, color: colors.textPrimary }}>
                        No Patients Under Care
                    </ThemedText>
                    <ThemedText style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: spacing['2xl'], paddingHorizontal: spacing.lg }}>
                        You have no patients under care right now. Please add a patient before booking a consultation.
                    </ThemedText>
                    <Pressable 
                        style={({ pressed }) => [ms.continueButton, pressed && { opacity: 0.85 }, { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }]} 
                        onPress={() => {
                            if (onRequireAddPatient) {
                                onClose();
                                onRequireAddPatient();
                            }
                        }}
                    >
                        <Feather name="plus" size={18} color="#FFFFFF" />
                        <ThemedText weight="semiBold" size="base" style={ms.continueText}>Add Patient</ThemedText>
                    </Pressable>
                </ThemedView>
            );
        }

        return (
            <ThemedView style={ms.stepBody}>
                <ThemedText style={ms.typeSub}>Choose how you want to consult with a doctor.</ThemedText>
                
                <Pressable style={({ pressed }) => [ms.typeCard, pressed && { opacity: 0.85 }]} onPress={() => selectFlow('VIDEO')}>
                    <ThemedView style={[ms.typeIconCircle, { backgroundColor: '#DBEAFE' }]}>
                        <Feather name="video" size={24} color="#3B82F6" />
                    </ThemedView>
                    <ThemedView style={ms.typeContent}>
                        <ThemedText weight="semiBold" size="lg">Video Consultation</ThemedText>
                        <ThemedText size="sm" color="muted">Consult a doctor online from your home.</ThemedText>
                    </ThemedView>
                    <Feather name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>

                <Pressable style={({ pressed }) => [ms.typeCard, pressed && { opacity: 0.85 }]} onPress={() => selectFlow('IN_PERSON')}>
                    <ThemedView style={[ms.typeIconCircle, { backgroundColor: '#D1FAE5' }]}>
                        <Feather name="map-pin" size={24} color="#10B981" />
                    </ThemedView>
                    <ThemedView style={ms.typeContent}>
                        <ThemedText weight="semiBold" size="lg">In-Person Visit</ThemedText>
                        <ThemedText size="sm" color="muted">Find doctors near you and book a clinic visit.</ThemedText>
                    </ThemedView>
                    <Feather name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>
            </ThemedView>
        );
    };

    const renderStep1 = () => {
        if (flowType === 'VIDEO') {
            return (
                <ThemedView style={ms.stepBody}>
                    <ThemedView style={ms.specGrid}>
                        {specialties.map((spec) => {
                            const meta = getSpecMeta(spec);
                            return (
                                <Pressable key={spec} style={({ pressed }) => [ms.specCard, pressed && { opacity: 0.8 }]} onPress={() => { setSelectedSpecialty(spec); setBookingStep(2); }}>
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
        } else {
            return (
                <ThemedView style={ms.stepBody}>
                    <ThemedView style={ms.searchBox}>
                        <Feather name="search" size={20} color={colors.textMuted} />
                        <TextInput
                            style={ms.searchInput}
                            placeholder="Search doctors, specialty, or location..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoFocus
                        />
                        {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                    </ThemedView>

                    {searchQuery.length < 2 ? (
                        <ThemedText style={ms.emptyText}>Type at least 2 characters to search.</ThemedText>
                    ) : filteredDoctors.length === 0 ? (
                        <ThemedText style={ms.emptyText}>No doctors found matching "{searchQuery}".</ThemedText>
                    ) : (
                        filteredDoctors.map((doc) => (
                            <Pressable key={doc.id} style={({ pressed }) => [ms.doctorCard, pressed && { opacity: 0.85 }]} onPress={() => { setSelectedDoctorId(doc.id); setBookingStep(2); }}>
                                <ThemedView style={[ms.doctorAvatar, { backgroundColor: getAvatarColor(doc.full_name) }]}>
                                    <Feather name="user" size={20} color="#374151" />
                                </ThemedView>
                                <ThemedView style={ms.doctorInfo}>
                                    <ThemedText weight="semiBold" size="base">{doc.full_name}</ThemedText>
                                    <ThemedText size="sm" color="muted">{doc.specialization}  •  {doc.years_of_experience ?? 'New'}</ThemedText>
                                    <ThemedText size="sm" color="muted" numberOfLines={1}>{doc.clinic_name ?? doc.hospital_affiliation ?? ''}</ThemedText>
                                    <ThemedText weight="medium" size="sm" color="primary" style={{ marginTop: 4 }}>
                                        {currencySymbol(doc.currency)}{doc.in_person_consultation_fee ?? 0} / {doc.consultation_duration_minutes ?? 30} min
                                    </ThemedText>
                                </ThemedView>
                                <Feather name="chevron-right" size={18} color={colors.textMuted} />
                            </Pressable>
                        ))
                    )}
                </ThemedView>
            );
        }
    };

    const renderStep2 = () => {
        if (flowType === 'VIDEO') {
            return (
                <ThemedView style={ms.stepBody}>
                    {filteredDoctors.length === 0 ? (
                        <ThemedText style={ms.emptyText}>No doctors available for this specialty.</ThemedText>
                    ) : (
                        filteredDoctors.map((doc) => (
                            <Pressable key={doc.id} style={({ pressed }) => [ms.doctorCard, pressed && { opacity: 0.85 }]} onPress={() => { setSelectedDoctorId(doc.id); setBookingStep(3); }}>
                                <ThemedView style={[ms.doctorAvatar, { backgroundColor: getAvatarColor(doc.full_name) }]}>
                                    <Feather name="user" size={20} color="#374151" />
                                </ThemedView>
                                <ThemedView style={ms.doctorInfo}>
                                    <ThemedText weight="semiBold" size="base">{doc.full_name}</ThemedText>
                                    <ThemedText size="sm" color="muted">{doc.specialization}  •  {doc.years_of_experience ?? 'New'}</ThemedText>
                                    <ThemedText weight="medium" size="sm" color="primary" style={{ marginTop: 4 }}>
                                        {currencySymbol(doc.currency)}{doc.video_consultation_fee ?? 0} / {doc.consultation_duration_minutes ?? 30} min
                                    </ThemedText>
                                </ThemedView>
                                <Feather name="chevron-right" size={18} color={colors.textMuted} />
                            </Pressable>
                        ))
                    )}
                </ThemedView>
            );
        } else {
            // For IN_PERSON, step 2 is Date Selection (skipping the specialty->doctor list step)
            return renderDateSelection();
        }
    };

    const renderDateSelection = () => (
        <ThemedView style={ms.stepBody}>
            <ThemedView style={ms.calHeader}>
                <Pressable onPress={goPrevMonth} disabled={!canGoPrev} style={({ pressed }) => [ms.calNav, !canGoPrev && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}>
                    <Feather name="chevron-left" size={20} color={colors.textPrimary} />
                </Pressable>
                <ThemedText weight="semiBold" size="lg" style={ms.calMonthTitle}>{MONTH_NAMES[calMonth]} {calYear}</ThemedText>
                <Pressable onPress={goNextMonth} disabled={!canGoNext} style={({ pressed }) => [ms.calNav, !canGoNext && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}>
                    <Feather name="chevron-right" size={20} color={colors.textPrimary} />
                </Pressable>
            </ThemedView>

            <ThemedView style={ms.calDowRow}>
                {DAY_HDR.map((d) => (
                    <ThemedText weight="medium" size="sm" color="muted" key={d} style={ms.calDowText}>{d}</ThemedText>
                ))}
            </ThemedView>

            {monthGrid.map((week, wi) => (
                <ThemedView key={wi} style={ms.calWeekRow}>
                    {week.map((cell, ci) => {
                        if (!cell) return <ThemedView key={ci} style={ms.calCell} />;
                        const past = isPast(cell);
                        const dayName = DAY_NAMES[cell.getDay()];
                        const dayEnabled = selectedDoctor?.availability_slots.some((s) => s.day_of_week.toUpperCase() === dayName.toUpperCase() && s.is_enabled && s.appointment_type === flowType) ?? false;
                        const disabled = past || !dayEnabled;
                        const today = isToday(cell);
                        const selected = isSameDay(cell, selectedDate);

                        return (
                            <Pressable key={ci} disabled={disabled} onPress={() => { setSelectedDate(new Date(cell)); setSelectedTime(null); }}
                                style={[ms.calCell, today && !selected && ms.calCellToday, selected && ms.calCellSelected, disabled && ms.calCellDisabled]}>
                                <ThemedText weight="regular" size="base" style={[ms.calCellText, today && !selected && ms.calCellTodayText, selected && ms.calCellSelectedText, disabled && ms.calCellDisabledText]}>
                                    {cell.getDate()}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </ThemedView>
            ))}

            {selectedDate && (
                <>
                    <ThemedText weight="semiBold" size="sm" color="secondary" style={[ms.subLabel, { marginTop: spacing.xl }]}>Select a Time</ThemedText>
                    {isLoadingSlots ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.md }} />
                    ) : timeSlots.length === 0 ? (
                        <ThemedText style={ms.emptyText}>Doctor is unavailable on this date.</ThemedText>
                    ) : (
                        <>
                            <Pressable 
                                style={[ms.dropdownTrigger, isTimeDropdownOpen && ms.dropdownTriggerActive]} 
                                onPress={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                            >
                                <ThemedText weight="medium" size="base" style={selectedTime ? ms.dropdownTextSelected : ms.dropdownTextPlaceholder}>
                                    {selectedTime || "Select a time..."}
                                </ThemedText>
                                <Feather name={isTimeDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                            </Pressable>

                            {isTimeDropdownOpen && (
                                <View style={ms.dropdownMenu}>
                                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                        {timeSlots.map((slot) => (
                                            <Pressable 
                                                key={slot} 
                                                style={[ms.dropdownOption, selectedTime === slot && ms.dropdownOptionSelected]}
                                                onPress={() => {
                                                    setSelectedTime(slot);
                                                    setIsTimeDropdownOpen(false);
                                                }}
                                            >
                                                <ThemedText weight="medium" size="base" style={[ms.dropdownOptionText, selectedTime === slot && ms.dropdownOptionTextSelected]}>
                                                    {slot}
                                                </ThemedText>
                                                {selectedTime === slot && <Feather name="check" size={16} color={colors.primary} />}
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </>
                    )}
                </>
            )}

            <Pressable style={[ms.continueButton, (!selectedTime || isLoadingSlots) && ms.continueButtonDisabled]} disabled={!selectedTime || isLoadingSlots} onPress={handleCalendarContinue}>
                {isLoadingSlots ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <ThemedText weight="semiBold" size="base" style={[ms.continueText, !selectedTime && ms.continueTextDisabled]}>Continue</ThemedText>
                )}
            </Pressable>
        </ThemedView>
    );

    const renderStep4 = () => {
        const doc = selectedDoctor;
        if (!doc || !selectedDate || !selectedTime) return null;
        const dateStr = `${DAY_HDR[selectedDate.getDay()]}, ${MONTH_ABBR[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
        const fee = flowType === 'VIDEO' ? doc.video_consultation_fee : doc.in_person_consultation_fee;

        return (
            <ThemedView style={ms.stepBody}>
                <ThemedView style={ms.summaryCard}>
                    <ThemedText weight="semiBold" size="lg" style={ms.summaryTitle}>Booking Summary</ThemedText>
                    <ThemedView style={ms.summaryRow}>
                        <ThemedText size="sm" color="secondary" style={{ width: 100 }}>Type</ThemedText>
                        <ThemedText weight="medium" size="base" style={{ flex: 1 }}>{flowType === 'VIDEO' ? 'Video Consultation' : 'In-Person Visit'}</ThemedText>
                    </ThemedView>
                    <ThemedView style={ms.summaryRow}>
                        <ThemedText size="sm" color="secondary" style={{ width: 100 }}>Doctor</ThemedText>
                        <ThemedText weight="medium" size="base" style={{ flex: 1 }}>{doc.full_name}</ThemedText>
                    </ThemedView>
                    <ThemedView style={ms.summaryRow}>
                        <ThemedText size="sm" color="secondary" style={{ width: 100 }}>Date & Time</ThemedText>
                        <ThemedText weight="medium" size="base" style={{ flex: 1 }}>{dateStr} at {selectedTime}</ThemedText>
                    </ThemedView>
                    {flowType === 'IN_PERSON' && (
                        <ThemedView style={ms.summaryRow}>
                            <ThemedText size="sm" color="secondary" style={{ width: 100 }}>Location</ThemedText>
                            <ThemedText weight="medium" size="base" style={{ flex: 1 }}>{doc.clinic_name}{'\n'}{doc.clinic_address}</ThemedText>
                        </ThemedView>
                    )}
                    <ThemedView style={ms.summaryDivider} />
                    <ThemedView style={ms.summaryFeeRow}>
                        <ThemedText weight="medium" size="base">Consultation Fee</ThemedText>
                        <ThemedText weight="semiBold" size="lg">{currencySymbol(doc.currency)}{fee ?? 0}</ThemedText>
                    </ThemedView>
                </ThemedView>

                <ThemedText weight="semiBold" size="sm" color="secondary" style={ms.subLabel}>Payment Method</ThemedText>
                <ThemedView style={ms.paymentGrid}>
                    {doctorPaymentMethods.map((pm) => {
                        if (flowType === 'VIDEO' && pm.id === 'cash') return null; // No cash for video
                        const isActive = selectedPayment === pm.id;
                        return (
                            <Pressable key={pm.id} onPress={() => setSelectedPayment(pm.id)} style={[ms.paymentCard, isActive && ms.paymentCardActive]}>
                                <ThemedView style={[ms.paymentIcon, isActive && ms.paymentIconActive]}>
                                    <Feather name={pm.icon} size={20} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                                </ThemedView>
                                <ThemedText weight="medium" size="base" style={[ms.paymentLabel, isActive && ms.paymentLabelActive]}>{pm.label}</ThemedText>
                                {isActive && <ThemedView style={ms.paymentCheck}><Feather name="check" size={14} color={colors.primary} /></ThemedView>}
                            </Pressable>
                        );
                    })}
                </ThemedView>

                <Pressable style={[ms.payButton, (!selectedPayment || isSubmitting) && { opacity: 0.5 }]} disabled={!selectedPayment || isSubmitting} onPress={handleConfirmBooking}>
                    {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                        <>
                            <Feather name="credit-card" size={18} color="#FFFFFF" />
                            <ThemedText weight="semiBold" size="base" style={ms.payButtonText}>Confirm & {selectedPayment === 'cash' ? 'Book' : 'Pay'}</ThemedText>
                        </>
                    )}
                </Pressable>
                <ThemedText style={ms.payNote}>
                    {flowType === 'VIDEO' ? "You'll receive a confirmation with the video call link." : "You'll receive a confirmation and directions to the clinic."}
                </ThemedText>
            </ThemedView>
        );
    };

    const STEP_TITLES = flowType === 'VIDEO' 
        ? ['Choose Specialty', 'Select Doctor', 'Select Date & Time', 'Confirm Booking']
        : ['Search Doctors', 'Select Date & Time', 'Confirm Booking'];

    const currentTitle = flowType === 'TYPE' ? 'Book Consultation' : STEP_TITLES[bookingStep - 1];

    return (
        <ThemedBottomSheet visible={visible} onClose={closeAll}>
            <ThemedView style={ms.sheetHeader}>
                {flowType !== 'TYPE' ? (
                    <Pressable onPress={goBackStep} style={ms.navCircle}>
                        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
                    </Pressable>
                ) : <ThemedView style={{ width: 36 }} />}
                <ThemedText weight="semiBold" size="lg" style={ms.sheetTitle}>{currentTitle}</ThemedText>
                <Pressable onPress={closeAll} style={ms.navCircle}>
                    <Feather name="x" size={20} color={colors.textMuted} />
                </Pressable>
            </ThemedView>

            {flowType !== 'TYPE' && (
                <ThemedView style={ms.progressRow}>
                    {STEP_TITLES.map((_, i) => (
                        <ThemedView key={i} style={[ms.progressDot, i < bookingStep && ms.progressDotActive]} />
                    ))}
                </ThemedView>
            )}

            <ScrollView contentContainerStyle={ms.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {!isReady ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <>
                        {flowType === 'TYPE' && renderTypeSelection()}
                        {flowType !== 'TYPE' && bookingStep === 1 && renderStep1()}
                        {flowType !== 'TYPE' && bookingStep === 2 && renderStep2()}
                        {flowType !== 'TYPE' && bookingStep === 3 && (flowType === 'VIDEO' ? renderDateSelection() : renderStep4())}
                        {flowType !== 'TYPE' && bookingStep === 4 && flowType === 'VIDEO' && renderStep4()}
                    </>
                )}
            </ScrollView>

            <Modal animationType="fade" transparent visible={showSuccessModal} onRequestClose={closeAll}>
                <ThemedView style={ms.successOverlay}>
                    <ThemedView style={ms.successCard}>
                        <ThemedView style={ms.successIconCircle}>
                            <Feather name="check" size={32} color="#FFFFFF" />
                        </ThemedView>
                        <ThemedText weight="bold" size="xl" style={ms.successTitle}>Booking Confirmed!</ThemedText>
                        <ThemedText size="sm" color="secondary" style={ms.successBody}>
                            Your {flowType === 'VIDEO' ? 'video' : 'in-person'} consultation with {selectedDoctor?.full_name} has been booked successfully.
                        </ThemedText>
                        <Pressable style={({ pressed }) => [ms.successButton, pressed && { opacity: 0.85 }]} onPress={closeAll}>
                            <ThemedText weight="semiBold" size="base" style={ms.successButtonText}>View Appointments</ThemedText>
                            <Feather name="arrow-right" size={18} color="#FFFFFF" />
                        </Pressable>
                    </ThemedView>
                </ThemedView>
            </Modal>

            {/* Conflict/Error Modal */}
            <Modal animationType="fade" transparent visible={showConflictModal} onRequestClose={() => setShowConflictModal(false)}>
                <ThemedView style={ms.successOverlay}>
                    <ThemedView style={ms.successCard}>
                        <ThemedView style={[ms.successIconCircle, { backgroundColor: '#EF4444' }]}>
                            <Feather name="alert-circle" size={32} color="#FFFFFF" />
                        </ThemedView>
                        <ThemedText weight="bold" size="xl" style={ms.successTitle}>Slot Unavailable</ThemedText>
                        <ThemedText size="sm" color="secondary" style={ms.successBody}>
                            {conflictMessage}
                        </ThemedText>
                        <Pressable style={({ pressed }) => [ms.conflictButton, pressed && { opacity: 0.85 }]} onPress={() => setShowConflictModal(false)}>
                            <ThemedText weight="semiBold" size="base" style={ms.successButtonText}>Okay</ThemedText>
                        </Pressable>
                    </ThemedView>
                </ThemedView>
            </Modal>
        </ThemedBottomSheet>
    );
}

const useStyles = (colors: any) => StyleSheet.create({
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    sheetTitle: { fontFamily: typography.fontFamily.semiBold, ...typography.size.lg, color: colors.textPrimary },
    navCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    progressRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.borderLight },
    progressDotActive: { backgroundColor: colors.primary },
    sheetScroll: { padding: spacing.xl, paddingBottom: spacing['3xl'] * 2 },
    stepBody: { flex: 1 },

    typeSub: { fontFamily: typography.fontFamily.regular, ...typography.size.base, color: colors.textSecondary, marginBottom: spacing.xl },
    typeCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md },
    typeIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    typeContent: { flex: 1 },

    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, paddingHorizontal: spacing.md, height: 48, marginBottom: spacing.lg },
    searchInput: { flex: 1, marginLeft: spacing.sm, fontFamily: typography.fontFamily.medium, ...typography.size.base, color: colors.textPrimary },

    specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    specCard: { width: '47%', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', ...shadows.card },
    specIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    specName: { textAlign: 'center', color: colors.textPrimary },
    
    emptyText: { fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing['2xl'] },
    
    doctorCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md, ...shadows.card },
    doctorAvatar: { width: 50, height: 50, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    doctorInfo: { flex: 1, justifyContent: 'center' },
    
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    calNav: { padding: spacing.sm },
    calMonthTitle: { color: colors.textPrimary },
    calDowRow: { flexDirection: 'row', marginBottom: spacing.sm },
    calDowText: { flex: 1, textAlign: 'center' },
    calWeekRow: { flexDirection: 'row', marginBottom: spacing.xs },
    calCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full },
    calCellToday: { backgroundColor: colors.primary + '18' },
    calCellSelected: { backgroundColor: colors.primary },
    calCellDisabled: { opacity: 0.3 },
    calCellText: { color: colors.textPrimary },
    calCellTodayText: { color: colors.primary, fontFamily: typography.fontFamily.semiBold },
    calCellSelectedText: { color: '#FFFFFF', fontFamily: typography.fontFamily.semiBold },
    calCellDisabledText: { color: colors.textMuted },

    subLabel: { marginBottom: spacing.md },
    
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.md, backgroundColor: colors.surface, marginBottom: spacing.xl },
    dropdownTriggerActive: { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
    dropdownTextPlaceholder: { color: colors.textMuted },
    dropdownTextSelected: { color: colors.textPrimary },
    dropdownMenu: { borderWidth: 1, borderTopWidth: 0, borderColor: colors.borderLight, borderBottomLeftRadius: radii.md, borderBottomRightRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden', marginBottom: spacing.xl },
    dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    dropdownOptionSelected: { backgroundColor: colors.primary + '10' },
    dropdownOptionText: { color: colors.textPrimary },
    dropdownOptionTextSelected: { color: colors.primary },

    continueButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radii.xl, alignItems: 'center', marginTop: spacing.xl },
    continueButtonDisabled: { backgroundColor: colors.surfaceMuted },
    continueText: { color: '#FFFFFF' },
    continueTextDisabled: { color: colors.textMuted },

    summaryCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.xl },
    summaryTitle: { color: colors.textPrimary, marginBottom: spacing.md },
    summaryRow: { flexDirection: 'row', marginBottom: spacing.sm },
    summaryDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },
    summaryFeeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing['2xl'] },
    paymentCard: { width: '48%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center' },
    paymentCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '0A' },
    paymentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    paymentIconActive: { backgroundColor: colors.primary },
    paymentLabel: { color: colors.textSecondary },
    paymentLabelActive: { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold },
    paymentCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm },

    payButton: { backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: radii.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    payButtonText: { color: '#FFFFFF' },
    payNote: { textAlign: 'center', fontFamily: typography.fontFamily.regular, ...typography.size.sm, color: colors.textMuted, marginTop: spacing.md },

    successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    successCard: { backgroundColor: colors.background, borderRadius: radii.xl, padding: spacing['2xl'], alignItems: 'center', width: '100%', ...shadows.elevated },
    successIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
    successTitle: { color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
    successBody: { textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22 },
    successButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radii.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    conflictButton: { backgroundColor: colors.textPrimary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radii.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
    successButtonText: { color: '#FFFFFF' },
});
