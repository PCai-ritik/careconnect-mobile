/**
 * CareConnect — Manage Availability Modal (Doctor)
 *
 * 90%-height Bottom Sheet for toggling daily schedule and time windows.
 * Loads existing slots from DoctorProfile, saves via PUT /doctors/availability.
 * Uses doctorColors tokens + StyleSheet.create().
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    Switch,
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
import { useAuth } from '@/hooks/useAuth';
import { submitDoctorAvailability } from '@/services/doctor';
import type { DoctorProfile, DoctorAvailabilitySlot } from '@/services/types';
import ThemedAlert from '@/components/doctor/ThemedAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

interface DaySlot {
    day: string;
    active: boolean;
    start: string;
    end: string;
}

interface AvailabilityModalProps {
    visible: boolean;
    onClose: () => void;
    profile?: DoctorProfile | null;
    onSaved?: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Convert backend HH:MM:SS → display "HH:MM AM/PM" */
function toDisplay(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Convert display "HH:MM AM/PM" → backend HH:MM:SS */
function toBackend(time: string): string {
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return '09:00:00';
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function buildScheduleFromSlots(slots: DoctorAvailabilitySlot[]): DaySlot[] {
    const map = new Map(slots.map(s => [s.day_of_week, s]));
    return DAYS.map(day => {
        const slot = map.get(day);
        return {
            day,
            active: slot?.is_enabled ?? false,
            start: slot ? toDisplay(slot.start_time) : '09:00 AM',
            end: slot ? toDisplay(slot.end_time) : '05:00 PM',
        };
    });
}

// ─── Default Schedule ───────────────────────────────────────────────────────

const defaultSchedule: DaySlot[] = [
    { day: 'Monday', active: true, start: '09:00 AM', end: '05:00 PM' },
    { day: 'Tuesday', active: true, start: '09:00 AM', end: '05:00 PM' },
    { day: 'Wednesday', active: true, start: '09:00 AM', end: '01:00 PM' },
    { day: 'Thursday', active: true, start: '09:00 AM', end: '05:00 PM' },
    { day: 'Friday', active: true, start: '09:00 AM', end: '05:00 PM' },
    { day: 'Saturday', active: true, start: '10:00 AM', end: '02:00 PM' },
    { day: 'Sunday', active: false, start: '—', end: '—' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AvailabilityModal({ visible, onClose, profile, onSaved }: AvailabilityModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const { token } = useAuth();
    const [schedule, setSchedule] = useState<DaySlot[]>(defaultSchedule);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Load slots from profile when modal opens
    useEffect(() => {
        if (visible && profile?.availability_slots?.length) {
            setSchedule(buildScheduleFromSlots(profile.availability_slots));
        }
    }, [visible, profile]);

    const toggleDay = (index: number) => {
        setSchedule((prev) =>
            prev.map((slot, i) =>
                i === index ? { ...slot, active: !slot.active } : slot,
            ),
        );
    };

    const handleSave = async () => {
        if (!token) return;
        setIsSaving(true);
        try {
            const slots: DoctorAvailabilitySlot[] = schedule.map(s => ({
                day_of_week: s.day,
                start_time: toBackend(s.start),
                end_time: toBackend(s.end),
                is_enabled: s.active,
            }));
            await submitDoctorAvailability(token, slots);
            setShowSuccess(true);
            onSaved?.();
        } catch (err) {
            console.error('Failed to save availability:', err);
        } finally {
            setIsSaving(false);
        }
    };

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
                <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom }]}>
                    {/* Handle */}
                    <View style={s.handleRow} {...panHandlers}>
                        <View style={s.handle} />
                    </View>

                    {/* Header */}
                    <View style={s.header}>
                        <View>
                            <Text style={s.headerTitle}>Manage Availability</Text>
                            <Text style={s.headerSubtitle}>
                                Set your weekly consultation hours
                            </Text>
                        </View>
                    </View>

                    {/* Day List */}
                    <ScrollView
                        style={s.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scrollInner}
                    >
                        {schedule.map((slot, index) => (
                            <View key={slot.day} style={s.dayCard}>
                                {/* Top row: day name + switch */}
                                <View style={s.dayTopRow}>
                                    <Text
                                        style={[
                                            s.dayName,
                                            !slot.active && s.dayNameInactive,
                                        ]}
                                    >
                                        {slot.day}
                                    </Text>
                                    <Switch
                                        value={slot.active}
                                        onValueChange={() => toggleDay(index)}
                                        trackColor={{
                                            false: doctorColors.border,
                                            true: doctorColors.primary,
                                        }}
                                        thumbColor="#FFFFFF"
                                    />
                                </View>

                                {/* Time pills (only when active) */}
                                {slot.active && (
                                    <View style={s.timeRow}>
                                        <View style={s.timePill}>
                                            <Feather
                                                name="clock"
                                                size={12}
                                                color={doctorColors.primary}
                                            />
                                            <Text style={s.timeText}>{slot.start}</Text>
                                        </View>
                                        <Text style={s.arrow}>→</Text>
                                        <View style={s.timePill}>
                                            <Feather
                                                name="clock"
                                                size={12}
                                                color={doctorColors.primary}
                                            />
                                            <Text style={s.timeText}>{slot.end}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        <Pressable
                            onPress={handleSave}
                            disabled={isSaving}
                            style={({ pressed }) => [
                                s.saveBtn,
                                isSaving && { opacity: 0.6 },
                                pressed && { backgroundColor: doctorColors.primaryDark },
                            ]}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Feather name="check" size={18} color="#fff" />
                                    <Text style={s.saveBtnText}>Save Changes</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </Animated.View>
            </Modal>

            <ThemedAlert
                visible={showSuccess}
                variant="success"
                icon="check-circle"
                title="Availability Updated"
                message="Your weekly schedule has been saved successfully."
                confirmLabel="Done"
                onConfirm={() => {
                    setShowSuccess(false);
                    onClose();
                }}
            />
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
        height: SCREEN_HEIGHT * 0.90,
        backgroundColor: doctorColors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },
    handleRow: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.xs,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: doctorColors.border,
    },

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


    // Scroll
    scrollArea: { flex: 1 },
    scrollInner: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['6xl'],
    },

    // Day card
    dayCard: {
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
        borderRadius: radii.md,
        backgroundColor: doctorColors.surface,
        marginBottom: spacing.md,
    },
    dayTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dayName: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    dayNameInactive: {
        color: doctorColors.textMuted,
    },

    // Time pills
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: doctorColors.surfaceMuted,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.full,
    },
    timeText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
    },
    arrow: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
    },

    // Footer
    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    saveBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});
