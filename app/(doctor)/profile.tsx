/**
 * CareConnect — Doctor Profile Tab
 *
 * Identity hero card, practice details, settings groups, and
 * logout action. Integrates EditProfileModal for inline editing.
 * Uses doctorColors tokens + StyleSheet.create().
 */

import { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import {
    spacing,
    doctorColors,
    typography,
    shadows,
    radii,
} from '@/constants/theme';
import EditProfileModal from '@/components/doctor/EditProfileModal';
import PayoutMethodsModal from '@/components/doctor/PayoutMethodsModal';
import PrivacySecurityModal from '@/components/doctor/PrivacySecurityModal';
import HelpCenterModal from '@/components/doctor/HelpCenterModal';
import TermsOfServiceModal from '@/components/doctor/TermsOfServiceModal';
import ThemedAlert from '@/components/doctor/ThemedAlert';

// ─── Avatar Helper ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    '#E8D5C4', '#C4D7E8', '#D5E8C4', '#E8C4D5', '#C4E8D7',
    '#D7C4E8', '#E8E2C4', '#C4CEE8', '#E8C4C4', '#C4E8E8',
];

function hashName(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function SettingsRow({
    icon,
    label,
    subtitle,
    rightText,
    showBorder = false,
    onPress,
}: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    subtitle?: string;
    rightText?: string;
    showBorder?: boolean;
    onPress?: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                s.settingsRow,
                showBorder && s.settingsRowBorder,
                pressed && onPress && { opacity: 0.6 },
            ]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={s.settingsIconBox}>
                <Feather name={icon} size={18} color={doctorColors.primary} />
            </View>
            <View style={s.settingsInfo}>
                <Text style={s.settingsLabel}>{label}</Text>
                {subtitle ? (
                    <Text style={s.settingsSubtitle}>{subtitle}</Text>
                ) : null}
            </View>
            {rightText ? (
                <Text style={s.settingsValue}>{rightText}</Text>
            ) : (
                <Feather name="chevron-right" size={18} color={doctorColors.textMuted} />
            )}
        </Pressable>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isPayoutsOpen, setIsPayoutsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);

    const doctorName = 'Dr. Robert Chen';
    const avatarBg = AVATAR_COLORS[hashName(doctorName) % AVATAR_COLORS.length];

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
            >
                {/* ── Header ── */}
                <View style={s.header}>
                    <Text style={s.headerTitle}>Profile & Settings</Text>
                </View>

                {/* ── Identity Hero Card ── */}
                <View style={s.heroCard}>
                    <View style={[s.heroAvatar, { backgroundColor: avatarBg }]}>
                        <Feather name="user" size={30} color="#374151" />
                    </View>
                    <Text style={s.heroName}>{doctorName}</Text>
                    <Text style={s.heroSubtext}>
                        Cardiologist  •  Reg No: NMC-78291
                    </Text>
                    <Pressable
                        style={({ pressed }) => [
                            s.editBtn,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => setIsEditProfileOpen(true)}
                    >
                        <Feather name="edit-2" size={14} color={doctorColors.primary} />
                        <Text style={s.editBtnText}>Edit Profile</Text>
                    </Pressable>
                </View>

                {/* ── Group 1: Practice Details ── */}
                <Text style={s.groupTitle}>Practice Details</Text>
                <View style={s.card}>
                    <SettingsRow
                        icon="dollar-sign"
                        label="Consultation Fee"
                        rightText="₹ 500"
                        showBorder
                    />
                    <SettingsRow
                        icon="message-circle"
                        label="WhatsApp Number"
                        rightText="+1 234 567 8900"
                    />
                </View>

                {/* ── Group 2: Payouts & Security ── */}
                <Text style={s.groupTitle}>Payouts & Security</Text>
                <View style={s.card}>
                    <SettingsRow
                        icon="credit-card"
                        label="Payout Methods"
                        subtitle="Manage Bank & UPI"
                        showBorder
                        onPress={() => setIsPayoutsOpen(true)}
                    />
                    <SettingsRow
                        icon="lock"
                        label="Privacy & Security"
                        onPress={() => setIsPrivacyOpen(true)}
                    />
                </View>

                {/* ── Group 3: Support ── */}
                <Text style={s.groupTitle}>Support</Text>
                <View style={s.card}>
                    <SettingsRow
                        icon="help-circle"
                        label="Help Center"
                        showBorder
                        onPress={() => setIsHelpOpen(true)}
                    />
                    <SettingsRow
                        icon="file-text"
                        label="Terms of Service"
                        onPress={() => setIsTermsOpen(true)}
                    />
                </View>

                {/* ── Log Out ── */}
                <Pressable
                    style={({ pressed }) => [
                        s.logoutBtn,
                        pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setShowLogoutAlert(true)}
                >
                    <Feather name="log-out" size={18} color="#EF4444" />
                    <Text style={s.logoutText}>Log Out</Text>
                </Pressable>
            </ScrollView>

            <EditProfileModal
                visible={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
            />
            <PayoutMethodsModal
                visible={isPayoutsOpen}
                onClose={() => setIsPayoutsOpen(false)}
            />
            <PrivacySecurityModal
                visible={isPrivacyOpen}
                onClose={() => setIsPrivacyOpen(false)}
            />
            <HelpCenterModal
                visible={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />
            <TermsOfServiceModal
                visible={isTermsOpen}
                onClose={() => setIsTermsOpen(false)}
            />
            <ThemedAlert
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
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        paddingBottom: spacing.lg,
    },

    // Header
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    headerTitle: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size['2xl'],
        color: doctorColors.textPrimary,
    },

    // Hero card
    heroCard: {
        alignItems: 'center',
        backgroundColor: doctorColors.surface,
        borderRadius: 16,
        padding: spacing.xl,
        marginHorizontal: spacing.xl,
        marginTop: spacing.md,
        ...shadows.elevated,
    },
    heroAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    heroName: {
        fontFamily: typography.fontFamily.bold,
        fontSize: 20,
        color: doctorColors.textPrimary,
        marginBottom: spacing.xxs,
    },
    heroSubtext: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        marginBottom: spacing.lg,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: doctorColors.primary,
    },
    editBtnText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
    },

    // Groups
    groupTitle: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.sm,
        color: doctorColors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: spacing['3xl'],
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    card: {
        backgroundColor: doctorColors.surface,
        borderRadius: radii.lg,
        marginHorizontal: spacing.xl,
        ...shadows.elevated,
        overflow: 'hidden',
    },

    // Settings row
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    settingsRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: doctorColors.borderLight,
    },
    settingsIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: doctorColors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsInfo: {
        flex: 1,
        gap: spacing.xxs,
    },
    settingsLabel: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.base,
        color: doctorColors.textPrimary,
    },
    settingsSubtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        color: doctorColors.textMuted,
    },
    settingsValue: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.textSecondary,
    },

    // Logout
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing['3xl'],
        marginHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    logoutText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#EF4444',
    },
});
