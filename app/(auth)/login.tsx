/**
 * CareConnect — Auth Index (Patient Login placeholder)
 *
 * This is a placeholder screen. The actual login UI will be built
 * in a future feature task.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, patientColors, typography } from '@/constants/theme';

export default function LoginScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Patient Login</Text>
                <Text style={styles.subtitle}>Coming soon</Text>
                <Link href="/(auth)/doctor-login" style={styles.link}>
                    <Text style={styles.linkText}>Are you a doctor? Sign in here</Text>
                </Link>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: patientColors.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    title: {
        fontFamily: typography.fontFamily.bold,
        ...typography.size['2xl'],
        color: patientColors.textPrimary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: patientColors.textMuted,
    },
    link: {
        marginTop: spacing['3xl'],
    },
    linkText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: patientColors.primary,
    },
});
