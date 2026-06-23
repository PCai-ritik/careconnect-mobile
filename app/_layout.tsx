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
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { PlayfairDisplay_400Regular, PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Merriweather_400Regular, Merriweather_700Bold } from '@expo-google-fonts/merriweather';
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { FiraSans_400Regular, FiraSans_500Medium, FiraSans_600SemiBold, FiraSans_700Bold } from '@expo-google-fonts/fira-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ActiveCallProvider } from '@/providers/ActiveCallProvider';
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
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    Roboto_400Regular, Roboto_500Medium, Roboto_700Bold,
    Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold,
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
    PlayfairDisplay_400Regular, PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold,
    Merriweather_400Regular, Merriweather_700Bold,
    Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold,
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
    FiraSans_400Regular, FiraSans_500Medium, FiraSans_600SemiBold, FiraSans_700Bold,
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <ActiveCallProvider>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(caregiver)" />
              <Stack.Screen name="(doctor)" />
              <Stack.Screen name="+not-found" />
            </Stack>

            {/* Animated splash overlay — fades away to reveal the Login screen */}
            {!isSplashDone && (
              <PatientSplashScreen
                onAnimationComplete={() => setIsSplashDone(true)}
              />
            )}
          </BottomSheetModalProvider>
          </ActiveCallProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
