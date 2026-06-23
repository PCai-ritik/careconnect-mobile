/**
 * CareConnect — Manage Availability Modal (Doctor)
 *
 * Two-tab bottom sheet: "Video" and "In-Person" availability.
 * Each tab shows 7 day cards with an enable switch, time dials, and
 * add/remove interval controls — mirroring the web ScheduleEditorSheet.
 * Fully multi-tenant via useTheme().
 */

import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Switch,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { Feather } from '@expo/vector-icons';
import { spacing, radii, typography } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { submitDoctorAvailability } from '@/services/doctor';
import type { DoctorProfile, DoctorAvailabilitySlot } from '@/services/types';
import ThemedAlert from '@/components/doctor/ThemedAlert';
import { ThemedText } from '@/components/shared/Themed';

// ─── Types ───────────────────────────────────────────────────────────────────

type AppType = 'VIDEO' | 'IN_PERSON';
type TabId = 'video' | 'in_person';

interface TimeInterval {
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
}

interface DaySchedule {
    enabled: boolean;
    intervals: TimeInterval[];
}

type TypeSchedule = Record<string, DaySchedule>;

interface AvailabilityModalProps {
    visible: boolean;
    onClose: () => void;
    profile?: DoctorProfile | null;
    onSaved?: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TAB_CONFIG: { id: TabId; label: string; icon: keyof typeof Feather.glyphMap; type: AppType }[] = [
    { id: 'video',      label: 'Video',     icon: 'video',    type: 'VIDEO' },
    { id: 'in_person',  label: 'In-Person', icon: 'map-pin',  type: 'IN_PERSON' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEmptySchedule(): TypeSchedule {
    const s: TypeSchedule = {};
    DAYS.forEach(day => {
        s[day] = { enabled: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] };
    });
    return s;
}

function buildScheduleFromSlots(slots: DoctorAvailabilitySlot[], type: AppType): TypeSchedule {
    const filtered = slots.filter(s => s.appointment_type === type);
    const empty = makeEmptySchedule();
    const grouped: Record<string, TimeInterval[]> = {};

    filtered.forEach(s => {
        const day = s.day_of_week.charAt(0).toUpperCase() + s.day_of_week.slice(1).toLowerCase();
        if (!grouped[day]) grouped[day] = [];
        if (s.is_enabled) {
            grouped[day].push({
                startTime: s.start_time.substring(0, 5),
                endTime: s.end_time.substring(0, 5),
            });
        }
    });

    Object.keys(grouped).forEach(day => {
        if (grouped[day].length > 0) {
            empty[day] = { enabled: true, intervals: grouped[day] };
        }
    });

    // If no slots at all for this type, set sensible defaults
    if (filtered.length === 0) {
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
            empty[day] = { enabled: true, intervals: [{ startTime: '09:00', endTime: '17:00' }] };
        });
    }

    return empty;
}

function pad(n: number) {
    return String(n).padStart(2, '0');
}

// ─── Time Dial ───────────────────────────────────────────────────────────────

function TimeDial({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    const { colors } = useTheme();
    const [h, m] = value.split(':').map(Number);

    const setH = (next: number) => {
        const c = ((next % 24) + 24) % 24;
        onChange(`${pad(c)}:${pad(m)}`);
    };
    const setM = (next: number) => {
        const c = ((next % 60) + 60) % 60;
        onChange(`${pad(h)}:${pad(c)}`);
    };

    const arrowColor = disabled ? colors.borderLight : colors.primary;

    return (
        <View style={dialS.row}>
            {/* Hours */}
            <View style={dialS.col}>
                <Pressable
                    onPress={() => !disabled && setH(h + 1)}
                    hitSlop={8}
                    style={dialS.arrow}
                >
                    <Feather name="chevron-up" size={14} color={arrowColor} />
                </Pressable>
                <View style={[dialS.digitBox, { borderColor: colors.borderLight, backgroundColor: disabled ? colors.surfaceMuted : colors.surface }]}>
                    <Text style={[dialS.digit, { color: disabled ? colors.textMuted : colors.textPrimary }]}>{pad(h)}</Text>
                </View>
                <Pressable
                    onPress={() => !disabled && setH(h - 1)}
                    hitSlop={8}
                    style={dialS.arrow}
                >
                    <Feather name="chevron-down" size={14} color={arrowColor} />
                </Pressable>
            </View>

            <Text style={[dialS.colon, { color: colors.textMuted }]}>:</Text>

            {/* Minutes */}
            <View style={dialS.col}>
                <Pressable
                    onPress={() => !disabled && setM(m + 15)}
                    hitSlop={8}
                    style={dialS.arrow}
                >
                    <Feather name="chevron-up" size={14} color={arrowColor} />
                </Pressable>
                <View style={[dialS.digitBox, { borderColor: colors.borderLight, backgroundColor: disabled ? colors.surfaceMuted : colors.surface }]}>
                    <Text style={[dialS.digit, { color: disabled ? colors.textMuted : colors.textPrimary }]}>{pad(m)}</Text>
                </View>
                <Pressable
                    onPress={() => !disabled && setM(m - 15)}
                    hitSlop={8}
                    style={dialS.arrow}
                >
                    <Feather name="chevron-down" size={14} color={arrowColor} />
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
        alignItems: 'center',
    },
    digit: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 13,
    },
    colon: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 16,
        marginBottom: 2,
        marginHorizontal: 1,
    },
});

// ─── Day Card ─────────────────────────────────────────────────────────────────

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
    onUpdateInterval: (idx: number, field: keyof TimeInterval, value: string) => void;
    onAddInterval: () => void;
    onRemoveInterval: (idx: number) => void;
}) {
    const { colors } = useTheme();

    return (
        <View style={[
            cardS.card,
            {
                borderColor: sched.enabled ? colors.primary + '33' : colors.borderLight,
                backgroundColor: sched.enabled ? colors.primaryLight + '18' : colors.surfaceMuted + '40',
            },
        ]}>
            {/* Day name + switch */}
            <View style={cardS.topRow}>
                <Text style={[
                    cardS.dayName,
                    { color: sched.enabled ? colors.textPrimary : colors.textMuted },
                ]}>
                    {day}
                </Text>
                <Switch
                    value={sched.enabled}
                    onValueChange={onToggle}
                    trackColor={{ false: colors.borderLight, true: colors.primary }}
                    thumbColor="#FFFFFF"
                />
            </View>

            {/* Intervals */}
            {sched.enabled && (
                <View style={cardS.intervals}>
                    {sched.intervals.map((interval, idx) => (
                        <View key={idx} style={cardS.intervalRow}>
                            <TimeDial
                                value={interval.startTime}
                                onChange={(v) => onUpdateInterval(idx, 'startTime', v)}
                            />
                            <Text style={[cardS.toText, { color: colors.textMuted }]}>to</Text>
                            <TimeDial
                                value={interval.endTime}
                                onChange={(v) => onUpdateInterval(idx, 'endTime', v)}
                            />
                            {/* Remove/Add controls */}
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
                                        <Feather name="plus" size={14} color={colors.primary} />
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AvailabilityModal({ visible, onClose, profile, onSaved }: AvailabilityModalProps) {
    const { colors } = useTheme();
    const { token } = useAuth();

    const [activeTab, setActiveTab] = useState<TabId>('video');
    const [videoSchedule, setVideoSchedule] = useState<TypeSchedule>(makeEmptySchedule);
    const [inPersonSchedule, setInPersonSchedule] = useState<TypeSchedule>(makeEmptySchedule);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    // Load from profile when modal opens
    useEffect(() => {
        if (visible) {
            const slots = profile?.availability_slots ?? [];
            setVideoSchedule(buildScheduleFromSlots(slots, 'VIDEO'));
            setInPersonSchedule(buildScheduleFromSlots(slots, 'IN_PERSON'));
            setActiveTab('video');
        }
    }, [visible, profile]);

    // Scroll to top on tab switch
    useEffect(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [activeTab]);

    const getSchedule = (tab: TabId) => tab === 'video' ? videoSchedule : inPersonSchedule;
    const setSchedule = (tab: TabId, updater: (prev: TypeSchedule) => TypeSchedule) => {
        if (tab === 'video') setVideoSchedule(updater);
        else setInPersonSchedule(updater);
    };

    const toggleDay = (tab: TabId, day: string) => {
        setSchedule(tab, prev => ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled },
        }));
    };

    const updateInterval = (tab: TabId, day: string, idx: number, field: keyof TimeInterval, value: string) => {
        setSchedule(tab, prev => {
            const intervals = [...prev[day].intervals];
            intervals[idx] = { ...intervals[idx], [field]: value };
            return { ...prev, [day]: { ...prev[day], intervals } };
        });
    };

    const addInterval = (tab: TabId, day: string) => {
        setSchedule(tab, prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                intervals: [...prev[day].intervals, { startTime: '09:00', endTime: '17:00' }],
            },
        }));
    };

    const removeInterval = (tab: TabId, day: string, idx: number) => {
        setSchedule(tab, prev => {
            const intervals = [...prev[day].intervals];
            intervals.splice(idx, 1);
            return { ...prev, [day]: { ...prev[day], intervals } };
        });
    };

    const handleSave = async () => {
        if (!token) return;
        setIsSaving(true);
        try {
            const slots: DoctorAvailabilitySlot[] = [];

            const pushSlots = (schedule: TypeSchedule, type: AppType) => {
                Object.entries(schedule).forEach(([day, v]) => {
                    if (v.enabled) {
                        v.intervals.forEach(interval => {
                            slots.push({
                                day_of_week: day.toUpperCase(),
                                start_time: interval.startTime + ':00',
                                end_time: interval.endTime + ':00',
                                is_enabled: true,
                                appointment_type: type,
                            });
                        });
                    }
                });
            };

            pushSlots(videoSchedule, 'VIDEO');
            pushSlots(inPersonSchedule, 'IN_PERSON');

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
            <ThemedBottomSheet visible={visible} onClose={onClose}>
                {/* Header */}
                <View style={[s.header, { borderBottomColor: colors.borderLight }]}>
                    <View style={[s.headerIcon, { backgroundColor: colors.primaryLight }]}>
                        <Feather name="clock" size={20} color={colors.primary} />
                    </View>
                    <View style={s.headerText}>
                        <ThemedText color="primary" weight="bold" size="xl">
                            Manage Availability
                        </ThemedText>
                        <ThemedText color="muted" size="xs" style={{ marginTop: spacing.xxs }}>
                            Set your weekly consultation hours
                        </ThemedText>
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
                                style={[
                                    s.tab,
                                    active && [s.tabActive, { borderBottomColor: colors.primary }],
                                ]}
                            >
                                <Feather
                                    name={tab.icon}
                                    size={14}
                                    color={active ? colors.primary : colors.textMuted}
                                />
                                <ThemedText
                                    weight={active ? 'semiBold' : 'medium'}
                                    size="sm"
                                    style={[s.tabText, { color: active ? colors.primary : colors.textMuted }]}
                                >
                                    {tab.label}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Day List */}
                <ScrollView
                    ref={scrollRef}
                    style={s.scrollArea}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollInner}
                    nestedScrollEnabled
                >
                    {DAYS.map((day) => {
                        const sched = getSchedule(activeTab)[day];
                        if (!sched) return null;
                        return (
                            <DayCard
                                key={day}
                                day={day}
                                sched={sched}
                                onToggle={() => toggleDay(activeTab, day)}
                                onUpdateInterval={(idx, field, value) =>
                                    updateInterval(activeTab, day, idx, field, value)
                                }
                                onAddInterval={() => addInterval(activeTab, day)}
                                onRemoveInterval={(idx) => removeInterval(activeTab, day, idx)}
                            />
                        );
                    })}
                </ScrollView>

                {/* Footer */}
                <View style={[s.footer, { borderTopColor: colors.borderLight }]}>
                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving}
                        style={({ pressed }) => [
                            s.saveBtn,
                            { backgroundColor: colors.primary },
                            isSaving && { opacity: 0.6 },
                            pressed && { opacity: 0.85 },
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
            </ThemedBottomSheet>

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

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: { flex: 1 },

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
    tabActive: {},
    tabText: {
        fontFamily: typography.fontFamily.medium,
        fontSize: 13,
    },

    // Scroll
    scrollArea: { flex: 1 },
    scrollInner: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing['6xl'],
    },

    // Footer
    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
    },
    saveBtnText: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: 15,
        color: '#FFFFFF',
    },
});
