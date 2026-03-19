/**
 * CareConnect — Doctor Group Layout
 *
 * Protected route group for doctor/healthcare-provider users.
 * Route guard: redirects unauthenticated users to auth, and patients to their own group.
 */

import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { DoctorThemeProvider } from '@/providers/ThemeProvider';

export default function DoctorLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;
    if (!user) return <Redirect href="/(auth)/doctor-login" />;
    if (user.userType !== 'doctor') return <Redirect href="/(patient)" />;

    return (
        <DoctorThemeProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </DoctorThemeProvider>
    );
}
