/**
 * CareConnect — Auth Provider
 *
 * Wraps the app in authentication context.
 * Provides user state, login/logout functions, and loading state
 * to all children via the useAuth hook.
 *
 * Uses expo-secure-store for token persistence (NEVER AsyncStorage).
 */

import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse } from '@/services/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserType = 'patient' | 'doctor';

export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    userType: UserType;
    onboardingCompleted?: boolean;
}

export interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    login: (response: AuthResponse) => Promise<void>;
    logout: () => Promise<void>;
}

// ─── Secure Storage Keys ────────────────────────────────────────────────────

const TOKEN_KEY = 'careconnect_auth_token';
const REFRESH_KEY = 'careconnect_refresh_token';
const USER_KEY = 'careconnect_user';

// ─── Context ────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue>({
    user: null,
    token: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
});

// ─── Provider ───────────────────────────────────────────────────────────────

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session from secure storage on mount
    useEffect(() => {
        async function restoreSession() {
            try {
                const [storedToken, storedUser] = await Promise.all([
                    SecureStore.getItemAsync(TOKEN_KEY),
                    SecureStore.getItemAsync(USER_KEY),
                ]);

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser) as AuthUser);
                }
            } catch {
                // Corrupted storage or native module not available — clear and start fresh
                try {
                    await SecureStore.deleteItemAsync(TOKEN_KEY);
                    await SecureStore.deleteItemAsync(REFRESH_KEY);
                    await SecureStore.deleteItemAsync(USER_KEY);
                } catch {
                    // SecureStore not available (e.g. first Expo Go boot) — ignore
                }
            } finally {
                setIsLoading(false);
            }
        }

        restoreSession();
    }, []);

    const login = useCallback(async (response: AuthResponse) => {
        const authUser: AuthUser = {
            id: response.user.id,
            email: response.user.email,
            fullName: response.user.fullName,
            userType: response.user.userType,
            onboardingCompleted: response.user.onboardingCompleted,
        };

        await Promise.all([
            SecureStore.setItemAsync(TOKEN_KEY, response.token),
            SecureStore.setItemAsync(REFRESH_KEY, response.refreshToken),
            SecureStore.setItemAsync(USER_KEY, JSON.stringify(authUser)),
        ]);

        setToken(response.token);
        setUser(authUser);
    }, []);

    const logout = useCallback(async () => {
        await Promise.all([
            SecureStore.deleteItemAsync(TOKEN_KEY),
            SecureStore.deleteItemAsync(REFRESH_KEY),
            SecureStore.deleteItemAsync(USER_KEY),
        ]);

        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
