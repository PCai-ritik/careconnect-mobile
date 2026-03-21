/**
 * CareConnect -- Patient Registration Screen
 *
 * Collects Name, Email, Password. No onboarding steps.
 * Uses Patient theme (teal-green).
 * On submit: mock register, console.log payload, redirect to app.
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
import { Feather } from '@expo/vector-icons';
import { z } from 'zod';

import { useAuth } from '@/hooks/useAuth';
import { registerPatient } from '@/services/auth';
import {
    patientColors,
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

export default function PatientRegisterScreen() {
    const router = useRouter();
    const { login } = useAuth();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});

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
            const response = await registerPatient({ fullName, email, password });
            await login(response);
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
                        <Feather name="arrow-left" size={22} color={patientColors.textPrimary} />
                    </Pressable>

                    <View style={styles.topSpacer} />

                    {/* Logo & Tagline */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoIcon}>
                            <Feather name="video" size={28} color="#FFFFFF" />
                        </View>
                        <Text style={styles.logoText}>CareConnect</Text>
                        <Text style={styles.tagline}>Create your patient account</Text>
                    </View>

                    {/* Flex spacer pushes form to bottom */}
                    <View style={styles.formSpacer} />

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Full Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.microLabel}>FULL NAME <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={[styles.inlineInputRow, errors.fullName && styles.inputError]}>
                                <Feather name="chevron-right" size={16} color={patientColors.primary} style={styles.promptIcon} />
                                <TextInput
                                    style={styles.inlineInput}
                                    placeholder="Ananya Sharma"
                                    placeholderTextColor={patientColors.textMuted}
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
                                <Feather name="chevron-right" size={16} color={patientColors.primary} style={styles.promptIcon} />
                                <TextInput
                                    style={styles.inlineInput}
                                    placeholder="ananya.sharma@careconnect.in"
                                    placeholderTextColor={patientColors.textMuted}
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
                                <Feather name="chevron-right" size={16} color={patientColors.primary} style={styles.promptIcon} />
                                <TextInput
                                    style={styles.inlineInput}
                                    placeholder="min. 6 characters"
                                    placeholderTextColor={patientColors.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="password-new"
                                    returnKeyType="done"
                                    onSubmitEditing={handleRegister}
                                    editable={!loading}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={styles.eyeButton}>
                                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={patientColors.textMuted} />
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
                                <Text style={styles.buttonText}>Create Patient Account</Text>
                            )}
                        </Pressable>

                    </View>

                    {/* Spacer pushes sign-in link to bottom */}
                    <View style={styles.bottomSpacer} />

                    {/* Sign in link */}
                    <Pressable style={styles.switchButton} onPress={() => router.replace('/(auth)/login')}>
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
    container: { flex: 1, backgroundColor: patientColors.background },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing['2xl'],
        paddingBottom: spacing['3xl'],
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    topSpacer: { height: '6%' },
    formSpacer: { flexGrow: 1 },
    bottomSpacer: { flexGrow: 1, minHeight: spacing['2xl'] },

    // Logo
    logoContainer: { alignItems: 'center' },
    logoIcon: {
        width: 56, height: 56, borderRadius: radii.xl,
        backgroundColor: patientColors.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
        ...shadows.card,
    },
    logoText: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size['2xl'],
        color: patientColors.textPrimary,
        marginBottom: spacing.xs,
    },
    tagline: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
        color: patientColors.textSecondary,
    },

    // Form
    form: { gap: spacing.md },
    fieldGroup: { gap: spacing.xxs },
    microLabel: {
        fontSize: 10,
        fontFamily: typography.fontFamily.semiBold,
        letterSpacing: 1.5,
        color: patientColors.textMuted,
    },
    requiredStar: {
        fontSize: 10,
        color: patientColors.error,
    },
    inlineInputRow: {
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: patientColors.border,
        minHeight: 40, paddingVertical: spacing.xs,
    },
    inputError: { borderBottomColor: patientColors.error },
    promptIcon: { marginRight: spacing.sm },
    inlineInput: {
        flex: 1, fontSize: 16,
        fontFamily: typography.fontFamily.regular,
        color: patientColors.textPrimary,
    },
    eyeButton: { marginLeft: spacing.sm, padding: spacing.xs },
    errorText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs, color: patientColors.error,
        marginLeft: spacing.sm,
    },

    // Button
    button: {
        height: INPUT_HEIGHT, borderRadius: radii.md,
        backgroundColor: patientColors.primary,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.card,
    },
    buttonPressed: { backgroundColor: patientColors.primaryDark },
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
        ...typography.size.sm, color: patientColors.textMuted,
    },
    switchLink: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm, color: patientColors.primary,
    },
});
