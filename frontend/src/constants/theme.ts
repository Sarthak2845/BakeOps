import { Platform } from 'react-native';

// BakeOps: bold & playful — vivid gradient brand, punchy multi-color status
// tags, white cards with real shadow on a soft lavender ground. One fixed
// look; does not follow the system light/dark scheme.
export const Colors = {
  background: '#F7F6FD',
  backgroundMuted: '#F1ECFF',
  card: '#FFFFFF',
  border: 'rgba(23, 17, 35, 0.08)',

  text: '#171123',
  textMuted: '#6B7280',
  textOnDark: '#FFFFFF',

  brand: '#7C3AED',
  brandDark: '#5B21B6',
  accent: '#EC4899',
  accentSoft: '#FB923C',

  success: '#22C55E',
  successSoft: '#DCFCE7',
  successSoftText: '#166534',

  peachSoft: '#FCE7F3',
  peachSoftText: '#9D174D',

  neutralPill: '#E5E7EB',
  neutralPillText: '#374151',

  outline: '#D1D5DB',
  outlineText: '#4B5563',

  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  dangerSoftText: '#B91C1C',

  info: '#3B82F6',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',

  white: '#FFFFFF',
} as const;

export const BrandGradient = ['#7C3AED', '#EC4899'] as const;

export type ColorName = keyof typeof Colors;

export const Fonts = {
  display: 'Fredoka_700Bold',
  displayMedium: 'Fredoka_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
} as const;

export const FontSizes = {
  eyebrow: 11,
  small: 12.5,
  body: 13.5,
  bodyLarge: 15.5,
  h2: 20,
  h1: 27,
} as const;

export const Radii = {
  pill: 999,
  sm: 14,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 480;
