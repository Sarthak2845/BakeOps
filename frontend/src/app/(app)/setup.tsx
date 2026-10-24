import { StyleSheet, View } from 'react-native';

import { ShopDetailsForm } from '@/components/shop-details-form';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

export default function SetupScreen() {
  const { completeSetup } = useAuth();

  return (
    <Screen>
      <View style={styles.progress}>
        <View style={[styles.progressSeg, styles.progressFilled]} />
        <View style={[styles.progressSeg, styles.progressFilled]} />
      </View>

      <View style={styles.header}>
        <AppText variant="eyebrow">Step 2 of 2</AppText>
        <AppText variant="h1">Your shop, on every receipt</AppText>
        <AppText variant="body" color={Colors.textMuted}>
          This is what customers see when you send them a bill. You can change it any time from the Profile tab.
        </AppText>
      </View>

      <ShopDetailsForm submitLabel="Continue" onSaved={() => completeSetup()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.backgroundMuted,
  },
  progressFilled: {
    backgroundColor: Colors.accent,
  },
  header: {
    gap: Spacing.one,
  },
});
