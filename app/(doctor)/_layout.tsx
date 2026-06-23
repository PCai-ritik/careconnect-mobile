/**
 * CareConnect — Doctor Tab Layout
 *
 * 5-slot bottom navigation: Home | Schedule | [+] | Patients | Profile
 * The center [+] button intercepts taps to show a floating action popover
 * instead of navigating to a screen.
 *
 * Auth guard: redirects unauthenticated users and non-doctors.
 * Uses useSafeAreaInsets() to dynamically pad above the system nav bar.
 */

import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, Redirect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getMe } from '@/services/doctor';
import FloatingCallBar from '@/components/FloatingCallBar';
import { useActiveCall } from '@/providers/ActiveCallProvider';

// Height of the call bar content that overlaps screen content (buttons + paddingBottom)
const CALL_BAR_OVERLAP = 44;
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { DoctorThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { doctorColors, typography as staticTypography, shadows } from '@/constants/theme';
import DoctorActionPopover from '@/components/doctor/DoctorActionPopover';
import NewPrescriptionModal from '@/components/doctor/NewPrescriptionModal';
import PrescriptionTypeSheet from '@/components/doctor/PrescriptionTypeSheet';
import AddPatientModal from '@/components/doctor/AddPatientModal';
import type { PatientProfile } from '@/services/types';

const TAB_INACTIVE_COLOR = '#94A3B8';

function dobToAge(dob: string | null | undefined): string {
    if (!dob) return '';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? String(age) : '';
}

function DoctorTabsInner() {
    const { colors, typography } = useTheme();
    const { activeCall } = useActiveCall();
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [rxPatient, setRxPatient] = useState<PatientProfile | null>(null);

    return (
        <View style={{ flex: 1 }}>
            {/* Push all tab content down when the call bar is overlaying the top */}
            <View style={{ flex: 1, paddingTop: activeCall ? CALL_BAR_OVERLAP : 0 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: TAB_INACTIVE_COLOR,
                    tabBarShowLabel: true,
                    tabBarLabelStyle: {
                        fontFamily: typography.heading.medium,
                        fontSize: 10,
                        marginTop: -2,
                    },
                    tabBarStyle: {
                        backgroundColor: colors.surface,
                        borderTopWidth: 1,
                        borderTopColor: colors.borderLight || '#E9ECEF',
                        elevation: 0,
                    },
                }}
            >
                {/* ── Slot 1: Home ── */}
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="home" size={size} color={color} />
                        ),
                    }}
                />

                {/* ── Slot 2: Schedule ── */}
                <Tabs.Screen
                    name="appointments"
                    options={{
                        title: 'Schedule',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="calendar" size={size} color={color} />
                        ),
                    }}
                />

                {/* ── Slot 3: Center Action Button (intercepted) ── */}
                <Tabs.Screen
                    name="action"
                    options={{
                        title: '',
                        tabBarLabel: () => null,
                        tabBarIcon: () => (
                            <View style={[styles.centerBtn, { backgroundColor: colors.primary }]}>
                                <Feather name="plus" size={26} color="#FFFFFF" />
                            </View>
                        ),
                    }}
                    listeners={{
                        tabPress: (e) => {
                            e.preventDefault();
                            setIsActionMenuOpen(true);
                        },
                    }}
                />

                {/* ── Slot 4: Patients ── */}
                <Tabs.Screen
                    name="patients"
                    options={{
                        title: 'Patients',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="users" size={size} color={color} />
                        ),
                    }}
                />

                {/* ── Slot 5: Profile ── */}
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="user" size={size} color={color} />
                        ),
                    }}
                />

                {/* ── Hidden routes (no tab bar entry) ── */}
                <Tabs.Screen
                    name="consultation/[id]"
                    options={{ href: null, tabBarStyle: { display: 'none' } }}
                />
            </Tabs>

            {/* ── Floating Action Popover ── */}
            <DoctorActionPopover
                visible={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                onPrescription={() => {
                    setIsActionMenuOpen(false);
                    setIsTypeSheetOpen(true);
                }}
                onAddPatient={() => {
                    setIsActionMenuOpen(false);
                    setIsAddPatientOpen(true);
                }}
            />

            {/* ── Global Modals ── */}
            <PrescriptionTypeSheet
                visible={isTypeSheetOpen}
                onClose={() => setIsTypeSheetOpen(false)}
                onIndependentPrescription={() => {
                    setRxPatient(null);
                    setIsTypeSheetOpen(false);
                    setIsPrescriptionOpen(true);
                }}
                onPatientPrescription={(patient) => {
                    setRxPatient(patient);
                    setIsTypeSheetOpen(false);
                    setIsPrescriptionOpen(true);
                }}
            />
            <NewPrescriptionModal
                visible={isPrescriptionOpen}
                onClose={() => {
                    setIsPrescriptionOpen(false);
                    setRxPatient(null);
                }}
                patientId={rxPatient?.id}
                patientName={rxPatient?.full_name ?? ''}
                patientAge={dobToAge(rxPatient?.date_of_birth)}
                patientGender={rxPatient?.gender ?? ''}
            />
            <AddPatientModal
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
            />
            </View>
            <FloatingCallBar />
        </View>
    );
}

export default function DoctorTabLayout() {
    const { user, token, isLoading, logout } = useAuth();
    const router = useRouter();
    const [onboardingStatus, setOnboardingStatus] = useState<'checking' | 'ok'>('checking');
    const redirectingRef = useRef(false);

    useEffect(() => {
        if (isLoading) return;

        if (!user || user.role !== 'DOCTOR' || !token) {
            if (!redirectingRef.current) setOnboardingStatus('ok');
            return;
        }

        getMe(token)
            .then(async (me) => {
                if (me.onboarding_completed === false && !redirectingRef.current) {
                    redirectingRef.current = true;
                    await SecureStore.setItemAsync('careconnect_onboarding_token', token);
                    await SecureStore.setItemAsync('careconnect_onboarding_user', JSON.stringify({
                        user_id: user.id,
                        role: user.role,
                        hospital_id: user.hospitalId || 'unassigned',
                    }));
                    await logout();
                    router.replace('/(auth)/doctor-onboarding');
                } else {
                    setOnboardingStatus('ok');
                }
            })
            .catch(() => setOnboardingStatus('ok'));
    }, [isLoading, user, token]);

    if (isLoading || onboardingStatus === 'checking') return null;
    if (redirectingRef.current) return null;
    if (!user) return <Redirect href="/(auth)/doctor-login" />;
    if (user.role === 'CAREGIVER') return <Redirect href="/(caregiver)" />;
    if (user.role !== 'DOCTOR') return <Redirect href="/(auth)/doctor-login" />;

    return (
        <DoctorThemeProvider>
            <DoctorTabsInner />
        </DoctorThemeProvider>
    );
}

const styles = StyleSheet.create({
    centerBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -15,
        ...shadows.elevated,
    },
});
