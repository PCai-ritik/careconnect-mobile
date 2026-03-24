/**
 * CareConnect — Reschedule Modal (Doctor)
 *
 * 85%-height Bottom Sheet with a month calendar grid and time slot
 * selector for rescheduling pending appointments.
 * Calendar pattern adapted from the patient dashboard booking flow.
 * Uses doctorColors + StyleSheet.create().
 */

import { useState, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Dimensions,
    Animated,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RescheduleModalProps {
    visible: boolean;
    patientName: string;
    onClose: () => void;
    onConfirm: (date: string, time: string) => void;
}

// ─── Calendar Helpers ───────────────────────────────────────────────────────

const DAY_HDR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBR = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const TIME_SLOTS = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
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

function isSameDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
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

// ─── Component ──────────────────────────────────────────────────────────────

export default function RescheduleModal({
    visible,
    patientName,
    onClose,
    onConfirm,
}: RescheduleModalProps) {
    const insets = useSafeAreaInsets();
    const now = new Date();
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const monthGrid = useMemo(() => buildMonthGrid(calYear, calMonth), [calYear, calMonth]);

    const canGoNext = (() => {
        const maxMonth = now.getMonth() + 1;
        const maxYear = now.getFullYear() + (maxMonth > 11 ? 1 : 0);
        const capped = maxMonth % 12;
        return calYear < maxYear || (calYear === maxYear && calMonth < capped);
    })();

    const canGoPrev = calYear > now.getFullYear() || calMonth > now.getMonth();

    const goNextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
        else setCalMonth((m) => m + 1);
    };

    const goPrevMonth = () => {
        if (!canGoPrev) return;
        if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
        else setCalMonth((m) => m - 1);
    };

    const handleConfirm = () => {
        if (!selectedDate || !selectedTime) return;
        const dateStr = `${MONTH_ABBR[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
        onConfirm(dateStr, selectedTime);
    };

    const handleClose = () => {
        setSelectedDate(null);
        setSelectedTime(null);
        const n = new Date();
        setCalMonth(n.getMonth());
        setCalYear(n.getFullYear());
        onClose();
    };

    const { panHandlers, animatedStyle } = useSwipeDown(handleClose);

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={handleClose}
        >
            <Pressable style={s.backdrop} onPress={handleClose} />

            <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom }]}>
                <View style={s.handleRow} {...panHandlers}>
                    <View style={s.handle} />
                </View>

                {/* Header */}
                <View style={s.header}>
                    <View>
                        <Text style={s.headerTitle}>Reschedule Appointment</Text>
                        <Text style={s.headerSub}>
                            Pick a new date and time for {patientName}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    style={s.scrollArea}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollInner}
                >
                    {/* Month navigation */}
                    <View style={s.calHeader}>
                        <Pressable
                            onPress={goPrevMonth}
                            disabled={!canGoPrev}
                            style={({ pressed }) => [
                                s.calNav,
                                !canGoPrev && { opacity: 0.3 },
                                pressed && { opacity: 0.6 },
                            ]}
                        >
                            <Feather name="chevron-left" size={20} color={doctorColors.textPrimary} />
                        </Pressable>
                        <Text style={s.calMonthTitle}>{MONTH_NAMES[calMonth]} {calYear}</Text>
                        <Pressable
                            onPress={goNextMonth}
                            disabled={!canGoNext}
                            style={({ pressed }) => [
                                s.calNav,
                                !canGoNext && { opacity: 0.3 },
                                pressed && { opacity: 0.6 },
                            ]}
                        >
                            <Feather name="chevron-right" size={20} color={doctorColors.textPrimary} />
                        </Pressable>
                    </View>

                    {/* Day-of-week header */}
                    <View style={s.calDowRow}>
                        {DAY_HDR.map((d) => (
                            <Text key={d} style={s.calDowText}>{d}</Text>
                        ))}
                    </View>

                    {/* Calendar grid */}
                    {monthGrid.map((week, wi) => (
                        <View key={wi} style={s.calWeekRow}>
                            {week.map((cell, ci) => {
                                if (!cell) return <View key={ci} style={s.calCell} />;

                                const past = isPast(cell);
                                const sunday = cell.getDay() === 0;
                                const disabled = past || sunday;
                                const today = isToday(cell);
                                const selected = isSameDay(cell, selectedDate);

                                return (
                                    <Pressable
                                        key={ci}
                                        disabled={disabled}
                                        onPress={() => {
                                            setSelectedDate(new Date(cell));
                                            setSelectedTime(null);
                                        }}
                                        style={[
                                            s.calCell,
                                            today && !selected && s.calCellToday,
                                            selected && s.calCellSelected,
                                            disabled && s.calCellDisabled,
                                        ]}
                                    >
                                        <Text style={[
                                            s.calCellText,
                                            today && !selected && s.calCellTodayText,
                                            selected && s.calCellSelectedText,
                                            disabled && s.calCellDisabledText,
                                        ]}>
                                            {cell.getDate()}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}

                    {/* Time slots */}
                    {selectedDate && (
                        <>
                            <Text style={s.timeLabel}>Select a Time</Text>
                            <View style={s.timeGrid}>
                                {TIME_SLOTS.map((slot) => (
                                    <Pressable
                                        key={slot}
                                        onPress={() => setSelectedTime(slot)}
                                        style={[
                                            s.timePill,
                                            selectedTime === slot && s.timePillSelected,
                                        ]}
                                    >
                                        <Text style={[
                                            s.timePillText,
                                            selectedTime === slot && s.timePillTextSelected,
                                        ]}>
                                            {slot}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}
                </ScrollView>

                {/* Footer */}
                <View style={s.footer}>
                    <Pressable
                        style={({ pressed }) => [
                            s.confirmBtn,
                            (!selectedDate || !selectedTime) && { opacity: 0.5 },
                            pressed && { opacity: 0.85 },
                        ]}
                        onPress={handleConfirm}
                        disabled={!selectedDate || !selectedTime}
                    >
                        <Feather name="calendar" size={16} color="#fff" />
                        <Text style={s.confirmBtnText}>Confirm Reschedule</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </Modal>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.85,
        backgroundColor: doctorColors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        ...shadows.elevated,
    },
    handleRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: doctorColors.border },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        gap: spacing.md,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
    },
    headerSub: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginTop: spacing.xxs,
    },

    scrollArea: { flex: 1 },
    scrollInner: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

    // Calendar
    calHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    calNav: {
        width: 36,
        height: 36,
        borderRadius: radii.full,
        backgroundColor: doctorColors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calMonthTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    calDowRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    calDowText: {
        flex: 1,
        textAlign: 'center',
        fontFamily: typography.fontFamily.medium,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    calWeekRow: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    calCell: {
        flex: 1,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.md,
    },
    calCellText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    calCellToday: {
        borderWidth: 1.5,
        borderColor: doctorColors.primary,
    },
    calCellTodayText: {
        color: doctorColors.primary,
        fontFamily: typography.fontFamily.bold,
    },
    calCellSelected: {
        backgroundColor: doctorColors.primary,
    },
    calCellSelectedText: {
        color: '#FFFFFF',
        fontFamily: typography.fontFamily.bold,
    },
    calCellDisabled: {
        opacity: 0.3,
    },
    calCellDisabledText: {
        color: doctorColors.textMuted,
    },

    // Time slots
    timeLabel: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    timePill: {
        width: '31%' as unknown as number,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1.5,
        borderColor: doctorColors.border,
        backgroundColor: doctorColors.surface,
        alignItems: 'center',
    },
    timePillSelected: {
        backgroundColor: doctorColors.primary,
        borderColor: doctorColors.primary,
    },
    timePillText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
    },
    timePillTextSelected: {
        color: '#FFFFFF',
        fontFamily: typography.fontFamily.semiBold,
    },

    // Footer
    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
    },
    confirmBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
});
