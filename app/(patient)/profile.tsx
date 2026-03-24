/**
 * CareConnect — Patient Profile
 *
 * Settings screen with avatar (user icon), editable name/email fields,
 * Save button (with success modal), and logout (with confirmation modal).
 *
 * Uses patientColors tokens + StyleSheet.create(). No Nativewind.
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    patientColors,
    spacing,
    typography,
    radii,
} from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import PatientThemedAlert from '@/components/patient/PatientThemedAlert';

export default function ProfileScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const [name, setName] = useState('Ananya Sharma');
    const [email, setEmail] = useState('ananya@example.com');

    // Modal states
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);

    const handleSave = () => {
        // In a real app, save to API here
        setShowSaveSuccess(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Pressable
                    style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => router.back()}
                >
                    <Feather name="chevron-left" size={22} color={patientColors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Your Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ── Avatar ── */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarCircle}>
                        <Feather name="user" size={40} color="#374151" />
                    </View>
                    <Pressable style={({ pressed }) => [styles.changePicBtn, pressed && { opacity: 0.8 }]}>
                        <Feather name="camera" size={16} color={patientColors.primary} />
                        <Text style={styles.changePicText}>Change Picture</Text>
                    </Pressable>
                </View>

                {/* ── Form ── */}
                <View style={styles.formSection}>
                    <Text style={styles.fieldLabel}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your name"
                        placeholderTextColor={patientColors.textMuted}
                    />

                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Your email"
                        placeholderTextColor={patientColors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* ── Save ── */}
                <Pressable
                    style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSave}
                >
                    <Feather name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                </Pressable>

                {/* ── Logout ── */}
                <Pressable
                    style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => setShowLogoutAlert(true)}
                >
                    <Feather name="log-out" size={18} color="#EF4444" />
                    <Text style={styles.logoutBtnText}>Log Out</Text>
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
                    router.replace('/(patient)');
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: patientColors.background },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: radii.full,
        backgroundColor: patientColors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.lg,
        color: patientColors.textPrimary,
    },

    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },

    // Avatar
    avatarSection: { alignItems: 'center', marginVertical: spacing['2xl'] },
    avatarCircle: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: getAvatarColor('Ananya Sharma'),
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
    },
    changePicBtn: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
        borderRadius: radii.full, borderWidth: 1.5, borderColor: patientColors.primary,
    },
    changePicText: {
        fontFamily: typography.fontFamily.medium, ...typography.size.sm, color: patientColors.primary,
    },

    // Form
    formSection: { marginBottom: spacing.xl },
    fieldLabel: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.sm,
        color: patientColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
        marginBottom: spacing.sm, marginTop: spacing.lg,
    },
    input: {
        backgroundColor: patientColors.surfaceMuted, borderRadius: radii.md,
        padding: spacing.md, fontFamily: typography.fontFamily.regular,
        ...typography.size.base, color: patientColors.textPrimary,
        borderWidth: 1, borderColor: patientColors.borderLight,
    },

    // Save
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, backgroundColor: patientColors.primary,
        paddingVertical: spacing.md, borderRadius: radii.md, marginBottom: spacing.lg,
    },
    saveBtnText: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#FFFFFF',
    },

    // Logout
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radii.md,
        borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#FEF2F2',
    },
    logoutBtnText: {
        fontFamily: typography.fontFamily.semiBold, ...typography.size.base, color: '#EF4444',
    },
});
