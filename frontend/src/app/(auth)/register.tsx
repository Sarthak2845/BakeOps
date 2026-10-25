import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage, getFieldErrors, type FieldErrors } from '@/lib/errors';
import { hasErrors, validateEmail, validateLength, validatePhone } from '@/lib/validators';

function validatePassword(password: string): string {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password must be at most 72 characters';
  return '';
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onChange(field: string, setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setErrors((e) => ({ ...e, [field]: '' }));
    };
  }

  async function onSubmit() {
    const next = {
      businessName: validateLength(businessName, 'Shop name', { min: 2, max: 120 }) ?? '',
      ownerName: validateLength(ownerName, 'Your name', { min: 2, max: 120 }) ?? '',
      email: validateEmail(email) ?? '',
      password: validatePassword(password),
      phone: validatePhone(phone, { required: false }) ?? '',
    };
    setErrors(next);
    setFormError(null);
    if (hasErrors(next)) return;

    setSubmitting(true);
    try {
      await register({
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      // AuthProvider flips `needsSetup`; the (app) group redirects to /setup itself
      // once its stack mounts (see (app)/_layout.tsx) — replacing here would race
      // the guard-triggered mount and get silently dropped.
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, 'Could not create your account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Get started</AppText>
        <AppText variant="h1">Set up your shop</AppText>
        <AppText variant="body" color={Colors.textMuted}>
          Takes less than a minute — you can fill in the rest later.
        </AppText>
      </View>

      <View style={styles.form}>
        <TextField
          label="Shop name"
          placeholder="Sunita's Cake Studio"
          value={businessName}
          onChangeText={onChange('businessName', setBusinessName)}
          error={errors.businessName}
        />
        <TextField
          label="Your name"
          placeholder="Sunita Sharma"
          value={ownerName}
          onChangeText={onChange('ownerName', setOwnerName)}
          error={errors.ownerName}
        />
        <TextField
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={onChange('email', setEmail)}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />
        <TextField
          label="Password"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={onChange('password', setPassword)}
          secureTextEntry
          error={errors.password}
        />
        <TextField
          label="Phone (optional)"
          placeholder="+91 98220 41556"
          value={phone}
          onChangeText={onChange('phone', setPhone)}
          keyboardType="phone-pad"
          error={errors.phone}
        />
      </View>

      <FormError message={formError} />
      <Button label="Continue" onPress={onSubmit} loading={submitting} />

      <Link href="/(auth)/login" style={styles.link}>
        <AppText variant="body" color={Colors.textMuted}>
          Already have an account? <AppText variant="bodyBold">Log in</AppText>
        </AppText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
  link: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});
