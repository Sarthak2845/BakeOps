import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandGradient, Colors, Fonts, FontSizes, Radii, Spacing, themedStyles } from '@/constants/theme';
import { AppText } from './text';
import { useTheme } from '@/lib/theme-context';

export type ButtonVariant = 'primary' | 'success' | 'outline' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', loading, fullWidth = true, disabled, style, ...rest }: ButtonProps) {
  useTheme();
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        !isPrimary && variantStyle(variant),
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}>
      {isPrimary ? (
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? Colors.text : Colors.white} />
      ) : (
        <AppText
          variant="bodyBold"
          style={[styles.label, { color: textColor(variant) }]}
          // One line, shrinking a little if needed, so a long label never wraps out of view.
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

function variantStyle(variant: ButtonVariant) {
  switch (variant) {
    case 'success':
      return { backgroundColor: Colors.success };
    case 'outline':
      return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.border };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    default:
      return {};
  }
}

function textColor(variant: ButtonVariant) {
  return variant === 'outline' || variant === 'ghost' ? Colors.text : Colors.white;
}

const styles = themedStyles(() => ({
  base: {
    borderRadius: Radii.pill,
    paddingVertical: Spacing.two + 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.bodyLarge,
  },
}));
