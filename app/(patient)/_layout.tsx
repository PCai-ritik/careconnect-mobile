/**
 * CareConnect — Patient Group Layout
 *
 * Protected route group for patient/caregiver users.
 * Route guard: redirects unauthenticated users to auth, and doctors to their own group.
 */

import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { PatientThemeProvider } from '@/providers/ThemeProvider';

export default function PatientLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;
    if (!user) return <Redirect href="/(auth)/login" />;
    if (user.userType !== 'patient') return <Redirect href="/(doctor)" />;

    return (
        <PatientThemeProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </PatientThemeProvider>
    );
}
