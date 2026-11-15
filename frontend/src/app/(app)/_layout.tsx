import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

export default function AppLayout() {
  useTheme();
  const { needsSetup } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={needsSetup}>
        <Stack.Screen name="setup" />
      </Stack.Protected>

      <Stack.Protected guard={!needsSetup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="receipt/[id]" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="products/index" />
        <Stack.Screen name="products/import" />
      </Stack.Protected>
    </Stack>
  );
}
