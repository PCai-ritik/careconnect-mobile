/**
 * CareConnect — Theme Provider
 *
 * Provides role-based design tokens to child components.
 * Wraps the app and makes patient/doctor colors accessible via context.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { patientColors, doctorColors } from '@/constants/theme';

type RoleColors = typeof patientColors | typeof doctorColors;

interface ThemeContextValue {
    colors: RoleColors;
    role: 'patient' | 'doctor' | null;
}

const ThemeContext = createContext<ThemeContextValue>({
    colors: patientColors,
    role: null,
});

interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * Root-level ThemeProvider.
 * During foundation setup this is a passthrough wrapper.
 * Group layouts (patient/doctor) will set the correct role colors
 * by wrapping their children in role-specific providers.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    return (
        <ThemeContext.Provider value={{ colors: patientColors, role: null }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Role-specific provider used by group layouts.
 */
export function PatientThemeProvider({ children }: { children: ReactNode }) {
    return (
        <ThemeContext.Provider value={{ colors: patientColors, role: 'patient' }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function DoctorThemeProvider({ children }: { children: ReactNode }) {
    return (
        <ThemeContext.Provider value={{ colors: doctorColors, role: 'doctor' }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
