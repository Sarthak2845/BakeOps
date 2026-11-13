import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FormError } from '@/components/ui/form-error';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing, themedStyles } from '@/constants/theme';
import { getErrorMessage, getFieldErrors, type FieldErrors } from '@/lib/errors';
import { formatMoney, toNumber } from '@/lib/format';
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from '@/lib/queries';
import type { Product } from '@/lib/types';
import { hasErrors, validateLength, validateMoney } from '@/lib/validators';
import { useTheme } from '@/lib/theme-context';

/** Add form when `product` is omitted, edit form otherwise. */
function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  useTheme();
  const toast = useToast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [name, setName] = useState(product?.name ?? '');
  const [price, setPrice] = useState(product ? String(toNumber(product.unitPrice)) : '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Deleting needs a second tap, like "Mark paid" on the Money tab.
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const saving = createProduct.isPending || updateProduct.isPending;

  async function save() {
    const next = {
      name: name.trim() ? (validateLength(name, 'Name', { max: 200 }) ?? '') : 'Name is required',
      unitPrice: validateMoney(price, 'Price', { required: true }) ?? '',
      unit: validateLength(unit, 'Unit', { max: 20 }) ?? '',
    };
    setErrors(next);
    setFormError(null);
    if (hasErrors(next)) return;

    try {
      if (product) {
        await updateProduct.mutateAsync({
          id: product.id,
          input: { name: name.trim(), unitPrice: parseFloat(price), unit: unit.trim() || null },
        });
        toast.success('Product updated');
      } else {
        await createProduct.mutateAsync({ name: name.trim(), unitPrice: parseFloat(price), unit: unit.trim() || undefined });
        toast.success(`"${name.trim()}" added`);
      }
      onDone();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, 'Could not save the product. Please try again.'));
    }
  }

  async function remove() {
    if (!product) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success(`"${product.name}" deleted`);
      onDone();
    } catch (err) {
      setConfirmDelete(false);
      setFormError(getErrorMessage(err, 'Could not delete the product. Please try again.'));
    }
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Name"
        placeholder="1kg chocolate truffle cake"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setErrors((e) => ({ ...e, name: '' }));
        }}
        error={errors.name}
      />
      <View style={styles.formRow}>
        <View style={styles.priceField}>
          <TextField
            label="Price"
            placeholder="950"
            value={price}
            onChangeText={(t) => {
              setPrice(t);
              setErrors((e) => ({ ...e, unitPrice: '' }));
            }}
            keyboardType="numeric"
            error={errors.unitPrice}
          />
        </View>
        <View style={styles.unitField}>
          <TextField
            label="Unit (optional)"
            placeholder="kg, piece"
            value={unit}
            onChangeText={(t) => {
              setUnit(t);
              setErrors((e) => ({ ...e, unit: '' }));
            }}
            error={errors.unit}
          />
        </View>
      </View>
      <FormError message={formError} />
      <View style={styles.formRow}>
        <View style={styles.flex}>
          <Button label="Cancel" variant="outline" onPress={onDone} />
        </View>
        <View style={styles.flex}>
          <Button label={product ? 'Save' : 'Add product'} onPress={save} loading={saving} />
        </View>
      </View>
      {product ? (
        <Button
          label={confirmDelete ? 'Tap again to delete' : 'Delete product'}
          variant="ghost"
          onPress={remove}
          loading={deleteProduct.isPending}
        />
      ) : null}
    </View>
  );
}

export default function ProductsScreen() {
  useTheme();
  const { data: products = [], isLoading, isError, error, refetch, isRefetching } = useProducts('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, search]);

  return (
    <Screen edges={['top', 'bottom']} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </Pressable>
        <View>
          <AppText variant="eyebrow">{products.length} saved</AppText>
          <AppText variant="h2">Products</AppText>
        </View>
      </View>

      {adding ? (
        <Card>
          <ProductForm onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <View style={styles.formRow}>
          <View style={styles.flex}>
            <Button
              label="Add product"
              onPress={() => {
                setEditingId(null);
                setAdding(true);
              }}
            />
          </View>
          <View style={styles.flex}>
            <Button label="Add many" variant="outline" onPress={() => router.push('/products/import')} />
          </View>
        </View>
      )}

      {products.length > 0 ? <TextField placeholder="Search products" value={search} onChangeText={setSearch} /> : null}

      {isError && products.length === 0 ? (
        <ErrorState error={error} title="Couldn’t load your products" onRetry={() => refetch()} retrying={isRefetching} />
      ) : isLoading ? (
        <ActivityIndicator color={Colors.brand} />
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" hint="Add your menu here, and it will be suggested when you create orders." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" hint={`Nothing is called "${search.trim()}".`} />
      ) : (
        <View style={styles.list}>
          {filtered.map((p) => (
            <Card key={p.id}>
              {editingId === p.id ? (
                <ProductForm key={p.updatedAt} product={p} onDone={() => setEditingId(null)} />
              ) : (
                <Pressable
                  style={styles.row}
                  accessibilityLabel={`Edit ${p.name}`}
                  onPress={() => {
                    setAdding(false);
                    setEditingId(p.id);
                  }}>
                  <AppText variant="bodyBold" style={styles.flex}>
                    {p.name}
                  </AppText>
                  <AppText variant="body">
                    {formatMoney(p.unitPrice)}
                    {p.unit ? ` / ${p.unit}` : ''}
                  </AppText>
                  <Ionicons name="create-outline" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </Card>
          ))}
        </View>
      )}
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
  form: {
    gap: Spacing.two,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  priceField: {
    flex: 1,
  },
  unitField: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
}));
