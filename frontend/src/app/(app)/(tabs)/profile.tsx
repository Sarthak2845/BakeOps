import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ReminderSettingsCard } from '@/components/reminder-settings';
import { ShopDetailsForm } from '@/components/shop-details-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing, themedStyles } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { type ThemePreference, useTheme } from '@/lib/theme-context';

const APPEARANCE: { value: ThemePreference; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function ProfileScreen() {
  const { preference, setPreference } = useTheme();
  const { user, business, logout } = useAuth();
  const toast = useToast();

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Profile</AppText>
        <AppText variant="h1">Your account</AppText>
      </View>

      <Card style={styles.userCard}>
        {business?.logoUrl ? (
          <Image source={{ uri: business.logoUrl }} style={styles.avatar} contentFit="cover" accessibilityLabel="Shop logo" />
        ) : (
          <View style={styles.avatar}>
            <AppText variant="h2" color={Colors.brand}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </AppText>
          </View>
        )}
        <View style={styles.userInfo}>
          <AppText variant="bodyBold">{user?.name}</AppText>
          <AppText variant="small" color={Colors.textMuted}>
            {user?.email}
          </AppText>
          <AppText variant="small" color={Colors.textMuted}>
            {business?.name}
          </AppText>
        </View>
        {user?.role ? <Pill tone="peachSoft" size="sm" label={user.role === 'OWNER' ? 'Owner' : user.role} /> : null}
      </Card>

      <Pressable onPress={() => router.push('/products')} accessibilityRole="button">
        <Card style={styles.linkRow}>
          <Ionicons name="pricetags-outline" size={20} color={Colors.brand} />
          <View style={styles.userInfo}>
            <AppText variant="bodyBold">Products</AppText>
            <AppText variant="small" color={Colors.textMuted}>
              Your menu and prices, suggested when you create orders
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </Card>
      </Pressable>

      <Card style={styles.appearanceCard}>
        <View style={styles.appearanceHeader}>
          <Ionicons name="color-palette-outline" size={20} color={Colors.brand} />
          <AppText variant="bodyBold">Appearance</AppText>
        </View>
        <View style={styles.segment} accessibilityRole="radiogroup">
          {APPEARANCE.map((o) => {
            const active = preference === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => setPreference(o.value)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}>
                <Ionicons name={o.icon} size={16} color={active ? Colors.white : Colors.textMuted} />
                <AppText variant="bodyBold" color={active ? Colors.white : Colors.text}>
                  {o.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {preference === 'system' ? (
          <AppText variant="small" color={Colors.textMuted}>
            Follows your phone's light or dark setting.
          </AppText>
        ) : null}
      </Card>

      <ReminderSettingsCard />

      <AppText variant="h2">Shop details</AppText>
      <ShopDetailsForm submitLabel="Save changes" onSaved={() => toast.success('Shop details saved')} />

      <Button label="Log out" variant="outline" onPress={() => void logout()} style={styles.logout} />
    </Screen>
  );
}

const styles = themedStyles(() => ({
  header: {
    gap: 4,
    marginTop: Spacing.two,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  appearanceCard: {
    gap: Spacing.three,
  },
  appearanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  segment: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.backgroundMuted,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
  },
  segmentItemActive: {
    backgroundColor: Colors.brand,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  logout: {
    marginTop: Spacing.three,
  },
}));
