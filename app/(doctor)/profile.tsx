/**
 * CareConnect — Doctor Profile & Settings Stub
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, doctorColors, typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
    const { logout } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Doctor Profile & Settings</Text>
                <Text style={styles.subtitle}>
                    Manage your account and preferences
                </Text>
                <Pressable style={styles.logoutLink} onPress={logout}>
                    <Text style={styles.logoutText}>Sign Out</Text>
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
        textAlign: 'center',
    },
    logoutLink: {
        marginTop: spacing['2xl'],
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: doctorColors.error,
    },
    logoutText: {
        fontFamily: typography.fontFamily.medium,
        ...typography.size.sm,
        color: doctorColors.error,
    },
});
