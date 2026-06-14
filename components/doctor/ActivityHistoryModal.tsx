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
    shadows,
    radii,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedText, ThemedView } from '@/components/shared/Themed';

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
    const { colors } = useTheme();
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
            <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom, backgroundColor: colors.surface }]}>
                {/* Handle */}
                <View style={s.handleRow} {...panHandlers}>
                    <View style={[s.handle, { backgroundColor: colors.border }]} />
                </View>

                {/* Header */}
                <View style={s.header}>
                    <View>
                        <ThemedText color="primary" weight="bold" size="xl" style={s.headerTitle}>Recent Activity</ThemedText>
                        <ThemedText color="muted" size="xs" style={s.headerSubtitle}>
                            Your actions and events from the past week
                        </ThemedText>
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
                                index < recentActivity.length - 1 && [s.activityRowBorder, { borderBottomColor: colors.borderLight }],
                            ]}
                        >
                            {/* Icon circle */}
                            <View style={[s.iconCircle, { backgroundColor: colors.surfaceMuted }]}>
                                <Feather
                                    name={item.icon}
                                    size={18}
                                    color={colors.primary}
                                />
                            </View>

                            {/* Text block */}
                            <View style={s.textBlock}>
                                <ThemedText weight="semiBold" size="sm" style={s.activityTitle}>{item.title}</ThemedText>
                                <ThemedText color="muted" size="xs" style={s.activityDesc}>{item.desc}</ThemedText>
                            </View>

                            {/* Time */}
                            <ThemedText color="muted" size="xs" style={s.activityTime}>{item.time}</ThemedText>
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
    },
    headerSubtitle: {
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
    },

    // Icon
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Text
    textBlock: {
        flex: 1,
        gap: spacing.xxs,
    },
    activityTitle: {
    },
    activityDesc: {
    },

    // Time
    activityTime: {
    },
});
