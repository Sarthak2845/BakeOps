import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandGradient, Colors, Radii, Spacing } from '@/constants/theme';

export type CardProps = ViewProps & {
  tone?: 'card' | 'brand' | 'muted' | 'successSoft';
  padded?: boolean;
  elevated?: boolean;
};

export function Card({ style, tone = 'card', padded = true, elevated, children, ...rest }: CardProps) {
  const shadow = elevated ?? tone === 'card';

  if (tone === 'brand') {
    return (
      <LinearGradient
        colors={BrandGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, padded && styles.padded, shadow && styles.shadow, style]}
        {...rest}>
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        { backgroundColor: toneColor(tone) },
        shadow && styles.shadow,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

function toneColor(tone: NonNullable<CardProps['tone']>) {
  switch (tone) {
    case 'muted':
      return Colors.backgroundMuted;
    case 'successSoft':
      return Colors.successSoft;
    default:
      return Colors.card;
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.lg,
  },
  padded: {
    padding: Spacing.three,
  },
  shadow: Platform.select({
    web: { boxShadow: '0 4px 20px rgba(23, 17, 35, 0.08)' },
    default: {
      shadowColor: '#171123',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
  }),
});
