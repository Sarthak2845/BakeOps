import { useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Fonts, FontSizes, Radii, Spacing, themedStyles } from '@/constants/theme';
import { AppText } from './text';
import { useTheme } from '@/lib/theme-context';

export type TextFieldProps = TextInputProps & {
  label?: string;
  /** Shown under the input in red; also outlines the input. */
  error?: string | null;
};

// react-native-web renders TextInput as a plain <input>, which the browser's
// UA stylesheet sizes as content-box — padding then adds to width instead of
// being included in it, overflowing the parent. Force border-box on web only.
const webBoxSizingFix = Platform.OS === 'web' ? ({ boxSizing: 'border-box', width: '100%' } as object) : null;

export function TextField({ label, error, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <AppText variant="bodyMedium">{label}</AppText> : null}
      <TextInput
        style={[styles.input, webBoxSizingFix, focused && styles.inputFocused, error ? styles.inputError : null, style]}
        aria-invalid={error ? true : undefined}
        placeholderTextColor={Colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="small" color={Colors.dangerSoftText} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  container: {
    gap: Spacing.one + 2,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLarge,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: Colors.accent,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  error: {
    paddingHorizontal: Spacing.three,
  },
}));
