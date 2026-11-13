import { Platform, StyleSheet } from 'react-native';

// BakeOps: bold & playful — vivid gradient brand, punchy multi-color status
// tags, white cards with real shadow on a soft lavender ground. A light and a
// dark palette with the same keys; `Colors` always reads the active one.
const LightColors = {
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
};

export type Palette = { [K in keyof typeof LightColors]: string };

const DarkColors: Palette = {
  background: '#0F0B1A',
  backgroundMuted: '#262040',
  card: '#1B1530',
  border: 'rgba(255, 255, 255, 0.10)',

  text: '#F3F0FA',
  textMuted: '#A7A2B8',
  textOnDark: '#FFFFFF',

  brand: '#8B5CF6',
  brandDark: '#C4B5FD',
  accent: '#F472B6',
  accentSoft: '#FB923C',

  success: '#22C55E',
  successSoft: '#12321F',
  successSoftText: '#86EFAC',

  peachSoft: '#3A1830',
  peachSoftText: '#F9A8D4',

  neutralPill: '#2E2845',
  neutralPillText: '#D1D5DB',

  outline: '#4B4563',
  outlineText: '#C7C2D6',

  danger: '#F87171',
  dangerSoft: '#3B1418',
  dangerSoftText: '#FCA5A5',

  info: '#60A5FA',
  warning: '#FBBF24',
  warningSoft: '#3A2A0A',

  white: '#FFFFFF',
};

export type ColorScheme = 'light' | 'dark';

const PALETTES: Record<ColorScheme, Palette> = { light: LightColors, dark: DarkColors };

let activeScheme: ColorScheme = 'light';

/** Called by ThemeProvider (lib/theme-context.tsx) before the app renders. */
export function setActiveColorScheme(scheme: ColorScheme) {
  activeScheme = scheme;
}

export function getActiveColorScheme(): ColorScheme {
  return activeScheme;
}

/** The active palette. Read colors at render time (not in module-level constants) so they follow the theme. */
export const Colors = Object.defineProperties(
  {} as Palette,
  Object.fromEntries(
    (Object.keys(LightColors) as (keyof Palette)[]).map((key) => [
      key,
      { enumerable: true, get: () => PALETTES[activeScheme][key] },
    ])
  )
);

/**
 * Drop-in for StyleSheet.create whose styles follow the active color scheme:
 * `factory` runs once per scheme (reading `Colors`), and `styles.x` returns the
 * current scheme's version.
 */
export function themedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: () => T & StyleSheet.NamedStyles<any>
): T {
  const cache: Partial<Record<ColorScheme, T>> = {};
  const current = (): T => {
    const scheme = activeScheme;
    if (!cache[scheme]) cache[scheme] = StyleSheet.create(factory());
    return cache[scheme]!;
  };
  return new Proxy({} as T, {
    get: (_target, key) => current()[key as keyof T],
    has: (_target, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_target, key) => ({
      enumerable: true,
      configurable: true,
      value: current()[key as keyof T],
    }),
  });
}

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
