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

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { DoctorThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { doctorColors, typography as staticTypography, shadows } from '@/constants/theme';
import DoctorActionPopover from '@/components/doctor/DoctorActionPopover';
import NewPrescriptionModal from '@/components/doctor/NewPrescriptionModal';
import AddPatientModal from '@/components/doctor/AddPatientModal';

const TAB_INACTIVE_COLOR = '#94A3B8';

function DoctorTabsInner() {
    const { colors, typography } = useTheme();
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

    return (
        <>
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
                    options={{ href: null }}
                />
            </Tabs>

            {/* ── Floating Action Popover ── */}
            <DoctorActionPopover
                visible={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                onPrescription={() => {
                    setIsActionMenuOpen(false);
                    setIsPrescriptionOpen(true);
                }}
                onAddPatient={() => {
                    setIsActionMenuOpen(false);
                    setIsAddPatientOpen(true);
                }}
            />

            {/* ── Global Modals ── */}
            <NewPrescriptionModal
                visible={isPrescriptionOpen}
                onClose={() => setIsPrescriptionOpen(false)}
                patientName=""
            />
            <AddPatientModal
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
            />
        </>
    );
}

export default function DoctorTabLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;
    if (!user) return <Redirect href="/(auth)/doctor-login" />;
    if (user.role !== 'DOCTOR') return <Redirect href="/(caregiver)" />;

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
