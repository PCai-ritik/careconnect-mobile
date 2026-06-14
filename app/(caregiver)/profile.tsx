import { useState, useEffect } from 'react';
import {
    Pressable,
    ScrollView,
    TextInput,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    spacing,
    typography,
    radii,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getMe, getHospitals } from '@/services/caregiver';
import type { MeResponse, HospitalListItem } from '@/services/types';
import PatientThemedAlert from '@/components/patient/PatientThemedAlert';
import HospitalAffiliationModal from '@/components/patient/HospitalAffiliationModal';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemedView, ThemedText } from '@/components/shared/Themed';


export default function ProfileScreen() {
    const router = useRouter();
    const { token, logout } = useAuth();
    const { colors, refreshBranding } = useTheme();
    const styles = useStyles(colors);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);

    // Affiliation states
    const [me, setMe] = useState<MeResponse | null>(null);
    const [hospitals, setHospitals] = useState<HospitalListItem[]>([]);
    const [isAffiliationOpen, setIsAffiliationOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal states
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);

    // Fetch real profile on mount
    useEffect(() => {
        if (!token) return;
        setLoading(true);
        Promise.all([
            getMe(token),
            getHospitals()
        ])
            .then(([meData, hospList]) => {
                setMe(meData);
                setName(meData.full_name);
                setEmail(meData.email);
                setHospitals(hospList);
            })
            .catch((e) => console.error('Failed to load caregiver profile data:', e))
            .finally(() => setLoading(false));
    }, [token, refreshKey]);

    const handleSave = () => {
        // TODO: Wire to PATCH /auth/me once backend route exists
        setShowSaveSuccess(true);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header ── */}
            <ThemedView style={styles.header}>
                <Pressable
                    style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => router.back()}
                >
                    <Feather name="chevron-left" size={22} color={colors.textPrimary} />
                </Pressable>
                <ThemedText weight="semiBold" size="lg" style={styles.headerTitle}>Your Profile</ThemedText>
                <ThemedView style={{ width: 40 }} />
            </ThemedView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ── Avatar ── */}
                <ThemedView style={styles.avatarSection}>
                    <ThemedView style={[styles.avatarCircle, { backgroundColor: getAvatarColor(name || 'User') }]}>
                        <Feather name="user" size={40} color="#374151" />
                    </ThemedView>
                    <Pressable style={({ pressed }) => [styles.changePicBtn, pressed && { opacity: 0.8 }]}>
                        <Feather name="camera" size={16} color={colors.primary} />
                        <ThemedText weight="medium" size="sm" color="brand" style={styles.changePicText}>Change Picture</ThemedText>
                    </Pressable>
                </ThemedView>

                {/* ── Form ── */}
                <ThemedView style={styles.formSection}>
                    <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.fieldLabel}>Full Name</ThemedText>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your name"
                        placeholderTextColor={colors.textMuted}
                    />

                    <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.fieldLabel}>Email</ThemedText>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Your email"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <ThemedText weight="semiBold" size="sm" color="secondary" style={styles.fieldLabel}>Hospital Affiliation</ThemedText>
                    <Pressable
                        style={({ pressed }) => [
                            styles.affiliationRow,
                            pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => setIsAffiliationOpen(true)}
                    >
                        <ThemedView style={styles.affiliationRowLeft}>
                            <Feather name="activity" size={18} color={colors.primary} />
                            <ThemedView style={styles.affiliationInfo}>
                                <ThemedText weight="medium" style={styles.affiliationTitle}>
                                    {me?.affiliation_status === 'PENDING'
                                        ? 'Affiliation request pending'
                                        : me?.affiliation_status === 'REJECTED'
                                        ? 'Affiliation request rejected'
                                        : hospitals.find((h) => h.id === me?.hospital_id)?.name ?? 'Default Hospital'}
                                </ThemedText>
                                <ThemedText size="xs" color="muted" style={styles.affiliationSubtitle}>Tap to manage affiliation</ThemedText>
                            </ThemedView>
                        </ThemedView>
                        <Feather name="chevron-right" size={18} color={colors.textMuted} />
                    </Pressable>
                </ThemedView>

                {/* ── Save ── */}
                <Pressable
                    style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSave}
                >
                    <Feather name="check" size={18} color="#FFFFFF" />
                    <ThemedText weight="semiBold" style={styles.saveBtnText}>Save Changes</ThemedText>
                </Pressable>

                {/* ── Logout ── */}
                <Pressable
                    style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => setShowLogoutAlert(true)}
                >
                    <Feather name="log-out" size={18} color="#EF4444" />
                    <ThemedText weight="semiBold" style={styles.logoutBtnText}>Log Out</ThemedText>
                </Pressable>
            </ScrollView>

            {/* ── Save Success Modal ── */}
            <PatientThemedAlert
                visible={showSaveSuccess}
                variant="success"
                icon="check-circle"
                title="Changes Saved"
                message="Your profile has been updated successfully."
                confirmLabel="Back to Dashboard"
                onConfirm={() => {
                    setShowSaveSuccess(false);
                    router.replace('/(caregiver)');
                }}
            />

            {/* ── Logout Confirmation Modal ── */}
            <PatientThemedAlert
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

            {/* ── Hospital Affiliation Modal ── */}
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
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    '#FBCFE8', '#FED7AA', '#A5F3FC', '#BBF7D0',
    '#A5B4FC', '#BAE6FD', '#99F6E4', '#D9F99D',
    '#FDE68A', '#FECACA', '#DDD6FE',
];

const getAvatarColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const useStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: radii.full,
        backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
    },

    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },

    // Avatar
    avatarSection: { alignItems: 'center', marginVertical: spacing['2xl'] },
    avatarCircle: {
        width: 96, height: 96, borderRadius: 48,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
    },
    changePicBtn: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
        borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.primary,
    },
    changePicText: {
    },

    // Form
    formSection: { marginBottom: spacing.xl },
    fieldLabel: {
        textTransform: 'uppercase', letterSpacing: 0.5,
        marginBottom: spacing.sm, marginTop: spacing.lg,
    },
    input: {
        backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.md, fontFamily: typography.fontFamily.regular,
        ...typography.size.base, color: colors.textPrimary,
        borderWidth: 1, borderColor: colors.borderLight,
    },

    // Affiliation Row style
    affiliationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    affiliationRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    affiliationInfo: {
        flex: 1,
        gap: 2,
    },
    affiliationTitle: {
    },
    affiliationSubtitle: {
    },

    // Save
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, backgroundColor: colors.primary,
        paddingVertical: spacing.md, borderRadius: radii.md, marginBottom: spacing.lg,
    },
    saveBtnText: {
        color: '#FFFFFF',
    },

    // Logout
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radii.md,
        borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#FEF2F2',
    },
    logoutBtnText: {
        color: '#EF4444',
    },
});
