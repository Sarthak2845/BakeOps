import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';
import { Image } from 'expo-image';

import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/form-error';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing, themedStyles } from '@/constants/theme';
import { businessApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { pickLogo, uploadLogo } from '@/lib/cloudinary';
import { getErrorMessage, getFieldErrors, type FieldErrors } from '@/lib/errors';
import type { Business } from '@/lib/types';
import { hasErrors, validateLength, validatePhone } from '@/lib/validators';
import { useTheme } from '@/lib/theme-context';

// 15-character Indian GSTIN: 2-digit state code, PAN, entity code, 'Z', checksum.
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const CATEGORIES = ['Bakery', 'Tiffin', 'Tailoring', 'Other'];

/**
 * Logo + shop details shown on receipts. Used by first-run Setup and by
 * Shop settings. The logo saves as soon as it's uploaded; the rest saves on submit.
 */
export function ShopDetailsForm({ submitLabel, onSaved }: { submitLabel: string; onSaved: (business: Business) => void }) {
  useTheme();
  const { business, setBusiness } = useAuth();
  const toast = useToast();

  const [shopName, setShopName] = useState(business?.name ?? '');
  const [category, setCategory] = useState(business?.category ?? 'Bakery');
  const [phone, setPhone] = useState(business?.phone ?? '');
  const [address, setAddress] = useState(business?.address ?? '');
  const [gstOn, setGstOn] = useState(!!business?.gstin);
  const [gstin, setGstin] = useState(business?.gstin ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(business?.logoUrl ?? null);
  const [logoBusy, setLogoBusy] = useState(false);

  function onChange(field: string, setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setErrors((e) => ({ ...e, [field]: '' }));
    };
  }

  async function changeLogo() {
    if (logoBusy) return;
    let asset;
    try {
      asset = await pickLogo();
    } catch (err) {
      toast.fromError(err, 'Couldn’t use that image');
      return;
    }
    if (!asset) return;

    const previous = logoUrl;
    setLogoUrl(asset.uri); // instant local preview while uploading
    setLogoBusy(true);
    try {
      const url = await uploadLogo(asset);
      const { business: updated } = await businessApi.updateMe({ logoUrl: url });
      setBusiness(updated);
      setLogoUrl(updated.logoUrl);
      toast.success('Logo saved — it will appear on new receipts.');
    } catch (err) {
      setLogoUrl(previous);
      toast.fromError(err, 'Logo not saved');
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    const previous = logoUrl;
    setLogoUrl(null);
    setLogoBusy(true);
    try {
      const { business: updated } = await businessApi.updateMe({ logoUrl: null });
      setBusiness(updated);
    } catch (err) {
      setLogoUrl(previous);
      toast.fromError(err, 'Couldn’t remove the logo');
    } finally {
      setLogoBusy(false);
    }
  }

  async function submit() {
    const gst = gstin.trim().toUpperCase();
    const next = {
      name: shopName.trim() ? (validateLength(shopName, 'Shop name', { min: 2, max: 120 }) ?? '') : '',
      phone: validatePhone(phone, { required: false }) ?? '',
      address: validateLength(address, 'Address', { max: 300 }) ?? '',
      gstin: !gstOn
        ? ''
        : !gst
          ? 'Enter your GSTIN, or turn off GST'
          : !GSTIN_RE.test(gst)
            ? 'Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5)'
            : '',
    };
    setErrors(next);
    setFormError(null);
    if (hasErrors(next)) return;

    setSubmitting(true);
    try {
      const { business: updated } = await businessApi.updateMe({
        name: shopName.trim() || undefined,
        category,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstOn ? gst : undefined,
      });
      setBusiness(updated);
      onSaved(updated);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, 'Could not save your shop details. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <View style={styles.logoRow}>
        <Pressable
          style={[styles.logo, logoUrl ? styles.logoFilled : null]}
          onPress={changeLogo}
          disabled={logoBusy}
          accessibilityRole="button"
          accessibilityLabel={logoUrl ? 'Change shop logo' : 'Add shop logo'}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} contentFit="cover" />
          ) : (
            <AppText variant="bodyBold" color={Colors.brand}>
              + LOGO
            </AppText>
          )}
          {logoBusy ? (
            <View style={styles.logoOverlay}>
              <ActivityIndicator color={Colors.white} />
            </View>
          ) : null}
        </Pressable>
        <View style={styles.logoActions}>
          <AppText variant="bodyBold">Shop logo</AppText>
          <AppText variant="small" color={Colors.textMuted}>
            {logoBusy ? 'Uploading…' : logoUrl ? 'Shown on your receipts and invoices' : 'Tap the circle to add one. Square images look best.'}
          </AppText>
          {logoUrl && !logoBusy ? (
            <View style={styles.logoLinks}>
              <Pressable onPress={changeLogo} hitSlop={6}>
                <AppText variant="bodyBold" color={Colors.brand}>
                  Change
                </AppText>
              </Pressable>
              <Pressable onPress={removeLogo} hitSlop={6}>
                <AppText variant="bodyBold" color={Colors.textMuted}>
                  Remove
                </AppText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.form}>
        <TextField label="Shop name" value={shopName} onChangeText={onChange('name', setShopName)} error={errors.name} />

        <View style={styles.field}>
          <AppText variant="bodyMedium">What do you make?</AppText>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, active && styles.chipActive]}>
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
          onChangeText={onChange('phone', setPhone)}
          keyboardType="phone-pad"
          error={errors.phone}
        />

        <TextField
          label="Address (optional)"
          placeholder="Shop no. 4, MG Road, Pune"
          value={address}
          onChangeText={onChange('address', setAddress)}
          error={errors.address}
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

        {gstOn ? (
          <TextField
            label="GSTIN"
            value={gstin}
            onChangeText={onChange('gstin', setGstin)}
            autoCapitalize="characters"
            error={errors.gstin}
          />
        ) : null}

        {business ? (
          <View style={styles.linkCard}>
            <AppText variant="eyebrow">Your receipt link</AppText>
            <AppText variant="bodyBold">/r/{business.slug}</AppText>
          </View>
        ) : null}
      </View>

      <FormError message={formError} />
      <Button label={submitLabel} onPress={submit} loading={submitting} disabled={logoBusy} />
    </>
  );
}

const styles = themedStyles(() => ({
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  logo: {
    overflow: 'hidden',
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
  logoFilled: {
    borderStyle: 'solid',
    borderColor: Colors.border,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(23, 17, 35, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoActions: {
    flex: 1,
    gap: Spacing.one,
  },
  logoLinks: {
    flexDirection: 'row',
    gap: Spacing.three,
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
}));
