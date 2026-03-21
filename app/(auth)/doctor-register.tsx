/**
 * CareConnect -- Doctor Registration Screen
 *
 * Collects Name, Email, Password.
 * Uses Doctor theme (terracotta).
 * On submit: mock register, console.log payload, navigate to doctor-onboarding.
 */

import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { z } from 'zod';

import { useAuth } from '@/hooks/useAuth';
import { registerDoctor } from '@/services/auth';
import {
    doctorColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';

// -- Validation --

const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// -- Component --

export default function DoctorRegisterScreen() {
    const router = useRouter();
    const { login } = useAuth();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{
        fullName?: string; email?: string; password?: string;
    }>({});

    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        const nameResult = nameSchema.safeParse(fullName);
        if (!nameResult.success) newErrors.fullName = nameResult.error.issues[0].message;

        const emailResult = emailSchema.safeParse(email);
        if (!emailResult.success) newErrors.email = emailResult.error.issues[0].message;

        const passwordResult = passwordSchema.safeParse(password);
        if (!passwordResult.success) newErrors.password = passwordResult.error.issues[0].message;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;
        setLoading(true);

        try {
            const response = await registerDoctor({ fullName, email, password, specialization: '' });
            // Don't call login() here — it would authenticate the user and trigger
            // the auth layout redirect to dashboard before onboarding can start.
            console.log('[Doctor Register] Account created, proceeding to onboarding:', response.user.id);
            router.replace('/(auth)/doctor-onboarding' as Href);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
            Alert.alert('Registration Failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back button */}
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={22} color={doctorColors.textPrimary} />
                    </Pressable>

                    <View style={styles.topSpacer} />

                    {/* Logo & Tagline */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoIcon}>
                            <Feather name="activity" size={28} color="#FFFFFF" />
                        </View>
                        <View style={styles.logoTitleRow}>
                            <Text style={styles.logoText}>CareConnect</Text>
                            <Text style={styles.logoSubtext}>for Doctors</Text>
                        </View>
                        <Text style={styles.tagline}>Create your doctor account</Text>
                    </View>

                    {/* Flex spacer pushes form to bottom */}
                    <View style={styles.formSpacer} />

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Full Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.microLabel}>FULL NAME <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={[styles.inlineInputRow, errors.fullName && styles.inputError]}>
                                <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                <TextInput
                                    style={styles.inlineInput}
                                    placeholder="Dr. Arvind Rawat"
                                    placeholderTextColor={doctorColors.textMuted}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                    returnKeyType="next"
                                    editable={!loading}
                                />
                            </View>
                            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
                        </View>

                        {/* Email */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.microLabel}>EMAIL <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={[styles.inlineInputRow, errors.email && styles.inputError]}>
                                <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                <TextInput
                                    style={styles.inlineInput}
                                    placeholder="dr.rawat@hospital.in"
                                    placeholderTextColor={doctorColors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="email"
                                    returnKeyType="next"
                                    editable={!loading}
                                />
                            </View>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        {/* Password */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.microLabel}>PASSWORD <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={[styles.inlineInputRow, errors.password && styles.inputError]}>
                                <Feather name="chevron-right" size={16} color={doctorColors.primary} style={styles.promptIcon} />
                                <TextInput
                                    style={styles.inlineInput}
                                    placeholder="min. 6 characters"
                                    placeholderTextColor={doctorColors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="password-new"
                                    returnKeyType="next"
                                    editable={!loading}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={styles.eyeButton}>
                                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={doctorColors.textMuted} />
                                </Pressable>
                            </View>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                        </View>

                        {/* Submit */}
                        <Pressable
                            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <View style={styles.buttonLoadingRow}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text style={styles.buttonText}>Creating account...</Text>
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>Create Doctor Account</Text>
                            )}
                        </Pressable>

                    </View>

                    {/* Spacer pushes sign-in link to bottom */}
                    <View style={styles.bottomSpacer} />

                    {/* Sign in link */}
                    <Pressable style={styles.switchButton} onPress={() => router.replace('/(auth)/login?role=doctor')}>
                        <Text style={styles.switchLabel}>Already have an account? </Text>
                        <Text style={styles.switchLink}>Sign in</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// -- Styles --

const INPUT_HEIGHT = 48;

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: doctorColors.background },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing['2xl'],
        paddingBottom: spacing['3xl'],
    },
    backButton: {
        width: 40, height: 40, borderRadius: radii.md,
        alignItems: 'center', justifyContent: 'center',
        marginTop: spacing.sm,
    },
    topSpacer: { height: '6%' },
    formSpacer: { flexGrow: 1 },
    bottomSpacer: { flexGrow: 1, minHeight: spacing['2xl'] },

    // Logo
    logoContainer: { alignItems: 'center' },
    logoIcon: {
        width: 56, height: 56, borderRadius: radii.xl,
        backgroundColor: doctorColors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
        ...shadows.card,
    },
    logoTitleRow: {
        flexDirection: 'row', alignItems: 'baseline',
        gap: spacing.xs, marginBottom: spacing.xs,
    },
    logoText: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size['2xl'],
        color: doctorColors.textPrimary,
    },
    logoSubtext: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm, color: doctorColors.primary,
    },
    tagline: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm, color: doctorColors.textSecondary,
    },

    // Form
    form: { gap: spacing.md },
    fieldGroup: { gap: spacing.xxs },
    microLabel: {
        fontSize: 10,
        fontFamily: typography.fontFamily.semiBold,
        letterSpacing: 1.5,
        color: doctorColors.textMuted,
    },
    requiredStar: {
        fontSize: 10,
        color: doctorColors.error,
    },
    inlineInputRow: {
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: doctorColors.border,
        minHeight: 40, paddingVertical: spacing.xs,
    },
    inputError: { borderBottomColor: doctorColors.error },
    promptIcon: { marginRight: spacing.sm },
    inlineInput: {
        flex: 1, fontSize: 16,
        fontFamily: typography.fontFamily.regular,
        color: doctorColors.textPrimary,
    },
    eyeButton: { marginLeft: spacing.sm, padding: spacing.xs },
    errorText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs, color: doctorColors.error,
        marginLeft: spacing.sm,
    },

    // Button
    button: {
        height: INPUT_HEIGHT, borderRadius: radii.md,
        backgroundColor: doctorColors.primary,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.card,
    },
    buttonPressed: { backgroundColor: doctorColors.primaryDark },
    buttonDisabled: { opacity: 0.7 },
    buttonText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base, color: '#FFFFFF',
    },
    buttonLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

    // Switch link
    switchButton: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: spacing.md,
    },
    switchLabel: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm, color: doctorColors.textMuted,
    },
    switchLink: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm, color: doctorColors.primary,
    },
});
