import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { customersApi } from '@/lib/api';
import { getErrorMessage, getFieldErrors, type FieldErrors } from '@/lib/errors';
import { useCreateCustomer, useCreateOrder, useCustomers } from '@/lib/queries';
import type { Customer } from '@/lib/types';
import {
  MAX_MONEY,
  hasErrors,
  parseDateInput,
  parseMonthDay,
  validateDateInput,
  validateLength,
  validateMoney,
  validatePhone,
  validateQuantity,
} from '@/lib/validators';

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

const isBlankRow = (row: ItemRow) => !row.description.trim() && !row.unitPrice.trim() && (!row.quantity.trim() || row.quantity.trim() === '1');

export default function NewOrderScreen() {
  const toast = useToast();
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [occasionLabel, setOccasionLabel] = useState('');
  const [occasionDate, setOccasionDate] = useState('');

  const [occasionTag, setOccasionTag] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ description: '', quantity: '1', unitPrice: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const customersQuery = useCustomers(customerQuery.length >= 2 ? customerQuery : undefined);
  const customers = customersQuery.data ?? [];
  const createCustomer = useCreateCustomer();
  const createOrder = useCreateOrder();

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0),
    [items]
  );

  function clearError(...fields: string[]) {
    setErrors((prev) => {
      if (!fields.some((f) => prev[f])) return prev;
      const next = { ...prev };
      for (const f of fields) delete next[f];
      return next;
    });
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    clearError('items', ...Object.keys(patch).map((k) => `items.${index}.${k}`));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { description: '', quantity: '1', unitPrice: '' }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    // Row indexes shift, so per-row errors no longer line up.
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('items'))));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const set = (key: string, message: string | null) => {
      if (message) next[key] = message;
    };

    if (!selectedCustomer) {
      if (!showNewCustomer) {
        next.customer = 'Pick a customer from the search, or add a new one.';
      } else {
        set('customerName', newName.trim() ? validateLength(newName, 'Name', { max: 120 }) : 'Customer name is required');
        set('customerPhone', validatePhone(newPhone));
        if (occasionLabel.trim() || occasionDate.trim()) {
          set('occasionLabel', occasionLabel.trim() ? validateLength(occasionLabel, 'Occasion', { max: 60 }) : 'Add a name for the occasion');
          if (!parseMonthDay(occasionDate)) next.occasionDate = 'Use MM-DD, e.g. 03-14';
        }
      }
    }

    const filled = items.map((row, index) => ({ row, index })).filter(({ row }) => !isBlankRow(row));
    if (filled.length === 0) {
      next.items = 'Add at least one item with a description and price.';
    }
    for (const { row, index } of filled) {
      set(`items.${index}.description`, row.description.trim() ? validateLength(row.description, 'Description', { max: 200 }) : 'Description is required');
      set(`items.${index}.quantity`, validateQuantity(row.quantity));
      set(`items.${index}.unitPrice`, validateMoney(row.unitPrice, 'Price', { required: true }));
    }
    if (!next.items && total > MAX_MONEY) next.items = 'Order total is too large.';

    set('occasionTag', validateLength(occasionTag, 'Occasion tag', { max: 60 }));
    set('deliveryDate', validateDateInput(deliveryDate, 'Delivery date'));
    set('advancePaid', validateMoney(advancePaid, 'Advance paid'));

    return next;
  }

  async function resolveCustomerId(): Promise<string> {
    if (selectedCustomer) return selectedCustomer.id;

    let customer: Customer;
    try {
      ({ customer } = await createCustomer.mutateAsync({ name: newName.trim(), phone: newPhone.trim() }));
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors({
        ...(fieldErrors.name ? { customerName: fieldErrors.name } : {}),
        ...(fieldErrors.phone ? { customerPhone: fieldErrors.phone } : {}),
      });
      throw err;
    }

    // Remember the created customer so a retry after a failed order doesn't create a duplicate.
    setSelectedCustomer(customer);
    setShowNewCustomer(false);

    const md = parseMonthDay(occasionDate);
    if (occasionLabel.trim() && md) {
      try {
        await customersApi.addOccasion(customer.id, { label: occasionLabel.trim(), ...md });
      } catch (err) {
        // Occasion is a nice-to-have; don't block order creation, but tell the user.
        toast.error(getErrorMessage(err), 'Occasion reminder not saved');
      }
    }
    return customer.id;
  }

  async function onSubmit() {
    const next = validate();
    setErrors(next);
    setFormError(hasErrors(next) ? 'Please fix the highlighted fields.' : null);
    if (hasErrors(next)) return;

    const validItems = items
      .filter((row) => !isBlankRow(row))
      .map((i) => ({ description: i.description.trim(), quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice) }));
    const delivery = deliveryDate.trim() ? parseDateInput(deliveryDate) : null;

    setSubmitting(true);
    try {
      const customerId = await resolveCustomerId();

      const { order } = await createOrder.mutateAsync({
        customerId,
        items: validItems,
        occasionTag: occasionTag.trim() || undefined,
        deliveryDate: delivery ? delivery.toISOString() : undefined,
        advancePaid: advancePaid.trim() ? parseFloat(advancePaid.trim()) : undefined,
      });

      toast.success('Order created');
      router.replace(`/orders/${order.id}`);
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...getFieldErrors(err) }));
      setFormError(getErrorMessage(err, 'Could not create the order. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </Pressable>
        <AppText variant="h2">New order</AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="bodyMedium">Customer</AppText>
        {selectedCustomer ? (
          <Card style={styles.selectedCustomer}>
            <View>
              <AppText variant="bodyBold">{selectedCustomer.name}</AppText>
              <AppText variant="small" color={Colors.textMuted}>
                {selectedCustomer.phone}
              </AppText>
            </View>
            <Pressable onPress={() => setSelectedCustomer(null)}>
              <AppText variant="bodyBold" color={Colors.brand}>
                Change
              </AppText>
            </Pressable>
          </Card>
        ) : (
          <>
            <TextField
              placeholder="Search name or phone"
              value={customerQuery}
              onChangeText={(t) => {
                setCustomerQuery(t);
                setShowNewCustomer(false);
                clearError('customer');
              }}
              error={errors.customer}
            />
            {customerQuery.length >= 2 && customersQuery.isError ? (
              <AppText variant="small" color={Colors.dangerSoftText}>
                Couldn’t search customers. {getErrorMessage(customersQuery.error)}
              </AppText>
            ) : null}
            {customerQuery.length >= 2 && customers.length > 0 && (
              <View style={styles.suggestionList}>
                {customers.slice(0, 5).map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.suggestionRow}
                    onPress={() => {
                      setSelectedCustomer(c);
                      setCustomerQuery('');
                      clearError('customer');
                    }}>
                    <AppText variant="bodyBold">{c.name}</AppText>
                    <AppText variant="small" color={Colors.textMuted}>
                      {c.phone}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
            {customerQuery.length >= 2 && customersQuery.isSuccess && customers.length === 0 && !showNewCustomer ? (
              <Pressable
                onPress={() => {
                  setShowNewCustomer(true);
                  clearError('customer');
                }}>
                <AppText variant="bodyBold" color={Colors.brand}>
                  + Add "{customerQuery}" as a new customer
                </AppText>
              </Pressable>
            ) : null}
            {!showNewCustomer && customerQuery.length < 2 ? (
              <Pressable
                onPress={() => {
                  setShowNewCustomer(true);
                  clearError('customer');
                }}>
                <AppText variant="bodyBold" color={Colors.brand}>
                  + New customer
                </AppText>
              </Pressable>
            ) : null}
            {showNewCustomer ? (
              <View style={styles.newCustomerForm}>
                <TextField
                  label="Name"
                  placeholder="Customer name"
                  value={newName}
                  onChangeText={(t) => {
                    setNewName(t);
                    clearError('customerName');
                  }}
                  error={errors.customerName}
                />
                <TextField
                  label="Phone"
                  placeholder="10-digit number"
                  value={newPhone}
                  onChangeText={(t) => {
                    setNewPhone(t);
                    clearError('customerPhone');
                  }}
                  keyboardType="phone-pad"
                  error={errors.customerPhone}
                />
                <AppText variant="small" color={Colors.textMuted}>
                  Optional — remind them next year automatically
                </AppText>
                <View style={styles.occasionRow}>
                  <View style={{ flex: 2 }}>
                    <TextField
                      label="Occasion"
                      placeholder="Birthday"
                      value={occasionLabel}
                      onChangeText={(t) => {
                        setOccasionLabel(t);
                        clearError('occasionLabel');
                      }}
                      error={errors.occasionLabel}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Date (MM-DD)"
                      placeholder="03-14"
                      value={occasionDate}
                      onChangeText={(t) => {
                        setOccasionDate(t);
                        clearError('occasionDate');
                      }}
                      error={errors.occasionDate}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="bodyMedium">Items</AppText>
        {items.map((item, index) => (
          <Card key={index} style={styles.itemCard}>
            <TextField
              placeholder="Description (e.g. 1kg chocolate cake)"
              value={item.description}
              onChangeText={(t) => updateItem(index, { description: t })}
              error={errors[`items.${index}.description`]}
            />
            <View style={styles.itemNumbersRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  placeholder="Qty"
                  value={item.quantity}
                  onChangeText={(t) => updateItem(index, { quantity: t })}
                  keyboardType="numeric"
                  error={errors[`items.${index}.quantity`]}
                />
              </View>
              <View style={{ flex: 2 }}>
                <TextField
                  placeholder="Unit price"
                  value={item.unitPrice}
                  onChangeText={(t) => updateItem(index, { unitPrice: t })}
                  keyboardType="numeric"
                  error={errors[`items.${index}.unitPrice`]}
                />
              </View>
              {items.length > 1 ? (
                <Pressable onPress={() => removeItemRow(index)} style={styles.removeButton}>
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))}
        {errors.items ? (
          <AppText variant="small" color={Colors.dangerSoftText}>
            {errors.items}
          </AppText>
        ) : null}
        <Pressable onPress={addItemRow}>
          <AppText variant="bodyBold" color={Colors.brand}>
            + Add item
          </AppText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <TextField
          label="Occasion tag (optional)"
          placeholder="Birthday, Anniversary, Festival..."
          value={occasionTag}
          onChangeText={(t) => {
            setOccasionTag(t);
            clearError('occasionTag');
          }}
          error={errors.occasionTag}
        />
        <TextField
          label="Delivery date (optional)"
          placeholder="YYYY-MM-DD"
          value={deliveryDate}
          onChangeText={(t) => {
            setDeliveryDate(t);
            clearError('deliveryDate');
          }}
          error={errors.deliveryDate}
        />
        <TextField
          label="Advance paid (optional)"
          placeholder="0"
          value={advancePaid}
          onChangeText={(t) => {
            setAdvancePaid(t);
            clearError('advancePaid');
          }}
          keyboardType="numeric"
          error={errors.advancePaid}
        />
      </View>

      <Card tone="muted" style={styles.totalRow}>
        <AppText variant="bodyMedium">Estimated total</AppText>
        <AppText variant="h2">₹{total.toLocaleString('en-IN')}</AppText>
      </Card>

      <FormError message={formError} />
      <Button label="Create order" onPress={onSubmit} loading={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  section: {
    gap: Spacing.two,
  },
  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionList: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  newCustomerForm: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  occasionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  itemCard: {
    gap: Spacing.two,
  },
  itemNumbersRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundMuted,
    marginTop: 6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
