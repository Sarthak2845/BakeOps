import { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Spacing, themedStyles } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage, getFieldErrors, type FieldErrors } from '@/lib/errors';
import { hasErrors, validateEmail, validateRequired } from '@/lib/validators';
import { useTheme } from '@/lib/theme-context';

export default function LoginScreen() {
  useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit() {
    const next = {
      email: validateEmail(email) ?? '',
      password: validateRequired(password, 'Password') ?? '',
    };
    setErrors(next);
    setFormError(null);
    if (hasErrors(next)) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, 'Could not log in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Welcome back</AppText>
        <AppText variant="h1">Namaste!</AppText>
        <AppText variant="body" color={Colors.textMuted}>
          Log in to see today's orders.
        </AppText>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrors((e) => ({ ...e, email: '' }));
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />
        <TextField
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setErrors((e) => ({ ...e, password: '' }));
          }}
          secureTextEntry
          error={errors.password}
          onSubmitEditing={onSubmit}
        />
      </View>

      <FormError message={formError} />
      <Button label="Log in" onPress={onSubmit} loading={submitting} />

      <Link href="/(auth)/register" style={styles.link}>
        <AppText variant="body" color={Colors.textMuted}>
          New here? <AppText variant="bodyBold">Create an account</AppText>
        </AppText>
      </Link>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.six,
    marginBottom: Spacing.two,
    alignItems: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  link: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
}));
