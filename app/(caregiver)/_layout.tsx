/**
 * CareConnect — Caregiver Group Layout
 *
 * Protected route group for caregiver (family member) users.
 * Route guard: redirects unauthenticated users to auth, and doctors to their own group.
 */

import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, Redirect, router } from 'expo-router';
import FloatingCallBar from '@/components/FloatingCallBar';
import { useActiveCall } from '@/providers/ActiveCallProvider';

const CALL_BAR_OVERLAP = 44;
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { CaregiverThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { shadows } from '@/constants/theme';
import CaregiverActionPopover from '@/components/caregiver/CaregiverActionPopover';
import AddPatientSheet from '@/components/caregiver/AddPatientSheet';
import BookingWizard from '@/components/caregiver/BookingWizard';
import { getLinkedPatients, addPatient } from '@/services/caregiver';
import type { PatientProfile } from '@/services/types';

const TAB_INACTIVE_COLOR = '#94A3B8';

function AnimatedActionIcon({ isActionMenuOpen, color }: { isActionMenuOpen: boolean, color: string }) {
    const rotateStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: withTiming(isActionMenuOpen ? '-45deg' : '0deg', { duration: 200 }) }]
        };
    }, [isActionMenuOpen]);

    return (
        <View style={[styles.centerBtn, { backgroundColor: color }]}>
            <Animated.View style={rotateStyle}>
                <Feather name="plus" size={26} color="#FFFFFF" />
            </Animated.View>
        </View>
    );
}

function CaregiverTabsInner() {
    const { colors, typography } = useTheme();
    const { activeCall } = useActiveCall();
    const { user, token } = useAuth();
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);
    const [patients, setPatients] = useState<PatientProfile[]>([]);

    useEffect(() => {
        if (token) {
            getLinkedPatients(token).then(setPatients).catch(console.error);
        }
    }, [token, isAddPatientOpen]); // refetch when add patient closes

    return (
        <View style={{ flex: 1 }}>
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

                {/* ── Slot 2: Records ── */}
                <Tabs.Screen
                    name="records"
                    options={{
                        title: 'Records',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="file-text" size={size} color={color} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="action"
                    options={{
                        title: '',
                        tabBarLabel: () => null,
                        tabBarIcon: () => <AnimatedActionIcon isActionMenuOpen={isActionMenuOpen} color={colors.primary} />,
                    }}
                    listeners={{
                        tabPress: (e) => {
                            e.preventDefault();
                            setIsActionMenuOpen(true);
                        },
                    }}
                />

                {/* ── Slot 4: Appointments ── */}
                <Tabs.Screen
                    name="appointments/index"
                    options={{
                        title: 'Appointments',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="calendar" size={size} color={color} />
                        ),
                    }}
                />

                {/* ── Slot 5: Settings / Profile ── */}
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Settings',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="settings" size={size} color={color} />
                        ),
                    }}
                />

                {/* ── Hidden routes (no tab bar entry) ── */}
                <Tabs.Screen
                    name="consultation/[id]"
                    options={{ href: null, tabBarStyle: { display: 'none' } }}
                />
                <Tabs.Screen
                    name="post-call-summary"
                    options={{ href: null }}
                />
            </Tabs>

            {/* ── Floating Action Popover ── */}
            <CaregiverActionPopover
                visible={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                onBookAppointment={() => {
                    setIsActionMenuOpen(false);
                    setIsBookingWizardOpen(true);
                }}
                onAddPatient={() => {
                    setIsActionMenuOpen(false);
                    setIsAddPatientOpen(true);
                }}
            />

            {/* ── Global Modals ── */}
            <AddPatientSheet
                visible={isAddPatientOpen}
                onClose={() => setIsAddPatientOpen(false)}
                onPatientAdded={() => {
                    // Refetch handled by useEffect dependency
                }}
                onSubmit={async (data) => {
                    if (token) await addPatient(token, data);
                }}
            />

            <BookingWizard
                visible={isBookingWizardOpen}
                onClose={() => setIsBookingWizardOpen(false)}
                onSuccess={() => {}}
                token={token ?? ''}
                hospitalId={user?.hospitalId ?? ''}
                patients={patients}
                onRequireAddPatient={() => {
                    setIsBookingWizardOpen(false);
                    setIsAddPatientOpen(true);
                }}
            />
            </View>
            <FloatingCallBar />
        </View>
    );
}

export default function CaregiverTabLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;
    if (!user) return <Redirect href="/(auth)/login" />;
    if (user.role === 'DOCTOR') return <Redirect href="/(doctor)" />;
    if (user.role !== 'CAREGIVER') return <Redirect href="/(auth)/login" />;

    return (
        <CaregiverThemeProvider>
            <CaregiverTabsInner />
        </CaregiverThemeProvider>
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
