import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { AppText } from './text';

/**
 * Inline error banner: a form-level error above the submit button, or a
 * "couldn't load" notice at the top of a screen (pass `onRetry`).
 */
export function FormError({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={Colors.dangerSoftText} />
      <AppText variant="body" color={Colors.dangerSoftText} style={styles.text}>
        {message}
      </AppText>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <AppText variant="bodyBold" color={Colors.dangerSoftText}>
            Retry
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  text: {
    flex: 1,
  },
});
