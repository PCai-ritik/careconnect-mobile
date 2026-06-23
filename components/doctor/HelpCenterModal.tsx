/**
 * CareConnect — Help Center Modal (Doctor)
 *
 * 85%-height Bottom Sheet with FAQ search, expandable FAQ cards,
 * and a Contact Support footer. Fully multi-tenant via useTheme().
 */

import { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
    StyleSheet,
} from 'react-native';
import { ThemedBottomSheet } from '@/components/shared/ThemedBottomSheet';
import { Feather } from '@expo/vector-icons';
import { spacing, shadows, radii, typography } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

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
    const { colors } = useTheme();
    const [search, setSearch] = useState('');

    const filtered = faqs.filter(
        (faq) =>
            faq.question.toLowerCase().includes(search.toLowerCase()) ||
            faq.answer.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <ThemedBottomSheet visible={visible} onClose={onClose}>
            {/* Header */}
            <View style={s.header}>
                <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Help Center</Text>
            </View>

            {/* Search */}
            <View style={[s.searchBar, { borderColor: colors.borderLight, backgroundColor: colors.surfaceMuted }]}>
                <Feather name="search" size={18} color={colors.textMuted} />
                <TextInput
                    style={[s.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search for help..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')} hitSlop={8}>
                        <Feather name="x" size={16} color={colors.textMuted} />
                    </Pressable>
                )}
            </View>

            <ScrollView
                style={s.scrollArea}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollInner}
            >
                {filtered.map((faq) => (
                    <View key={faq.id} style={[s.faqCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                        <View style={s.faqHeader}>
                            <Feather name="help-circle" size={16} color={colors.primary} />
                            <Text style={[s.faqQuestion, { color: colors.textPrimary }]}>{faq.question}</Text>
                        </View>
                        <Text style={[s.faqAnswer, { color: colors.textMuted }]}>{faq.answer}</Text>
                    </View>
                ))}

                {filtered.length === 0 && (
                    <View style={s.emptyState}>
                        <Feather name="search" size={36} color={colors.textMuted} />
                        <Text style={[s.emptyText, { color: colors.textMuted }]}>No results found</Text>
                    </View>
                )}
            </ScrollView>

            {/* Footer */}
            <View style={[s.footer, { borderTopColor: colors.borderLight }]}>
                <Pressable
                    style={({ pressed }) => [
                        s.contactBtn,
                        { borderColor: colors.border },
                        pressed && { opacity: 0.7 },
                    ]}
                >
                    <Feather name="mail" size={18} color={colors.primary} />
                    <Text style={[s.contactBtnText, { color: colors.primary }]}>Contact Support</Text>
                </Pressable>
            </View>
        </ThemedBottomSheet>
    );
}

const s = StyleSheet.create({
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
        borderRadius: radii.md,
    },
    searchInput: {
        flex: 1,
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        padding: 0,
    },

    scrollArea: { flex: 1 },
    scrollInner: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

    faqCard: {
        borderWidth: 1,
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
    },
    faqAnswer: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
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
    },

    footer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
    },
    contactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    contactBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
    },
});
