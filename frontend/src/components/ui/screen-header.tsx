import { View } from 'react-native';

import { Spacing, themedStyles } from '@/constants/theme';
import { AppText } from './text';
import { useTheme } from '@/lib/theme-context';

export function ScreenHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
        <AppText variant="h1">{title}</AppText>
      </View>
      {right}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  textCol: {
    gap: 4,
  },
}));
