/**
 * CareConnect — Recent Activity Modal (Doctor)
 *
 * 90%-height Bottom Sheet showing a timeline of recent doctor actions
 * (prescriptions issued, consultations completed, patients added, etc.).
 * Uses doctorColors tokens + StyleSheet.create().
 */

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

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActivityItem {
    id: number;
    type: string;
    title: string;
    desc: string;
    time: string;
    icon: keyof typeof Feather.glyphMap;
}

interface ActivityHistoryModalProps {
    visible: boolean;
    onClose: () => void;
}

// ─── Mock Activity Data ─────────────────────────────────────────────────────

const recentActivity: ActivityItem[] = [
    {
        id: 1,
        type: 'prescription',
        title: 'Prescription Issued',
        desc: 'Ananya Gupta — Amoxicillin 500mg',
        time: '2 hours ago',
        icon: 'file-text',
    },
    {
        id: 2,
        type: 'appointment',
        title: 'Consultation Completed',
        desc: 'Ravi Shankar — Follow-up',
        time: '5 hours ago',
        icon: 'check-circle',
    },
    {
        id: 3,
        type: 'patient_added',
        title: 'New Patient Added',
        desc: 'Meera Iyer',
        time: 'Yesterday',
        icon: 'user-plus',
    },
    {
        id: 4,
        type: 'appointment',
        title: 'Video Consultation',
        desc: 'Ananya Gupta — Hypertension review',
        time: 'Yesterday',
        icon: 'video',
    },
    {
        id: 5,
        type: 'prescription',
        title: 'Prescription Updated',
        desc: 'Ravi Shankar — Metformin dosage change',
        time: '2 days ago',
        icon: 'edit',
    },
    {
        id: 6,
        type: 'report',
        title: 'Lab Report Reviewed',
        desc: 'Meera Iyer — CBC & Lipid Panel',
        time: '3 days ago',
        icon: 'clipboard',
    },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ActivityHistoryModal({ visible, onClose }: ActivityHistoryModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);

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
                        <Text style={s.headerTitle}>Recent Activity</Text>
                        <Text style={s.headerSubtitle}>
                            Your actions and events from the past week
                        </Text>
                    </View>
                </View>

                {/* Activity List */}
                <ScrollView
                    style={s.scrollArea}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollInner}
                >
                    {recentActivity.map((item, index) => (
                        <View
                            key={item.id}
                            style={[
                                s.activityRow,
                                index < recentActivity.length - 1 && s.activityRowBorder,
                            ]}
                        >
                            {/* Icon circle */}
                            <View style={s.iconCircle}>
                                <Feather
                                    name={item.icon}
                                    size={18}
                                    color={doctorColors.primary}
                                />
                            </View>

                            {/* Text block */}
                            <View style={s.textBlock}>
                                <Text style={s.activityTitle}>{item.title}</Text>
                                <Text style={s.activityDesc}>{item.desc}</Text>
                            </View>

                            {/* Time */}
                            <Text style={s.activityTime}>{item.time}</Text>
                        </View>
                    ))}
                </ScrollView>
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

    // Activity row
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
    },
    activityRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: doctorColors.borderLight,
    },

    // Icon
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: doctorColors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Text
    textBlock: {
        flex: 1,
        gap: spacing.xxs,
    },
    activityTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
    },
    activityDesc: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },

    // Time
    activityTime: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
});
