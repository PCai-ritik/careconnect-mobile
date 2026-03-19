/**
 * CareConnect — Not Found Screen
 *
 * Shown when navigating to an undefined route.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { spacing, patientColors, typography } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: patientColors.background,
  },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    ...typography.size.xl,
    color: patientColors.textPrimary,
  },
  link: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  linkText: {
    fontFamily: typography.fontFamily.medium,
    ...typography.size.base,
    color: patientColors.primary,
  },
});
