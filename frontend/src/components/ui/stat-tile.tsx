import { StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { AppText } from './text';

export function StatTile({ value, label }: { value: string; label: string }) {
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

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radii.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    gap: 2,
  },
});
