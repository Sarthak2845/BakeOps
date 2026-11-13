import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

export default function OrdersLayout() {
  useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
