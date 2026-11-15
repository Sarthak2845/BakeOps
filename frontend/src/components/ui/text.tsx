import { Text, type TextProps } from 'react-native';

import { Colors, Fonts, FontSizes, themedStyles } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

export type AppTextProps = TextProps & {
  variant?: 'display' | 'h1' | 'h2' | 'body' | 'bodyMedium' | 'bodyBold' | 'small' | 'eyebrow';
  color?: string;
};

export function AppText({ style, variant = 'body', color, ...rest }: AppTextProps) {
  useTheme();
  return <Text style={[styles.base, styles[variant], color ? { color } : null, style]} {...rest} />;
}

const styles = themedStyles(() => ({
  base: {
    color: Colors.text,
    fontFamily: Fonts.body,
  },
  display: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.h1,
    lineHeight: FontSizes.h1 * 1.15,
  },
  h1: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.h1,
    lineHeight: FontSizes.h1 * 1.15,
  },
  h2: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.h2,
    lineHeight: FontSizes.h2 * 1.2,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.body,
    lineHeight: FontSizes.body * 1.4,
  },
  bodyMedium: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.body,
    lineHeight: FontSizes.body * 1.4,
  },
  bodyBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.body,
    lineHeight: FontSizes.body * 1.4,
  },
  small: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.small,
    lineHeight: FontSizes.small * 1.4,
  },
  eyebrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.eyebrow,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
}));
