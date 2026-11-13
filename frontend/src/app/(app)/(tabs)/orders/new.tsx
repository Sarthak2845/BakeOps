import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CustomerPicker, EMPTY_CUSTOMER_DRAFT, type NewCustomerDraft } from '@/components/customer-picker';
import { DeliveryPicker, deliveryToDate, type Delivery } from '@/components/delivery-picker';
import { OrderItemsEditor, type OrderItemDraft } from '@/components/order-items-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { Colors, Radii, Spacing, themedStyles } from '@/constants/theme';
import { ApiError, customersApi } from '@/lib/api';
import { getErrorMessage, getFieldErrors, type FieldErrors } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import { useCreateCustomer, useCreateOrder } from '@/lib/queries';
import type { Customer } from '@/lib/types';
import {
  MAX_MONEY,
  hasErrors,
  validateLength,
  validateMoney,
  validatePhone,
  validateQuantity,
} from '@/lib/validators';
import { useTheme } from '@/lib/theme-context';

const OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Baby shower', 'Festival'];

export default function NewOrderScreen() {
  useTheme();
  const toast = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerDraft, setCustomerDraft] = useState<NewCustomerDraft>(EMPTY_CUSTOMER_DRAFT);

  const [occasionTag, setOccasionTag] = useState('');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [advancePaid, setAdvancePaid] = useState('');
  const [items, setItems] = useState<OrderItemDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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

  function clearItemErrors(fields?: string[]) {
    if (fields) clearError(...fields);
    else setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('items'))));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const set = (key: string, message: string | null) => {
      if (message) next[key] = message;
    };

    if (!selectedCustomer) {
      if (!showNewCustomer) {
        next.customer = 'Choose a customer, or add a new one.';
      } else {
        const { name, phone, occasionLabel, occasionDate } = customerDraft;
        set('customerName', name.trim() ? validateLength(name, 'Name', { max: 120 }) : 'Customer name is required');
        set('customerPhone', validatePhone(phone));
        if (occasionLabel.trim() || occasionDate) {
          set('occasionLabel', occasionLabel.trim() ? validateLength(occasionLabel, 'Occasion', { max: 60 }) : 'Choose or type the occasion');
          if (!occasionDate) next.occasionDate = 'Pick the date of the occasion';
        }
      }
    }

    if (items.length === 0) {
      next.items = 'Add at least one item to the order.';
    }
    items.forEach((item, index) => {
      set(`items.${index}.description`, item.description.trim() ? validateLength(item.description, 'Name', { max: 200 }) : 'Item name is required');
      set(`items.${index}.quantity`, validateQuantity(item.quantity));
      set(`items.${index}.unitPrice`, validateMoney(item.unitPrice, 'Price', { required: true }));
    });
    if (!next.items && total > MAX_MONEY) next.items = 'Order total is too large.';

    set('occasionTag', validateLength(occasionTag, 'Occasion tag', { max: 60 }));
    set('advancePaid', validateMoney(advancePaid, 'Advance'));
    if (!next.advancePaid && parseFloat(advancePaid) > total && items.length > 0) {
      next.advancePaid = 'Advance is more than the order total';
    }

    return next;
  }

  async function resolveCustomerId(): Promise<string> {
    if (selectedCustomer) return selectedCustomer.id;

    const { name, phone, occasionLabel, occasionDate } = customerDraft;
    let customer: Customer;
    try {
      ({ customer } = await createCustomer.mutateAsync({ name: name.trim(), phone: phone.trim() }));
    } catch (err) {
      // The number is already saved: use that customer instead of failing the order.
      const existingId = (err instanceof ApiError && err.status === 409
        ? (err.details as { customerId?: string } | undefined)?.customerId
        : undefined);
      if (existingId) {
        const { customer: existing } = await customersApi.get(existingId);
        setSelectedCustomer(existing);
        setShowNewCustomer(false);
        toast.show({ message: `This number is already saved as ${existing.name}, so the order goes to them.` });
        return existing.id;
      }
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

    if (occasionLabel.trim() && occasionDate) {
      try {
        const { occasion } = await customersApi.addOccasion(customer.id, { label: occasionLabel.trim(), ...occasionDate });
        setSelectedCustomer({ ...customer, occasions: [occasion] });
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

    const orderItems = items.map((i) => ({
      description: i.description.trim(),
      quantity: parseFloat(i.quantity),
      unitPrice: parseFloat(i.unitPrice),
    }));

    setSubmitting(true);
    try {
      const customerId = await resolveCustomerId();

      const { order } = await createOrder.mutateAsync({
        customerId,
        items: orderItems,
        occasionTag: occasionTag.trim() || undefined,
        deliveryDate: delivery ? deliveryToDate(delivery).toISOString() : undefined,
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
    <Screen edges={['top', 'bottom']} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </Pressable>
        <AppText variant="h2">New order</AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="bodyMedium">Customer</AppText>
        <CustomerPicker
          selected={selectedCustomer}
          onSelect={setSelectedCustomer}
          adding={showNewCustomer}
          onAddingChange={setShowNewCustomer}
          draft={customerDraft}
          onDraftChange={setCustomerDraft}
          errors={errors}
          onClearError={clearError}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="bodyMedium">Items</AppText>
          {items.length > 0 ? (
            <AppText variant="small" color={Colors.textMuted}>
              {items.length} item{items.length === 1 ? '' : 's'}
            </AppText>
          ) : null}
        </View>
        <OrderItemsEditor
          items={items}
          onChange={setItems}
          errors={errors}
          onClearErrors={clearItemErrors}
          onFieldError={(field, message) => setErrors((prev) => ({ ...prev, [field]: message }))}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="bodyMedium">Delivery</AppText>
        <DeliveryPicker value={delivery} onChange={setDelivery} />
      </View>

      <View style={styles.section}>
        <AppText variant="bodyMedium">Occasion</AppText>
        <View style={styles.chipRow}>
          {OCCASIONS.map((o) => {
            const active = occasionTag.trim().toLowerCase() === o.toLowerCase();
            return (
              <Pressable
                key={o}
                onPress={() => {
                  setOccasionTag(active ? '' : o);
                  clearError('occasionTag');
                }}
                style={[styles.chip, active && styles.chipActive]}>
                <AppText variant="bodyBold" color={active ? Colors.white : Colors.text}>
                  {o}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <TextField
          placeholder="Or type your own (optional)"
          value={occasionTag}
          onChangeText={(t) => {
            setOccasionTag(t);
            clearError('occasionTag');
          }}
          error={errors.occasionTag}
        />
      </View>

      <Card style={styles.summary}>
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textMuted}>
            Total
          </AppText>
          <AppText variant="h2">{formatMoney(total)}</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText variant="body" color={Colors.textMuted}>
            Advance received
          </AppText>
          <View style={styles.advanceField}>
            <TextField
              placeholder="₹0"
              value={advancePaid}
              onChangeText={(t) => {
                setAdvancePaid(t);
                clearError('advancePaid');
              }}
              keyboardType="numeric"
              error={errors.advancePaid}
              style={styles.advanceInput}
            />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <AppText variant="bodyBold">Balance due</AppText>
          <AppText variant="h2" color={Colors.brand}>
            {formatMoney(Math.max(0, total - (parseFloat(advancePaid) || 0)))}
          </AppText>
        </View>
      </Card>

      <FormError message={formError} />
      <Button label="Create order" onPress={onSubmit} loading={submitting} />
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
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  summary: {
    gap: Spacing.two + 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  advanceField: {
    width: 140,
  },
  advanceInput: {
    textAlign: 'right',
    backgroundColor: Colors.backgroundMuted,
    paddingVertical: Spacing.two,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
}));
