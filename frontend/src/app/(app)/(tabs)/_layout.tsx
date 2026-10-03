import { forwardRef } from 'react';
import { Platform, Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { Link } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText } from '@/components/ui/text';
import { BrandGradient, Colors, Radii, Spacing } from '@/constants/theme';

type TabButtonProps = TabTriggerSlotProps & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TabButton = forwardRef<View, TabButtonProps>(({ isFocused, icon, label, ...rest }, ref) => (
  <Pressable ref={ref} {...(rest as PressableProps)} style={styles.tabButton}>
    <View style={[styles.tabPill, isFocused && styles.tabPillActive]}>
      <Ionicons name={icon} size={19} color={isFocused ? Colors.brandDark : Colors.textMuted} />
      <AppText variant="small" style={[styles.tabLabel, { color: isFocused ? Colors.brandDark : Colors.textMuted }]}>
        {label}
      </AppText>
    </View>
  </Pressable>
));
TabButton.displayName = 'TabButton';

export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot />

      <TabList style={styles.hidden}>
        <TabTrigger name="index" href="/" />
        <TabTrigger name="orders" href="/orders" />
        <TabTrigger name="calendar" href="/calendar" />
        <TabTrigger name="money" href="/money" />
      </TabList>

      <View style={styles.bar}>
        <TabTrigger name="index" href="/" resetOnFocus asChild>
          <TabButton icon="home" label="Today" />
        </TabTrigger>
        <TabTrigger name="orders" href="/orders" resetOnFocus asChild>
          <TabButton icon="receipt-outline" label="Orders" />
        </TabTrigger>

        <Link href="/orders/new" asChild>
          <Pressable style={styles.fab}>
            <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
              <Ionicons name="add" size={26} color={Colors.white} />
            </LinearGradient>
          </Pressable>
        </Link>

        <TabTrigger name="calendar" href="/calendar" resetOnFocus asChild>
          <TabButton icon="calendar-outline" label="Calendar" />
        </TabTrigger>
        <TabTrigger name="money" href="/money" resetOnFocus asChild>
          <TabButton icon="wallet-outline" label="Money" />
        </TabTrigger>
      </View>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  hidden: {
    display: 'none',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Platform.select({ ios: Spacing.four, default: Spacing.two }),
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    ...Platform.select({
      web: { boxShadow: '0 -2px 16px rgba(124,58,237,0.1)' },
      default: {
        shadowColor: Colors.brand,
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -2 },
        elevation: 8,
      },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabPill: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radii.pill,
  },
  tabPillActive: {
    backgroundColor: Colors.peachSoft,
  },
  tabLabel: {
    fontSize: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -30,
    ...Platform.select({
      web: { boxShadow: '0 6px 16px rgba(124,58,237,0.45)' },
      default: {
        shadowColor: Colors.brand,
        shadowOpacity: 0.45,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      },
    }),
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
