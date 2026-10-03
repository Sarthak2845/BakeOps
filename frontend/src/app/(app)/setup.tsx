import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { ApiError, businessApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const CATEGORIES = ['Bakery', 'Tiffin', 'Tailoring', 'Other'];

export default function SetupScreen() {
  const { business, setBusiness, completeSetup } = useAuth();
  const [shopName, setShopName] = useState(business?.name ?? '');
  const [category, setCategory] = useState(business?.category ?? 'Bakery');
  const [phone, setPhone] = useState(business?.phone ?? '');
  const [gstOn, setGstOn] = useState(!!business?.gstin);
  const [gstin, setGstin] = useState(business?.gstin ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function finish() {
    setSubmitting(true);
    try {
      const { business: updated } = await businessApi.updateMe({
        name: shopName.trim() || undefined,
        category,
        phone: phone.trim() || undefined,
        gstin: gstOn ? gstin.trim() || undefined : undefined,
      });
      setBusiness(updated);
      completeSetup();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Could not save', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.progress}>
        <View style={[styles.progressSeg, styles.progressFilled]} />
        <View style={[styles.progressSeg, styles.progressFilled]} />
      </View>

      <View style={styles.header}>
        <AppText variant="eyebrow">Step 2 of 2</AppText>
        <AppText variant="h1">Your shop, on every receipt</AppText>
        <AppText variant="body" color={Colors.textMuted}>
          This is what customers see when you send them a bill.
        </AppText>
      </View>

      <Pressable
        style={styles.logo}
        onPress={() => Alert.alert('Logo upload', 'Coming soon — you can add this later from Settings.')}>
        <AppText variant="bodyBold" color={Colors.brand}>
          + LOGO
        </AppText>
      </Pressable>

      <View style={styles.form}>
        <TextField label="Shop name" value={shopName} onChangeText={setShopName} />

        <View style={styles.field}>
          <AppText variant="bodyMedium">What do you make?</AppText>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, active && styles.chipActive]}>
                  <AppText variant="bodyBold" color={active ? Colors.white : Colors.text}>
                    {c}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label="Phone shown to customers"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <View style={styles.gstRow}>
          <View style={styles.gstText}>
            <AppText variant="bodyBold">Add GST to bills</AppText>
            <AppText variant="small" color={Colors.textMuted}>
              {gstOn ? 'On — enter your GSTIN below' : 'Off — no GSTIN needed'}
            </AppText>
          </View>
          <Switch value={gstOn} onValueChange={setGstOn} trackColor={{ true: Colors.brand }} />
        </View>

        {gstOn ? <TextField label="GSTIN" value={gstin} onChangeText={setGstin} autoCapitalize="characters" /> : null}

        {business ? (
          <View style={styles.linkCard}>
            <AppText variant="eyebrow">Your receipt link</AppText>
            <AppText variant="bodyBold">/r/{business.slug}</AppText>
          </View>
        ) : null}
      </View>

      <Button label="Continue" onPress={finish} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.backgroundMuted,
  },
  progressFilled: {
    backgroundColor: Colors.accent,
  },
  header: {
    gap: Spacing.one,
  },
  logo: {
    alignSelf: 'flex-start',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Colors.accentSoft,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.peachSoft,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one + 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  chip: {
    paddingVertical: Spacing.two - 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radii.md,
    padding: Spacing.three,
  },
  gstText: {
    flex: 1,
    gap: 2,
  },
  linkCard: {
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.md,
    padding: Spacing.three,
    gap: 4,
  },
});
