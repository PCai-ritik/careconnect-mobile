/**
 * CareConnect — Doctor Profile Tab
 *
 * Identity hero card, practice details, settings groups, and
 * logout action. Integrates EditProfileModal for inline editing.
 * Uses doctorColors tokens + StyleSheet.create().
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getDoctorProfile, getMe } from '@/services/doctor';
import { getHospitals } from '@/services/caregiver';
import { requestAffiliation } from '@/services/auth';
import type { DoctorProfile, MeResponse, HospitalListItem } from '@/services/types';
import {
    spacing,
    shadows,
    radii,
    typography,
} from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedText, ThemedView } from '@/components/shared/Themed';
import EditProfileModal from '@/components/doctor/EditProfileModal';
import PayoutMethodsModal from '@/components/doctor/PayoutMethodsModal';
import PrivacySecurityModal from '@/components/doctor/PrivacySecurityModal';
import HelpCenterModal from '@/components/doctor/HelpCenterModal';
import TermsOfServiceModal from '@/components/doctor/TermsOfServiceModal';
import AvailabilityModal from '@/components/doctor/AvailabilityModal';
import ThemedAlert from '@/components/doctor/ThemedAlert';
import HospitalAffiliationModal from '@/components/doctor/HospitalAffiliationModal';

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
    const { colors } = useTheme();
    return (
        <Pressable
            style={({ pressed }) => [
                s.settingsRow,
                showBorder && [s.settingsRowBorder, { borderBottomColor: colors.borderLight }],
                pressed && onPress && { opacity: 0.6 },
            ]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={[s.settingsIconBox, { backgroundColor: colors.surfaceMuted }]}>
                <Feather name={icon} size={18} color={colors.primary} />
            </View>
            <View style={s.settingsInfo}>
                <ThemedText color="primary" weight="medium" size="base" style={s.settingsLabel}>{label}</ThemedText>
                {subtitle ? (
                    <ThemedText color="muted" size="xs" style={s.settingsSubtitle}>{subtitle}</ThemedText>
                ) : null}
            </View>
            {rightText ? (
                <ThemedText color="secondary" weight="medium" size="sm" style={s.settingsValue}>{rightText}</ThemedText>
            ) : (
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
            )}
        </Pressable>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const router = useRouter();
    const { token, logout } = useAuth();
    const { colors, refreshBranding } = useTheme();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isPayoutsOpen, setIsPayoutsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);
    const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

    // Real profile data from API
    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [me, setMe] = useState<MeResponse | null>(null);
    const [hospitals, setHospitals] = useState<HospitalListItem[]>([]);
    const [isAffiliationOpen, setIsAffiliationOpen] = useState(false);
    const [selectedHospitalId, setSelectedHospitalId] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        Promise.all([
            getDoctorProfile(token),
            getMe(token),
            getHospitals()
        ])
            .then(([prof, meData, hospList]) => {
                setProfile(prof);
                setMe(meData);
                setHospitals(hospList);
                if (meData.hospital_id) {
                    setSelectedHospitalId(meData.hospital_id);
                }
            })
            .catch((e) => console.error('Failed to load profile data:', e))
            .finally(() => setLoading(false));
    }, [token, refreshKey]);

    const doctorName = profile?.full_name ?? 'Doctor';
    const avatarBg = AVATAR_COLORS[hashName(doctorName) % AVATAR_COLORS.length];
    const specialization = profile?.specialization ?? '—';
    const licenseNumber = profile?.license_number ?? '—';
    const consultationFee = profile?.consultation_fee
        ? `${profile.currency === 'INR' ? '₹' : profile.currency} ${profile.consultation_fee}`
        : '—';
    const whatsappNumber = profile?.phone_number ?? '—';

    return (
        <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
            >
                {/* ── Header ── */}
                <View style={s.header}>
                    <ThemedText color="primary" weight="bold" size="2xl" style={s.headerTitle}>Profile & Settings</ThemedText>
                </View>

                {/* ── Identity Hero Card ── */}
                <ThemedView bg="surface" rounded style={s.heroCard}>
                    <View style={[s.heroAvatar, { backgroundColor: avatarBg }]}>
                        <Feather name="user" size={30} color="#374151" />
                    </View>
                    <ThemedText color="primary" weight="bold" size="xl" style={s.heroName}>{doctorName}</ThemedText>
                    <ThemedText color="muted" size="sm" style={s.heroSubtext}>
                        {specialization}  •  Reg No: {licenseNumber}
                    </ThemedText>
                    <Pressable
                        style={({ pressed }) => [
                            s.editBtn,
                            { borderColor: colors.primary },
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => setIsEditProfileOpen(true)}
                    >
                        <Feather name="edit-2" size={14} color={colors.primary} />
                        <ThemedText color="brand" weight="medium" size="sm" style={s.editBtnText}>Edit Profile</ThemedText>
                    </Pressable>
                </ThemedView>

                {/* ── Group 1: Practice Details ── */}
                <ThemedText color="muted" weight="semiBold" size="sm" style={s.groupTitle}>Practice Details</ThemedText>
                <ThemedView bg="surface" rounded style={s.card}>
                    <SettingsRow
                        icon="dollar-sign"
                        label="Consultation Fee"
                        rightText={consultationFee}
                        showBorder
                    />
                    <SettingsRow
                        icon="message-circle"
                        label="WhatsApp Number"
                        rightText={whatsappNumber}
                        showBorder
                    />
                    <SettingsRow
                        icon="activity"
                        label="Hospital Affiliation"
                        subtitle={
                            me?.affiliation_status === 'PENDING'
                                ? 'Affiliation request pending'
                                : me?.affiliation_status === 'REJECTED'
                                    ? 'Affiliation request rejected'
                                    : hospitals.find((h) => h.id === me?.hospital_id)?.name ?? 'Default Hospital'
                        }
                        onPress={() => setIsAffiliationOpen(true)}
                    />
                </ThemedView>

                {/* ── Group 2: Schedule ── */}
                <ThemedText color="muted" weight="semiBold" size="sm" style={s.groupTitle}>Schedule</ThemedText>
                <ThemedView bg="surface" rounded style={s.card}>
                    <SettingsRow
                        icon="clock"
                        label="Availability"
                        subtitle="Manage your consultation hours"
                        onPress={() => setIsAvailabilityOpen(true)}
                    />
                </ThemedView>

                {/* ── Group 2: Payouts & Security ── */}
                <ThemedText color="muted" weight="semiBold" size="sm" style={s.groupTitle}>Payouts & Security</ThemedText>
                <ThemedView bg="surface" rounded style={s.card}>
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
                </ThemedView>

                {/* ── Group 3: Support ── */}
                <ThemedText color="muted" weight="semiBold" size="sm" style={s.groupTitle}>Support</ThemedText>
                <ThemedView bg="surface" rounded style={s.card}>
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
                </ThemedView>

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
                profile={profile}
                onSaved={() => {
                    if (token) {
                        getDoctorProfile(token)
                            .then(setProfile)
                            .catch((e) => console.error('Failed to reload profile:', e));
                    }
                }}
            />
            <HospitalAffiliationModal
                visible={isAffiliationOpen}
                onClose={() => setIsAffiliationOpen(false)}
                me={me}
                hospitals={hospitals}
                onSaved={() => {
                    setRefreshKey((k) => k + 1);
                    refreshBranding?.();
                }}
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
            <AvailabilityModal
                visible={isAvailabilityOpen}
                onClose={() => setIsAvailabilityOpen(false)}
                profile={profile}
                onSaved={() => {
                    if (token) {
                        getDoctorProfile(token)
                            .then(setProfile)
                            .catch((e) => console.error('Failed to reload profile:', e));
                    }
                }}
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
    },

    // Hero card
    heroCard: {
        alignItems: 'center',
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
        marginBottom: spacing.xxs,
    },
    heroSubtext: {
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
    },
    editBtnText: {
    },

    // Groups
    groupTitle: {
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: spacing['3xl'],
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    card: {
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
    },
    settingsIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsInfo: {
        flex: 1,
        gap: spacing.xxs,
    },
    settingsLabel: {
    },
    settingsSubtitle: {
    },
    settingsValue: {
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
