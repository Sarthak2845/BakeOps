import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ShopDetailsForm } from '@/components/shop-details-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
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

      <AppText variant="h2">Shop details</AppText>
      <ShopDetailsForm submitLabel="Save changes" onSaved={() => toast.success('Shop details saved')} />

      <Button label="Log out" variant="outline" onPress={() => void logout()} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  logout: {
    marginTop: Spacing.three,
  },
});
