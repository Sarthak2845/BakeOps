import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, FontSizes, Fonts, Radii, Spacing } from '@/constants/theme';
import { AppText } from './text';

export type TextFieldProps = TextInputProps & {
  label?: string;
};

// react-native-web renders TextInput as a plain <input>, which the browser's
// UA stylesheet sizes as content-box — padding then adds to width instead of
// being included in it, overflowing the parent. Force border-box on web only.
const webBoxSizingFix = Platform.OS === 'web' ? ({ boxSizing: 'border-box', width: '100%' } as object) : null;

export function TextField({ label, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <AppText variant="bodyMedium">{label}</AppText> : null}
      <TextInput
        style={[styles.input, webBoxSizingFix, focused && styles.inputFocused, style]}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
});
