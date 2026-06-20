/**
 * CareConnect — Theme Provider
 *
 * Provides role-based design tokens to child components.
 * Wraps the app and makes caregiver/doctor colors accessible via context.
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { patientColors, doctorColors, setBranding } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, API_BASE_URL } from '@/services/api';
import * as SecureStore from 'expo-secure-store';

type BaseColors = typeof patientColors;
type DoctorColorsType = typeof doctorColors;
type MutableColors<T> = {
    -readonly [K in keyof T]: string;
};
type RoleColors = MutableColors<BaseColors> | MutableColors<DoctorColorsType>;

export interface ThemeTypography {
    heading: { regular: string; medium: string; semiBold: string; bold: string; };
    body: { regular: string; medium: string; semiBold: string; bold: string; };
}

export interface ThemeShape {
    radius: number;
}

export interface ThemeContextValue {
    colors: RoleColors;
    typography: ThemeTypography;
    shape: ThemeShape;
    role: 'caregiver' | 'doctor' | null;
    refreshBranding?: () => Promise<void>;
}

const defaultTypography: ThemeTypography = {
    heading: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semiBold: 'Inter_600SemiBold', bold: 'Inter_700Bold' },
    body: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semiBold: 'Inter_600SemiBold', bold: 'Inter_700Bold' },
};

const defaultShape: ThemeShape = { radius: 12 };

export const ThemeContext = createContext<ThemeContextValue>({
    colors: patientColors as unknown as RoleColors,
    typography: defaultTypography,
    shape: defaultShape,
    role: null,
});

interface ThemeProviderProps {
    children: ReactNode;
}

// ─── Color Helper Utilities ───────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
    return "#" + ((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1).toUpperCase();
}

function darkenHex(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const factor = 1 - percent / 100;
    return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

function lightenHex(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const factor = percent / 100;
    return rgbToHex(
        rgb.r + (255 - rgb.r) * factor,
        rgb.g + (255 - rgb.g) * factor,
        rgb.b + (255 - rgb.b) * factor
    );
}

const DEFAULT_HOSPITAL_ID = "00000000-0000-4000-8000-000000000001";

// ─── Dynamic Branding Hook ──────────────────────────────────────────────────

function getFontFamily(name?: string): ThemeTypography['heading'] {
    const map: Record<string, ThemeTypography['heading']> = {
        'Inter': { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semiBold: 'Inter_600SemiBold', bold: 'Inter_700Bold' },
        'Roboto': { regular: 'Roboto_400Regular', medium: 'Roboto_500Medium', semiBold: 'Roboto_700Bold', bold: 'Roboto_700Bold' },
        'Outfit': { regular: 'Outfit_400Regular', medium: 'Outfit_500Medium', semiBold: 'Outfit_600SemiBold', bold: 'Outfit_700Bold' },
        'Plus Jakarta Sans': { regular: 'PlusJakartaSans_400Regular', medium: 'PlusJakartaSans_500Medium', semiBold: 'PlusJakartaSans_600SemiBold', bold: 'PlusJakartaSans_700Bold' },
        'Poppins': { regular: 'Poppins_400Regular', medium: 'Poppins_500Medium', semiBold: 'Poppins_600SemiBold', bold: 'Poppins_700Bold' },
        'Playfair Display': { regular: 'PlayfairDisplay_400Regular', medium: 'PlayfairDisplay_500Medium', semiBold: 'PlayfairDisplay_600SemiBold', bold: 'PlayfairDisplay_700Bold' },
        'Merriweather': { regular: 'Merriweather_400Regular', medium: 'Merriweather_400Regular', semiBold: 'Merriweather_700Bold', bold: 'Merriweather_700Bold' },
        'Lora': { regular: 'Lora_400Regular', medium: 'Lora_500Medium', semiBold: 'Lora_600SemiBold', bold: 'Lora_700Bold' },
        'Space Grotesk': { regular: 'SpaceGrotesk_400Regular', medium: 'SpaceGrotesk_500Medium', semiBold: 'SpaceGrotesk_600SemiBold', bold: 'SpaceGrotesk_700Bold' },
        'Fira Sans': { regular: 'FiraSans_400Regular', medium: 'FiraSans_500Medium', semiBold: 'FiraSans_600SemiBold', bold: 'FiraSans_700Bold' },
    };
    if (!name || !map[name]) return map['Inter'];
    return map[name];
}

export function useDynamicBranding(role: 'caregiver' | 'doctor') {
    const { token, user } = useAuth();
    const baseColors = (role === 'caregiver' ? patientColors : doctorColors) as unknown as RoleColors;
    const [colors, setColors] = useState<RoleColors>(baseColors);
    const [typography, setTypography] = useState<ThemeTypography>(defaultTypography);
    const [shape, setShape] = useState<ThemeShape>(defaultShape);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = async () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        if (!token) {
            setColors(baseColors);
            return;
        }

        let isMounted = true;
        const CACHE_KEY = `BRANDING_CACHE_${role}_${user?.id || 'default'}`;

        async function loadBranding() {
            try {
                // Read from cache first to avoid flicker
                const cached = await SecureStore.getItemAsync(CACHE_KEY);
                if (cached && isMounted) {
                    try {
                        const parsed = JSON.parse(cached);
                        setColors(parsed.colors);
                        if (parsed.typography) setTypography(parsed.typography);
                        if (parsed.shape) setShape(parsed.shape);
                        if (parsed.branding) setBranding(parsed.branding);
                    } catch (e) {}
                }

                // 1. Fetch current user affiliation status via /api/me
                const me = await apiRequest<{ hospital_id: string; affiliation_status: string }>({
                    method: 'GET',
                    path: '/api/me',
                    token: token ?? undefined,
                });

                if (!isMounted) return;

                if (me.affiliation_status === 'APPROVED' && me.hospital_id !== DEFAULT_HOSPITAL_ID) {
                    // 2. Fetch hospital branding
                    const branding = await apiRequest<{ 
                        name: string; 
                        brand_color: string; 
                        logo_url: string | null;
                        white_label_config: { heading_font?: string; body_font?: string; radius?: number } | null;
                    }>({
                        method: 'GET',
                        path: `/hospitals/${me.hospital_id}/branding`,
                    });

                    if (!isMounted) return;

                    const brandColor = branding.brand_color || (role === 'caregiver' ? '#27A599' : '#4F46E5');
                    
                    // Override primary color and its variants dynamically
                    const updatedColors = {
                        ...baseColors,
                        primary: brandColor,
                        primaryLight: lightenHex(brandColor, 90),
                        primaryDark: darkenHex(brandColor, 15),
                    } as unknown as RoleColors;

                    setColors(updatedColors);

                    if (branding.white_label_config) {
                        setTypography({
                            heading: getFontFamily(branding.white_label_config.heading_font),
                            body: getFontFamily(branding.white_label_config.body_font),
                        });
                        if (branding.white_label_config.radius !== undefined) {
                            setShape({ radius: branding.white_label_config.radius });
                        }
                    }

                    let safeLogoUrl = branding.logo_url;
                    if (safeLogoUrl && safeLogoUrl.startsWith('http://localhost:8000')) {
                        const path = safeLogoUrl.replace('http://localhost:8000', '');
                        safeLogoUrl = `${API_BASE_URL}${path}`;
                    }

                    const newBranding = {
                        name: branding.name,
                        primaryColor: brandColor,
                        logoUrl: safeLogoUrl,
                    };

                    // Update local module-level branding cache in theme.ts
                    setBranding(newBranding);

                    const newTypography = branding.white_label_config ? {
                        heading: getFontFamily(branding.white_label_config.heading_font),
                        body: getFontFamily(branding.white_label_config.body_font),
                    } : defaultTypography;
                    
                    const newShape = branding.white_label_config?.radius !== undefined 
                        ? { radius: branding.white_label_config.radius } 
                        : defaultShape;

                    SecureStore.setItemAsync(CACHE_KEY, JSON.stringify({
                        colors: updatedColors,
                        typography: newTypography,
                        shape: newShape,
                        branding: newBranding
                    })).catch(() => {});
                } else {
                    setColors(baseColors);
                    setTypography(defaultTypography);
                    setShape(defaultShape);
                }
            } catch (err) {
                console.warn('[Theme] Failed to load dynamic branding:', err);
                if (isMounted) {
                    setColors(baseColors);
                    setTypography(defaultTypography);
                    setShape(defaultShape);
                }
            }
        }

        loadBranding();

        return () => {
            isMounted = false;
        };
    }, [token, refreshTrigger]);

    return { colors, typography, shape, refresh };
}

/**
 * Root-level ThemeProvider.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    return (
        <ThemeContext.Provider value={{ colors: patientColors as unknown as RoleColors, typography: defaultTypography, shape: defaultShape, role: null }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Role-specific providers used by caregiver and doctor group layouts.
 */
export function CaregiverThemeProvider({ children }: { children: ReactNode }) {
    const { colors, typography, shape, refresh } = useDynamicBranding('caregiver');
    return (
        <ThemeContext.Provider value={{ colors, typography, shape, role: 'caregiver', refreshBranding: refresh }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function DoctorThemeProvider({ children }: { children: ReactNode }) {
    const { colors, typography, shape, refresh } = useDynamicBranding('doctor');
    return (
        <ThemeContext.Provider value={{ colors, typography, shape, role: 'doctor', refreshBranding: refresh }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
