/**
 * CareConnect — Patient Dashboard placeholder
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, patientColors, typography } from '@/constants/theme';

export default function PatientHomeScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Patient Dashboard</Text>
                <Text style={styles.subtitle}>Coming soon</Text>
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
});
