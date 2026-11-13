import { View } from 'react-native';

import { Colors, Radii, Spacing, themedStyles } from '@/constants/theme';
import { AppText } from './text';
import { useTheme } from '@/lib/theme-context';

export function StatTile({ value, label }: { value: string; label: string }) {
  useTheme();
  return (
    <View style={styles.tile}>
      <AppText variant="h2" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="small" color={Colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => ({
  tile: {
    flex: 1,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radii.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    gap: 2,
  },
}));
