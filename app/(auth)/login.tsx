/**
 * CareConnect — Unified Login Screen
 *
 * Single login screen for both Patient and Doctor roles.
 * Role toggle with smooth slide + color animations via react-native-reanimated.
 *
 * - Patient → Doctor: form slides out LEFT, new form slides in from RIGHT
 * - Doctor → Patient: form slides out RIGHT, new form slides in from LEFT
 * - Background and button colors interpolate smoothly between themes
 *
 * Accepts optional `?role=doctor` search param for deep-link support.
 */

import { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    TextInput,
    Pressable,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Alert,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { z } from 'zod';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolateColor,
    Easing,
    runOnJS,
} from 'react-native-reanimated';

import { useAuth } from '@/hooks/useAuth';
import { loginPatient, loginDoctor } from '@/services/auth';
import {
    patientColors,
    doctorColors,
    spacing,
    typography,
    radii,
    shadows,
} from '@/constants/theme';

// ─── Constants ──────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const ANIM_DURATION = 350;
const ANIM_CONFIG = { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) };

type Role = 'patient' | 'doctor';

// ─── Validation ─────────────────────────────────────────────────────────────

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// ─── Role Config ────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
    patient: {
        colors: patientColors,
        icon: 'video' as const,
        title: 'CareConnect',
        subtitle: undefined as string | undefined,
        tagline: 'Care For Loved Ones, Anywhere',
        switchLabel: 'Are you a doctor? ',
        switchAction: 'Sign in here',
        registerHref: '/(auth)/register' as Href,
    },
    doctor: {
        colors: doctorColors,
        icon: 'activity' as const,
        title: 'CareConnect',
        subtitle: 'for Doctors',
        tagline: 'Empowering Doctors, Connecting Patients',
        switchLabel: 'Are you a patient? ',
        switchAction: 'Sign in here',
        registerHref: '/(auth)/doctor-register' as Href,
    },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ role?: string }>();
    const { login } = useAuth();

    // Always start as patient; deep-link `?role=doctor` handled via effect
    const [role, setRole] = useState<Role>('patient');
    const [isAnimating, setIsAnimating] = useState(false);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    // ── Animation values ────────────────────────────────────────────────

    // 0 = patient, 1 = doctor
    const colorProgress = useSharedValue(0);
    // Form slide offset
    const slideX = useSharedValue(0);

    // Deep-link support: switch to doctor if `?role=doctor` param is present
    useEffect(() => {
        if (params.role === 'doctor') {
            setRole('doctor');
            colorProgress.value = 1;
        }
    }, []);

    // ── Switch Role with Animation ──────────────────────────────────────

    const switchRole = useCallback(() => {
        if (isAnimating || loading) return;

        const nextRole: Role = role === 'patient' ? 'doctor' : 'patient';
        const slideOut = role === 'patient' ? -SCREEN_WIDTH : SCREEN_WIDTH;
        const slideIn = role === 'patient' ? SCREEN_WIDTH : -SCREEN_WIDTH;

        setIsAnimating(true);

        // Clear form state on switch
        setEmail('');
        setPassword('');
        setShowPassword(false);
        setErrors({});

        // Phase 1: Slide current form out
        slideX.value = withTiming(slideOut, { duration: ANIM_DURATION / 2, easing: Easing.in(Easing.cubic) }, () => {
            // Phase 2: Snap to entry position, update role, slide in
            slideX.value = slideIn;
            runOnJS(setRole)(nextRole);
            slideX.value = withTiming(0, { duration: ANIM_DURATION / 2, easing: Easing.out(Easing.cubic) }, () => {
                runOnJS(setIsAnimating)(false);
            });
        });

        // Transition colors during the slide-out so they're done before slide-in
        colorProgress.value = withTiming(
            nextRole === 'doctor' ? 1 : 0,
            { duration: ANIM_DURATION / 2, easing: Easing.in(Easing.cubic) },
        );
    }, [role, isAnimating, loading, colorProgress, slideX]);

    // ── Animated Styles ─────────────────────────────────────────────────

    const animatedContainer = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            colorProgress.value,
            [0, 1],
            [patientColors.background, doctorColors.background],
        ),
    }));

    const animatedSlide = useAnimatedStyle(() => ({
        transform: [{ translateX: slideX.value }],
    }));

    const animatedButton = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            colorProgress.value,
            [0, 1],
            [patientColors.primary, doctorColors.primary],
        ),
    }));

    const animatedLogoIcon = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            colorProgress.value,
            [0, 1],
            [patientColors.primary, doctorColors.primary],
        ),
    }));

    // ── Current role config ─────────────────────────────────────────────

    const config = ROLE_CONFIG[role];
    const colors = config.colors;

    // ── Validation ──────────────────────────────────────────────────────

    const validateForm = (): boolean => {
        const newErrors: { email?: string; password?: string } = {};

        const emailResult = emailSchema.safeParse(email);
        if (!emailResult.success) {
            newErrors.email = emailResult.error.issues[0].message;
        }

        const passwordResult = passwordSchema.safeParse(password);
        if (!passwordResult.success) {
            newErrors.password = passwordResult.error.issues[0].message;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ── Submit ──────────────────────────────────────────────────────────

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            const loginFn = role === 'patient' ? loginPatient : loginDoctor;
            const response = await loginFn({ email, password });
            await login(response);
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : 'Something went wrong. Please try again.';
            Alert.alert('Sign In Failed', message);
        } finally {
            setLoading(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <Animated.View style={[styles.container, animatedContainer]}>
            <SafeAreaView style={styles.flex}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.flex}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ── Top Spacer ──────────────────────────────── */}
                        <View style={styles.topSpacer} />

                        {/* ── Logo & Tagline (animated color) ─────────── */}
                        <Animated.View style={[styles.logoContainer, animatedSlide]}>
                            {role === 'patient' ? (
                                <Image
                                    source={require('@/assets/images/stethescope.png')}
                                    style={styles.logoImage}
                                />
                            ) : (
                                <Animated.View style={[styles.logoIcon, animatedLogoIcon]}>
                                    <Feather name={config.icon} size={28} color="#FFFFFF" />
                                </Animated.View>
                            )}
                            <View style={styles.logoTitleRow}>
                                <Text style={[styles.logoText, { color: colors.textPrimary }]}>
                                    {config.title}
                                </Text>
                                {config.subtitle && (
                                    <Text style={[styles.logoSubtext, { color: colors.primary }]}>
                                        {config.subtitle}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                                {config.tagline}
                            </Text>
                        </Animated.View>

                        {/* ── Form Spacer ─────────────────────────────── */}
                        <View style={styles.formSpacer} />

                        {/* ── Form (slides with animation) ───────────── */}
                        <Animated.View style={[styles.form, animatedSlide]}>
                            {/* Email Field */}
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.microLabel, { color: colors.textMuted }]}>EMAIL <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text></Text>
                                <View
                                    style={[
                                        styles.inlineInputRow,
                                        { borderBottomColor: errors.email ? colors.error : colors.border },
                                    ]}
                                >
                                    <Feather
                                        name="chevron-right"
                                        size={16}
                                        color={colors.primary}
                                        style={styles.promptIcon}
                                    />
                                    <TextInput
                                        style={[styles.inlineInput, { color: colors.textPrimary }]}
                                        placeholder="you@careconnect.in"
                                        placeholderTextColor={colors.textMuted}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="email"
                                        returnKeyType="next"
                                        editable={!loading && !isAnimating}
                                    />
                                </View>
                                {errors.email && (
                                    <Text style={[styles.errorText, { color: colors.error }]}>
                                        {errors.email}
                                    </Text>
                                )}
                            </View>

                            {/* Password Field */}
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.microLabel, { color: colors.textMuted }]}>PASSWORD <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text></Text>
                                <View
                                    style={[
                                        styles.inlineInputRow,
                                        { borderBottomColor: errors.password ? colors.error : colors.border },
                                    ]}
                                >
                                    <Feather
                                        name="chevron-right"
                                        size={16}
                                        color={colors.primary}
                                        style={styles.promptIcon}
                                    />
                                    <TextInput
                                        style={[styles.inlineInput, { color: colors.textPrimary }]}
                                        placeholder="min. 6 characters"
                                        placeholderTextColor={colors.textMuted}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="password"
                                        returnKeyType="done"
                                        onSubmitEditing={handleLogin}
                                        editable={!loading && !isAnimating}
                                    />
                                    <Pressable
                                        onPress={() => setShowPassword(!showPassword)}
                                        hitSlop={8}
                                        style={styles.eyeButton}
                                    >
                                        <Feather
                                            name={showPassword ? 'eye-off' : 'eye'}
                                            size={18}
                                            color={colors.textMuted}
                                        />
                                    </Pressable>
                                </View>
                                {errors.password && (
                                    <Text style={[styles.errorText, { color: colors.error }]}>
                                        {errors.password}
                                    </Text>
                                )}
                            </View>

                            {/* Sign In Button (animated background) */}
                            <Pressable
                                style={({ pressed }) => [
                                    pressed && styles.buttonPressed,
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={handleLogin}
                                disabled={loading || isAnimating}
                            >
                                <Animated.View style={[styles.button, animatedButton]}>
                                    {loading ? (
                                        <View style={styles.buttonLoadingRow}>
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                            <Text style={styles.buttonText}>Signing in…</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.buttonText}>Sign In</Text>
                                    )}
                                </Animated.View>
                            </Pressable>

                            {/* Switch Role (ghost link) */}
                            <Pressable
                                style={styles.switchRoleButton}
                                onPress={switchRole}
                                disabled={isAnimating || loading}
                            >
                                <Text style={[styles.switchRoleLabel, { color: colors.textMuted }]}>
                                    {config.switchLabel}
                                </Text>
                                <Text style={[styles.switchRoleLink, { color: colors.primary }]}>
                                    {config.switchAction}
                                </Text>
                            </Pressable>
                        </Animated.View>

                        {/* ── Bottom Spacer ───────────────────────────── */}
                        <View style={styles.bottomSpacer} />

                        {/* ── Create Account (outlined button, bottom) ── */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.outlinedButton,
                                { borderColor: colors.primary },
                                pressed && { backgroundColor: colors.primaryLight },
                            ]}
                            onPress={() => router.push(config.registerHref)}
                            disabled={isAnimating}
                        >
                            <Text style={[styles.outlinedButtonText, { color: colors.primary }]}>
                                Create an Account
                            </Text>
                        </Pressable>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Animated.View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const INPUT_HEIGHT = 48;

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing['2xl'],
        paddingBottom: spacing['3xl'],
    },

    // ── Spacers ─────────────────────────────────────────────────────────
    topSpacer: {
        height: '10%',
    },
    formSpacer: {
        height: 120,
    },
    bottomSpacer: {
        flexGrow: 1,
        minHeight: spacing['5xl'],
    },

    // ── Logo & Tagline ──────────────────────────────────────────────────
    logoContainer: {
        alignItems: 'center',
    },
    logoIcon: {
        width: 56,
        height: 56,
        borderRadius: radii.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        ...shadows.card,
    },
    logoImage: {
        width: 56,
        height: 56,
        resizeMode: 'contain',
        marginBottom: spacing.md,
    },
    logoTitleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    logoText: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size['2xl'],
    },
    logoSubtext: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
    },
    tagline: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
    },

    // ── Form ────────────────────────────────────────────────────────────
    form: {
        gap: spacing.md,
    },
    fieldGroup: {
        gap: spacing.xxs,
    },
    microLabel: {
        fontSize: 10,
        fontFamily: typography.fontFamily.semiBold,
        letterSpacing: 1.5,
    },
    requiredStar: {
        fontSize: 10,
    },
    inlineInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        minHeight: 40,
        paddingVertical: spacing.xs,
    },
    promptIcon: {
        marginRight: spacing.sm,
    },
    inlineInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: typography.fontFamily.regular,
    },
    eyeButton: {
        marginLeft: spacing.sm,
        padding: spacing.xs,
    },
    errorText: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.xs,
        marginLeft: spacing.sm,
    },

    // ── Primary Button ──────────────────────────────────────────────────
    button: {
        height: INPUT_HEIGHT,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.card,
    },
    buttonPressed: {
        opacity: 0.85,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        color: '#FFFFFF',
    },
    buttonLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    // ── Switch Role ─────────────────────────────────────────────────────
    switchRoleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
    },
    switchRoleLabel: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.sm,
    },
    switchRoleLink: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
    },

    // ── Create Account (Outlined) ───────────────────────────────────────
    outlinedButton: {
        height: INPUT_HEIGHT,
        borderRadius: radii.md,
        borderWidth: 2,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlinedButtonText: {
        fontFamily: typography.fontFamily.semiBold,
        ...typography.size.base,
        textAlign: 'center',
    },
});
