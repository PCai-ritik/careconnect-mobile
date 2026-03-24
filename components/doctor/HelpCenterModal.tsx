/**
 * CareConnect — Help Center Modal (Doctor)
 *
 * 85%-height Bottom Sheet with FAQ search, expandable FAQ cards,
 * and a Contact Support footer. Uses doctorColors + StyleSheet.create().
 */

import { useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
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

interface HelpCenterModalProps {
    visible: boolean;
    onClose: () => void;
}

const faqs = [
    {
        id: 1,
        question: 'How do payouts work?',
        answer:
            'Funds are released 24 hours after a completed consultation. They are deposited directly into your linked bank account. You can track payout status in the Payout Methods section.',
    },
    {
        id: 2,
        question: 'How do I reschedule a patient?',
        answer:
            'Go to the Appointments tab and select the pending request. From there you can accept the original time or tap "Reschedule" to propose a new slot.',
    },
    {
        id: 3,
        question: 'How do I update my availability?',
        answer:
            'From the Home tab, tap the "Availability" action in the toolbox. Toggle each day on or off and set your preferred start and end times.',
    },
];

export default function HelpCenterModal({ visible, onClose }: HelpCenterModalProps) {
    const insets = useSafeAreaInsets();
    const { panHandlers, animatedStyle } = useSwipeDown(onClose);
    const [search, setSearch] = useState('');

    const filtered = faqs.filter(
        (faq) =>
            faq.question.toLowerCase().includes(search.toLowerCase()) ||
            faq.answer.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable style={s.backdrop} onPress={onClose} />

            <Animated.View style={[s.sheet, animatedStyle, { paddingBottom: insets.bottom }]}>
                <View style={s.handleRow} {...panHandlers}>
                    <View style={s.handle} />
                </View>

                {/* Header */}
                <View style={s.header}>
                    <Text style={s.headerTitle}>Help Center</Text>
                </View>

                {/* Search */}
                <View style={s.searchBar}>
                    <Feather name="search" size={18} color={doctorColors.textMuted} />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search for help..."
                        placeholderTextColor={doctorColors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <Pressable onPress={() => setSearch('')} hitSlop={8}>
                            <Feather name="x" size={16} color={doctorColors.textMuted} />
                        </Pressable>
                    )}
                </View>

                <ScrollView
                    style={s.scrollArea}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollInner}
                >
                    {filtered.map((faq) => (
                        <View key={faq.id} style={s.faqCard}>
                            <View style={s.faqHeader}>
                                <Feather name="help-circle" size={16} color={doctorColors.primary} />
                                <Text style={s.faqQuestion}>{faq.question}</Text>
                            </View>
                            <Text style={s.faqAnswer}>{faq.answer}</Text>
                        </View>
                    ))}

                    {filtered.length === 0 && (
                        <View style={s.emptyState}>
                            <Feather name="search" size={36} color={doctorColors.textMuted} />
                            <Text style={s.emptyText}>No results found</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Footer */}
                <View style={s.footer}>
                    <Pressable
                        style={({ pressed }) => [
                            s.contactBtn,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Feather name="mail" size={18} color={doctorColors.primary} />
                        <Text style={s.contactBtnText}>Contact Support</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </Modal>
    );
}

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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size.xl,
        color: doctorColors.textPrimary,
    },


    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: radii.md,
        backgroundColor: '#F8FAFC',
    },
    searchInput: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textPrimary,
        padding: 0,
    },

    scrollArea: { flex: 1 },
    scrollInner: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

    faqCard: {
        backgroundColor: doctorColors.surface,
        borderWidth: 1,
        borderColor: doctorColors.borderLight,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.card,
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    faqQuestion: {
        flex: 1,
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    faqAnswer: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        lineHeight: 20,
        paddingLeft: spacing.xl + spacing.sm,
    },

    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['6xl'],
        gap: spacing.md,
    },
    emptyText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: doctorColors.textMuted,
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
    },
    contactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.border,
    },
    contactBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: doctorColors.primary,
    },
});
