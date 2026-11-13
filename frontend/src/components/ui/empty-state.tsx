import { View } from 'react-native';

import { Colors, Spacing, themedStyles } from '@/constants/theme';
import { AppText } from './text';
import { useTheme } from '@/lib/theme-context';

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  useTheme();
  return (
    <View style={styles.container}>
      <AppText variant="bodyBold" style={styles.title}>
        {title}
      </AppText>
      {hint ? (
        <AppText variant="small" color={Colors.textMuted} style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  container: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
}));
