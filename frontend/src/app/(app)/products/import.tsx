import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing, themedStyles } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import { MAX_IMPORT_PRODUCTS, linesFromPastOrders, parseProductList } from '@/lib/product-import';
import { useBulkCreateProducts, useOrders, useProducts } from '@/lib/queries';
import { useTheme } from '@/lib/theme-context';

const EXAMPLE = `Black Forest Cake, 950
Chocolate Truffle 1kg - ₹1,200
Plum Cake 800/kg
Brownie = Rs. 60/-`;

const PREVIEW_LIMIT = 8;

export default function ImportProductsScreen() {
  useTheme();
  const toast = useToast();
  const [text, setText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const ordersQuery = useOrders();
  const productsQuery = useProducts('');
  const bulkCreate = useBulkCreateProducts();

  const { products, failures } = useMemo(() => parseProductList(text), [text]);
  const tooMany = products.length > MAX_IMPORT_PRODUCTS;

  function fillFromOrders() {
    setFormError(null);
    if (ordersQuery.isError) {
      setFormError(`Couldn’t load your past orders. ${getErrorMessage(ordersQuery.error)}`);
      return;
    }
    if (!ordersQuery.data || !productsQuery.data) {
      toast.show({ message: 'Still loading your orders. Try again in a moment.' });
      return;
    }
    const lines = linesFromPastOrders(ordersQuery.data, productsQuery.data);
    if (lines.length === 0) {
      toast.show({ message: 'No new items found in your past orders.' });
      return;
    }
    setText((current) => [current.trim(), ...lines].filter(Boolean).join('\n'));
  }

  async function runImport() {
    setFormError(null);
    try {
      const { created, skipped } = await bulkCreate.mutateAsync(products);
      if (created === 0) {
        setFormError('All of these are already in your products.');
        return;
      }
      const note = skipped.length > 0 ? ` ${skipped.length} already saved, skipped.` : '';
      toast.success(`${created} product${created === 1 ? '' : 's'} added.${note}`);
      router.back();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not import your products. Please try again.'));
    }
  }

  return (
    <Screen edges={['top', 'bottom']} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </Pressable>
        <View>
          <AppText variant="eyebrow">Products</AppText>
          <AppText variant="h2">Add many at once</AppText>
        </View>
      </View>

      <AppText variant="body" color={Colors.textMuted}>
        Paste your menu from Excel, Google Sheets, WhatsApp or Notes, one item per line: the name, then the price.
      </AppText>

      <TextField
        multiline
        placeholder={EXAMPLE}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setFormError(null);
        }}
        autoCapitalize="sentences"
        style={styles.input}
      />

      <Button label="Fill from past orders" variant="outline" onPress={fillFromOrders} />

      {failures.length > 0 ? (
        <Card style={styles.failures}>
          <AppText variant="bodyBold" color={Colors.dangerSoftText}>
            {failures.length} line{failures.length === 1 ? '' : 's'} won’t be imported
          </AppText>
          {failures.slice(0, PREVIEW_LIMIT).map((f) => (
            <AppText key={f.line} variant="small" color={Colors.dangerSoftText}>
              Line {f.line}: {f.reason} — {f.text}
            </AppText>
          ))}
          {failures.length > PREVIEW_LIMIT ? (
            <AppText variant="small" color={Colors.dangerSoftText}>
              and {failures.length - PREVIEW_LIMIT} more
            </AppText>
          ) : null}
        </Card>
      ) : null}

      {products.length > 0 ? (
        <Card style={styles.preview}>
          <AppText variant="bodyBold">Ready to add: {products.length}</AppText>
          {products.slice(0, PREVIEW_LIMIT).map((p) => (
            <View key={p.name} style={styles.previewRow}>
              <AppText variant="body" style={styles.flex}>
                {p.name}
              </AppText>
              <AppText variant="bodyBold">
                {formatMoney(p.unitPrice)}
                {p.unit ? ` / ${p.unit}` : ''}
              </AppText>
            </View>
          ))}
          {products.length > PREVIEW_LIMIT ? (
            <AppText variant="small" color={Colors.textMuted}>
              and {products.length - PREVIEW_LIMIT} more
            </AppText>
          ) : null}
        </Card>
      ) : null}

      <FormError message={tooMany ? `You can add up to ${MAX_IMPORT_PRODUCTS} products at a time.` : formError} />
      <Button
        label={products.length > 0 ? `Add ${products.length} product${products.length === 1 ? '' : 's'}` : 'Add products'}
        onPress={runImport}
        disabled={products.length === 0 || tooMany}
        loading={bulkCreate.isPending}
      />
    </Screen>
  );
}

const styles = themedStyles(() => ({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 160,
    borderRadius: Radii.md,
    textAlignVertical: 'top',
  },
  failures: {
    gap: Spacing.one,
    backgroundColor: Colors.dangerSoft,
  },
  preview: {
    gap: Spacing.one + 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
}));
