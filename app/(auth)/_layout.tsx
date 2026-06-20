/**
 * CareConnect — Auth Group Layout
 *
 * Unauthenticated route group.
 * If a user is already authenticated, redirect them to their role's group.
 */

import { useEffect } from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Alert } from 'react-native';

export default function AuthLayout() {
    const { user, isLoading, logout } = useAuth();

    useEffect(() => {
        if (user && user.role !== 'DOCTOR' && user.role !== 'CAREGIVER') {
            Alert.alert(
                "Access Denied",
                "The mobile app is strictly for doctors and caregivers. Hospital admins must use the web dashboard."
            );
            logout();
        }
    }, [user, logout]);

    // Still restoring session from SecureStore
    if (isLoading) return null;

    // Already authenticated — redirect to appropriate role group
    if (user) {
        if (user.role === 'DOCTOR') {
            return <Redirect href="/(doctor)" />;
        }
        if (user.role === 'CAREGIVER') {
            return <Redirect href="/(caregiver)" />;
        }
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" options={{ animation: 'fade', animationDuration: 800 }} />
            <Stack.Screen name="doctor-login" />
            <Stack.Screen name="doctor-register" options={{ animation: 'fade', animationDuration: 800 }} />
            <Stack.Screen name="doctor-onboarding" />
        </Stack>
    );
}
