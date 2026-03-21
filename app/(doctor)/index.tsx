/**
 * CareConnect — Doctor Dashboard placeholder
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, doctorColors, typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function DoctorHomeScreen() {
    const { logout } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Doctor Dashboard</Text>
                <Text style={styles.subtitle}>Coming soon</Text>
                <Pressable style={styles.devLink} onPress={logout}>
                    <Text style={styles.devLinkText}>Return to Login</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: doctorColors.background,
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
        color: doctorColors.textPrimary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontFamily: typography.fontFamily.regular,
        ...typography.size.base,
        color: doctorColors.textMuted,
    },
    devLink: {
        marginTop: spacing['2xl'],
        paddingVertical: spacing.md,
    },
    devLinkText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.primary,
        textDecorationLine: 'underline',
    },
});
