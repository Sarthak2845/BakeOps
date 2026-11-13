import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ToastProvider } from '@/components/ui/toast';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider, useTheme } from '@/lib/theme-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Figtree_400Regular,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  useTheme();
  const { isLoading, token } = useAuth();

  // The Stack (and expo-router's own linking/URL resolution) must stay
  // mounted continuously — unmounting it while `isLoading` resolves causes
  // "state update on a component that hasn't mounted yet" once it remounts.
  // The splash screen overlay (a separate native layer) hides the loading
  // gap instead, so nothing is visibly wrong while auth state loads.
  return (
    <>
      <SplashScreenController isLoading={isLoading} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Protected guard={!!token}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        <Stack.Protected guard={!token}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function SplashScreenController({ isLoading }: { isLoading: boolean }) {
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}
