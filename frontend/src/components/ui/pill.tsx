import { View, type ViewProps } from 'react-native';

import { Colors, Fonts, FontSizes, Radii, Spacing, themedStyles } from '@/constants/theme';
import { AppText } from './text';
import { useTheme } from '@/lib/theme-context';

export type PillTone = 'brand' | 'accentSoft' | 'success' | 'peachSoft' | 'neutral' | 'outline' | 'danger' | 'info';

export type PillProps = ViewProps & {
  label: string;
  tone?: PillTone;
  size?: 'sm' | 'md';
};

const toneStyles = (): Record<PillTone, { bg: string; text: string; border?: string }> => ({
  brand: { bg: Colors.brand, text: Colors.white },
  accentSoft: { bg: Colors.accentSoft, text: Colors.white },
  success: { bg: Colors.success, text: Colors.white },
  peachSoft: { bg: Colors.peachSoft, text: Colors.peachSoftText },
  neutral: { bg: Colors.neutralPill, text: Colors.neutralPillText },
  outline: { bg: 'transparent', text: Colors.outlineText, border: Colors.outline },
  danger: { bg: Colors.dangerSoft, text: Colors.dangerSoftText },
  info: { bg: Colors.info, text: Colors.white },
});

export function Pill({ label, tone = 'neutral', size = 'md', style, ...rest }: PillProps) {
  useTheme();
  const t = toneStyles()[tone];
  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: t.bg, borderColor: t.border ?? 'transparent', borderWidth: t.border ? 1 : 0 },
        style,
      ]}
      {...rest}>
      <AppText variant="bodyBold" style={[styles.label, size === 'sm' && styles.labelSm, { color: t.text }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => ({
  base: {
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  md: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
  },
  sm: {
    paddingVertical: Spacing.half + 2,
    paddingHorizontal: Spacing.two + 2,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.small,
  },
  labelSm: {
    fontSize: 11,
  },
}));
