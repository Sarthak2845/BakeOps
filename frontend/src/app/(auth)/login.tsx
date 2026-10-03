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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim() && password.length > 0;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Could not log in', message);
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
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField label="Password" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry />
      </View>

      <Button label="Log in" onPress={onSubmit} disabled={!canSubmit} loading={submitting} />

      <Link href="/(auth)/register" style={styles.link}>
        <AppText variant="body" color={Colors.textMuted}>
          New here? <AppText variant="bodyBold">Create an account</AppText>
        </AppText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
