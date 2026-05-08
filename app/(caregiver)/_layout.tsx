/**
 * CareConnect — Caregiver Group Layout
 *
 * Protected route group for caregiver (family member) users.
 * Route guard: redirects unauthenticated users to auth, and doctors to their own group.
 */

import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { CaregiverThemeProvider } from '@/providers/ThemeProvider';

export default function CaregiverLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;
    if (!user) return <Redirect href="/(auth)/login" />;
    if (user.role !== 'CAREGIVER') return <Redirect href="/(doctor)" />;

    return (
        <CaregiverThemeProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </CaregiverThemeProvider>
    );
}
