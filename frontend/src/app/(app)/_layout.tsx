import { Stack } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function AppLayout() {
  const { needsSetup } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={needsSetup}>
        <Stack.Screen name="setup" />
      </Stack.Protected>

      <Stack.Protected guard={!needsSetup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="receipt/[id]" />
        <Stack.Screen name="insights" />
      </Stack.Protected>
    </Stack>
  );
}
