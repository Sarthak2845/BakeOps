import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Fonts, FontSizes, Radii, Spacing, themedStyles } from '@/constants/theme';
import { getErrorMessage, type FieldErrors } from '@/lib/errors';
import { formatMoney, toNumber } from '@/lib/format';
import { useCreateProduct, useOrders, useProducts } from '@/lib/queries';
import type { Product } from '@/lib/types';
import { validateMoney } from '@/lib/validators';
import { useTheme } from '@/lib/theme-context';

export interface OrderItemDraft {
  key: string;
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  unit?: string | null;
}

const QUICK_PICKS = 8;
const MAX_RESULTS = 6;

// react-native-web renders TextInput as a content-box <input>; keep it inside its box.
const webInputFix = Platform.OS === 'web' ? ({ boxSizing: 'border-box', minWidth: 0, outlineStyle: 'none' } as object) : null;

let nextKey = 1;
export function newItemKey(): string {
  return `item-${nextKey++}`;
}

function matches(name: string, query: string): boolean {
  const lower = name.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => lower.includes(word));
}

function lineTotal(item: OrderItemDraft): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
}

function formatQty(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function OrderItemsEditor({
  items,
  onChange,
  errors,
  onClearErrors,
  onFieldError,
}: {
  items: OrderItemDraft[];
  onChange: (items: OrderItemDraft[]) => void;
  /** Keyed "items" and "items.<index>.<field>", matching the API's error paths. */
  errors: FieldErrors;
  /** Called when items change in a way that makes the given (or all item) errors stale. */
  onClearErrors: (fields?: string[]) => void;
  onFieldError: (field: string, message: string) => void;
}) {
  useTheme();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const productsQuery = useProducts('');
  const ordersQuery = useOrders();
  const createProduct = useCreateProduct();
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  // Quick picks: the products ordered most often, then alphabetically.
  const quickPicks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of ordersQuery.data ?? []) {
      if (order.status === 'CANCELLED') continue;
      for (const item of order.items) {
        const key = item.description.trim().toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...products]
      .sort((a, b) => (counts.get(b.name.toLowerCase()) ?? 0) - (counts.get(a.name.toLowerCase()) ?? 0))
      .slice(0, QUICK_PICKS);
  }, [products, ordersQuery.data]);

  const search = query.trim();
  const results = useMemo(
    () => (search ? products.filter((p) => matches(p.name, search)).slice(0, MAX_RESULTS) : []),
    [products, search]
  );
  const exactMatch = products.some((p) => p.name.toLowerCase() === search.toLowerCase());
  const showResults = search.length > 0;

  const addedQty = (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    return item ? parseFloat(item.quantity) || 0 : 0;
  };

  function addProduct(product: Product) {
    const index = items.findIndex((i) => i.productId === product.id);
    if (index >= 0) {
      const qty = (parseFloat(items[index].quantity) || 0) + 1;
      onChange(items.map((item, i) => (i === index ? { ...item, quantity: formatQty(qty) } : item)));
      onClearErrors([`items.${index}.quantity`]);
    } else {
      onChange([
        ...items,
        {
          key: newItemKey(),
          productId: product.id,
          description: product.name,
          quantity: '1',
          unitPrice: formatQty(toNumber(product.unitPrice)),
          unit: product.unit,
        },
      ]);
    }
    onClearErrors(['items']);
    setQuery('');
  }

  function addCustom() {
    onChange([...items, { key: newItemKey(), description: search, quantity: '1', unitPrice: '' }]);
    onClearErrors(['items']);
    setQuery('');
  }

  function update(index: number, patch: Partial<OrderItemDraft>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    onClearErrors(Object.keys(patch).map((k) => `items.${index}.${k}`));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    // Row indexes shift, so per-row errors no longer line up.
    onClearErrors();
  }

  function step(index: number, delta: number) {
    const current = parseFloat(items[index].quantity) || 0;
    const next = Math.max(1, current + delta);
    update(index, { quantity: formatQty(next) });
  }

  async function saveAsProduct(index: number) {
    const item = items[index];
    const priceError = validateMoney(item.unitPrice, 'Price', { required: true });
    if (priceError) {
      onFieldError(`items.${index}.unitPrice`, priceError === 'Price is required' ? 'Enter a price to save this product' : priceError);
      return;
    }
    try {
      const { product } = await createProduct.mutateAsync({ name: item.description.trim(), unitPrice: parseFloat(item.unitPrice) });
      update(index, { productId: product.id, description: product.name });
      toast.success(`"${product.name}" saved to your products`);
    } catch (err) {
      toast.error(getErrorMessage(err), 'Product not saved');
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={[styles.searchInput, webInputFix]}
          placeholder={products.length > 0 ? 'Search your products to add' : 'Type an item to add'}
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          // Delayed so a tap on a result lands before the list closes.
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 200);
          }}
          onSubmitEditing={() => {
            if (results[0]) addProduct(results[0]);
            else if (search) addCustom();
          }}
          returnKeyType="done"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {showResults ? (
        <Card style={styles.results} padded={false}>
          {productsQuery.isError ? (
            <AppText variant="small" color={Colors.dangerSoftText} style={styles.resultsNote}>
              Couldn’t load your products. {getErrorMessage(productsQuery.error)}
            </AppText>
          ) : null}
          {results.map((p) => {
            const qty = addedQty(p.id);
            return (
              <Pressable key={p.id} style={styles.resultRow} onPress={() => addProduct(p)} accessibilityLabel={`Add ${p.name}`}>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">{p.name}</AppText>
                  <AppText variant="small" color={Colors.textMuted}>
                    {formatMoney(p.unitPrice)}
                    {p.unit ? ` / ${p.unit}` : ''}
                    {qty > 0 ? `  ·  ${formatQty(qty)} in order` : ''}
                  </AppText>
                </View>
                <View style={styles.addIcon}>
                  <Ionicons name="add" size={18} color={Colors.white} />
                </View>
              </Pressable>
            );
          })}
          {!exactMatch ? (
            <Pressable style={styles.resultRow} onPress={addCustom}>
              <Ionicons name="create-outline" size={18} color={Colors.brand} />
              <AppText variant="bodyBold" color={Colors.brand} style={styles.flex}>
                Add "{search}" as a one-off item
              </AppText>
            </Pressable>
          ) : null}
        </Card>
      ) : quickPicks.length > 0 ? (
        <View style={styles.quickPicks}>
          {quickPicks.map((p) => {
            const qty = addedQty(p.id);
            return (
              <Pressable key={p.id} onPress={() => addProduct(p)} style={[styles.pick, qty > 0 && styles.pickActive]}>
                <AppText variant="small" style={styles.pickName} numberOfLines={1} color={qty > 0 ? Colors.brandDark : Colors.text}>
                  {qty > 0 ? `${formatQty(qty)}× ` : '+ '}
                  {p.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : productsQuery.isSuccess && products.length === 0 ? (
        <Pressable onPress={() => router.push('/products')}>
          <AppText variant="small" color={Colors.brand}>
            Tip: save your menu in Profile → Products to add items with one tap.
          </AppText>
        </Pressable>
      ) : null}

      {items.length === 0 ? (
        <View style={[styles.empty, errors.items ? styles.emptyError : null]}>
          <Ionicons name="basket-outline" size={26} color={errors.items ? Colors.danger : Colors.textMuted} />
          <AppText variant="small" color={errors.items ? Colors.dangerSoftText : Colors.textMuted} style={styles.center}>
            {errors.items ?? 'No items yet. Search above or tap a quick pick.'}
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const descError = errors[`items.${index}.description`];
            const qtyError = errors[`items.${index}.quantity`];
            const priceError = errors[`items.${index}.unitPrice`];
            return (
              <Card key={item.key} style={styles.itemCard}>
                <View style={styles.itemTop}>
                  <TextInput
                    style={[styles.nameInput, webInputFix]}
                    value={item.description}
                    onChangeText={(t) => update(index, { description: t })}
                    placeholder="Item name"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    accessibilityLabel="Item name"
                  />
                  <Pressable onPress={() => remove(index)} hitSlop={8} style={styles.removeButton} accessibilityLabel={`Remove ${item.description}`}>
                    <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                  </Pressable>
                </View>
                {descError ? (
                  <AppText variant="small" color={Colors.dangerSoftText}>
                    {descError}
                  </AppText>
                ) : null}

                <View style={styles.itemBottom}>
                  <View style={[styles.priceBox, priceError ? styles.boxError : null]}>
                    <AppText variant="bodyMedium" color={Colors.textMuted}>
                      ₹
                    </AppText>
                    <TextInput
                      style={[styles.priceInput, webInputFix]}
                      value={item.unitPrice}
                      onChangeText={(t) => update(index, { unitPrice: t })}
                      placeholder="Price"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      accessibilityLabel="Unit price"
                    />
                    {item.unit ? (
                      <AppText variant="small" color={Colors.textMuted}>
                        /{item.unit}
                      </AppText>
                    ) : null}
                  </View>

                  <View style={[styles.stepper, qtyError ? styles.boxError : null]}>
                    <Pressable onPress={() => step(index, -1)} hitSlop={6} style={styles.stepButton} accessibilityLabel="Decrease quantity">
                      <Ionicons name="remove" size={16} color={Colors.brand} />
                    </Pressable>
                    <TextInput
                      style={[styles.qtyInput, webInputFix]}
                      value={item.quantity}
                      onChangeText={(t) => update(index, { quantity: t })}
                      keyboardType="decimal-pad"
                      accessibilityLabel="Quantity"
                    />
                    <Pressable onPress={() => step(index, 1)} hitSlop={6} style={styles.stepButton} accessibilityLabel="Increase quantity">
                      <Ionicons name="add" size={16} color={Colors.brand} />
                    </Pressable>
                  </View>

                  <AppText variant="bodyBold" style={styles.lineTotal}>
                    {formatMoney(lineTotal(item))}
                  </AppText>
                </View>
                {priceError || qtyError ? (
                  <AppText variant="small" color={Colors.dangerSoftText}>
                    {[priceError, qtyError].filter(Boolean).join(' · ')}
                  </AppText>
                ) : null}

                {!item.productId && item.description.trim() ? (
                  <Pressable onPress={() => saveAsProduct(index)} disabled={createProduct.isPending} hitSlop={6}>
                    <AppText variant="small" color={Colors.brand}>
                      {createProduct.isPending ? 'Saving…' : '+ Save to my products for next time'}
                    </AppText>
                  </Pressable>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  container: {
    gap: Spacing.two + 2,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.card,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: Colors.accent,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.two + 4,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLarge,
    color: Colors.text,
  },
  results: {
    overflow: 'hidden',
  },
  resultsNote: {
    padding: Spacing.three,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  addIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPicks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  pick: {
    maxWidth: '100%',
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickActive: {
    backgroundColor: Colors.backgroundMuted,
    borderColor: Colors.brand,
  },
  pickName: {
    fontFamily: Fonts.bodyMedium,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.outline,
  },
  emptyError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft,
  },
  list: {
    gap: Spacing.two,
  },
  itemCard: {
    gap: Spacing.two,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  nameInput: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.bodyLarge,
    color: Colors.text,
    paddingVertical: 2,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  priceBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two + 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  priceInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.body,
    color: Colors.text,
  },
  boxError: {
    borderColor: Colors.danger,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  stepButton: {
    width: 32,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 40,
    textAlign: 'center',
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.body,
    color: Colors.text,
    paddingVertical: Spacing.two,
  },
  lineTotal: {
    minWidth: 64,
    textAlign: 'right',
  },
}));
