/**
 * CareConnect — Doctor Tab Layout
 *
 * 5-tab bottom navigation for the doctor experience.
 * Auth guard: redirects unauthenticated users and non-doctors.
 *
 * Uses useSafeAreaInsets() to dynamically pad above the system
 * navigation bar — works for 3-button nav, gesture nav, and no-bar layouts.
 */

import { Tabs, Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { DoctorThemeProvider } from '@/providers/ThemeProvider';
import { doctorColors, typography } from '@/constants/theme';

const TAB_INACTIVE_COLOR = '#94A3B8';
const TAB_BAR_HEIGHT = 56;

export default function DoctorTabLayout() {
    const { user, isLoading } = useAuth();
    const insets = useSafeAreaInsets();

    if (isLoading) return null;
    if (!user) return <Redirect href="/(auth)/doctor-login" />;
    if (user.userType !== 'doctor') return <Redirect href="/(patient)" />;

    return (
        <DoctorThemeProvider>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: doctorColors.primary,
                    tabBarInactiveTintColor: TAB_INACTIVE_COLOR,
                    tabBarShowLabel: true,
                    tabBarLabelStyle: styles.tabLabel,
                    tabBarStyle: {
                        ...styles.tabBar,
                        paddingBottom: insets.bottom,
                        height: TAB_BAR_HEIGHT + insets.bottom,
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="home" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="appointments"
                    options={{
                        title: 'Schedule',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="calendar" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="patients"
                    options={{
                        title: 'Patients',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="users" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="messages"
                    options={{
                        title: 'Messages',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="message-square" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => (
                            <Feather name="user" size={size} color={color} />
                        ),
                    }}
                />
            </Tabs>
        </DoctorThemeProvider>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: doctorColors.surface,
        borderTopWidth: 1,
        borderTopColor: doctorColors.borderLight,
        elevation: 0,
    },
    tabLabel: {
        fontFamily: typography.fontFamily.medium,
        fontSize: 10,
        marginTop: -2,
    },
});
