/**
 * CareConnect — Auth Group Layout
 *
 * Unauthenticated route group.
 * If a user is already authenticated, redirect them to their role's group.
 */

import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
    const { user, isLoading } = useAuth();

    // Still restoring session from SecureStore
    if (isLoading) return null;

    // Already authenticated — redirect to appropriate role group
    if (user) {
        if (user.userType === 'doctor') {
            return <Redirect href="/(doctor)" />;
        }
        return <Redirect href="/(patient)" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="doctor-login" />
            <Stack.Screen name="doctor-register" />
        </Stack>
    );
}
