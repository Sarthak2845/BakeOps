import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

export default function AuthLayout() {
  useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
