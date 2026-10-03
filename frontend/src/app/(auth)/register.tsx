import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = businessName.trim() && ownerName.trim() && email.trim() && password.length >= 8;

  async function onSubmit() {
    if (!canSubmit) return;
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
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Could not create account', message);
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
        <TextField label="Shop name" placeholder="Sunita's Cake Studio" value={businessName} onChangeText={setBusinessName} />
        <TextField label="Your name" placeholder="Sunita Sharma" value={ownerName} onChangeText={setOwnerName} />
        <TextField
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField label="Password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry />
        <TextField
          label="Phone (optional)"
          placeholder="+91 98220 41556"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <Button label="Continue" onPress={onSubmit} disabled={!canSubmit} loading={submitting} />

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
