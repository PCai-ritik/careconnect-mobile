/**
 * CareConnect — Manage Availability Modal (Doctor)
 *
 * 90%-height Bottom Sheet for toggling daily schedule and time windows.
 * Uses doctorColors tokens + StyleSheet.create().
 */

import { useState } from 'react';
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

export default function AvailabilityModal({ visible, onClose }: AvailabilityModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const [schedule, setSchedule] = useState<DaySlot[]>(defaultSchedule);

    const toggleDay = (index: number) => {
        setSchedule((prev) =>
            prev.map((slot, i) =>
                i === index ? { ...slot, active: !slot.active } : slot,
            ),
        );
    };

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
                        onPress={onClose}
                        style={({ pressed }) => [
                            s.saveBtn,
                            pressed && { backgroundColor: doctorColors.primaryDark },
                        ]}
                    >
                        <Feather name="check" size={18} color="#fff" />
                        <Text style={s.saveBtnText}>Save Changes</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </Modal>
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
