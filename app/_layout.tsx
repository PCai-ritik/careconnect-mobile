/**
 * CareConnect — Root Layout
 *
 * Loads Inter fonts, shows the animated PatientSplashScreen on app open,
 * then reveals the underlying route (Login by default via initialRouteName).
 * Wraps the app in AuthProvider + ThemeProvider.
 */

import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import PatientSplashScreen from '@/components/PatientSplashScreen';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashDone, setIsSplashDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Hide native splash and mark app ready once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      setIsAppReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!isAppReady) {
    return null;
  }

  // initialRouteName is (auth) → Login is already the default destination.
  // No router.replace needed — the splash overlay just fades away to reveal it.
  return (
    <AuthProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(patient)" />
          <Stack.Screen name="(doctor)" />
          <Stack.Screen name="+not-found" />
        </Stack>

        {/* Animated splash overlay — fades away to reveal the Login screen */}
        {!isSplashDone && (
          <PatientSplashScreen
            onAnimationComplete={() => setIsSplashDone(true)}
          />
        )}
      </ThemeProvider>
    </AuthProvider>
  );
}
