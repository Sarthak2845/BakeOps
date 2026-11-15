import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding';
import { useTheme } from '@/lib/theme-context';

export default function AuthLayout() {
  useTheme();
  const { done } = useOnboarding();

  // First launch: only the onboarding is reachable. Once it's completed (or
  // skipped), the guard flips and expo-router moves to the welcome screen.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={!done}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={done}>
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}
