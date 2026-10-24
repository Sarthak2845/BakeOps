import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { Button } from './button';
import { AppText } from './text';

/** Shown in place of content when a screen's data failed to load. */
export function ErrorState({
  error,
  title = 'Couldn’t load this',
  onRetry,
  retrying,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={32} color={Colors.danger} />
      <AppText variant="bodyBold" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="small" color={Colors.textMuted} style={styles.center}>
        {getErrorMessage(error)}
      </AppText>
      {onRetry ? (
        <Button label="Try again" variant="outline" fullWidth={false} onPress={onRetry} loading={retrying} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  center: {
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
