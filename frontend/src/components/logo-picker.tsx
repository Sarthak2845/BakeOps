import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing, themedStyles } from '@/constants/theme';
import { pickLogo, uploadLogo } from '@/lib/cloudinary';
import { useTheme } from '@/lib/theme-context';

/**
 * Shop logo circle: tap to pick a photo, crop square, upload to Cloudinary.
 * `onChange` receives the uploaded URL (or null on Remove); if it throws, the
 * previous logo is restored. Used by Register (keeps the URL until submit) and
 * by Setup/Profile (saves straight away).
 */
export function LogoPicker({
  value,
  onChange,
  hint = 'Tap the circle to add one. Square images look best.',
  optional = false,
}: {
  value: string | null;
  onChange: (url: string | null) => Promise<void> | void;
  hint?: string;
  optional?: boolean;
}) {
  useTheme();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = preview ?? value;

  async function change() {
    if (busy) return;
    let asset;
    try {
      asset = await pickLogo();
    } catch (err) {
      toast.fromError(err, 'Couldn’t use that image');
      return;
    }
    if (!asset) return;

    setPreview(asset.uri); // instant local preview while uploading
    setBusy(true);
    try {
      const url = await uploadLogo(asset);
      await onChange(url);
    } catch (err) {
      toast.fromError(err, 'Logo not saved');
    } finally {
      setPreview(null);
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onChange(null);
    } catch (err) {
      toast.fromError(err, 'Couldn’t remove the logo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.circle, shown ? styles.circleFilled : null]}
        onPress={change}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={shown ? 'Change shop logo' : 'Add shop logo'}>
        {shown ? (
          <Image source={{ uri: shown }} style={styles.image} contentFit="cover" />
        ) : (
          <AppText variant="bodyBold" color={Colors.brand}>
            + LOGO
          </AppText>
        )}
        {busy ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={Colors.white} />
          </View>
        ) : null}
      </Pressable>
      <View style={styles.text}>
        <AppText variant="bodyBold">
          Shop logo{' '}
          {optional ? (
            <AppText variant="small" color={Colors.textMuted}>
              (optional)
            </AppText>
          ) : null}
        </AppText>
        <AppText variant="small" color={Colors.textMuted}>
          {busy ? 'Uploading…' : shown ? 'Shown on your receipts and invoices' : hint}
        </AppText>
        {shown && !busy ? (
          <View style={styles.links}>
            <Pressable onPress={change} hitSlop={6}>
              <AppText variant="bodyBold" color={Colors.brand}>
                Change
              </AppText>
            </Pressable>
            <Pressable onPress={remove} hitSlop={6}>
              <AppText variant="bodyBold" color={Colors.textMuted}>
                Remove
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  circle: {
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
  circleFilled: {
    borderStyle: 'solid',
    borderColor: Colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(23, 17, 35, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
  links: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
}));
