import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { ApiError, customersApi } from '@/lib/api';
import { useCreateCustomer, useCreateOrder, useCustomers } from '@/lib/queries';
import type { Customer } from '@/lib/types';

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function NewOrderScreen() {
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

  const { data: customers = [] } = useCustomers(customerQuery.length >= 2 ? customerQuery : undefined);
  const createCustomer = useCreateCustomer();
  const createOrder = useCreateOrder();

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0),
    [items]
  );

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { description: '', quantity: '1', unitPrice: '' }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function resolveCustomerId(): Promise<string | null> {
    if (selectedCustomer) return selectedCustomer.id;
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Missing details', 'Enter the new customer’s name and phone number.');
      return null;
    }
    const { customer } = await createCustomer.mutateAsync({ name: newName.trim(), phone: newPhone.trim() });
    if (occasionLabel.trim() && occasionDate.trim()) {
      const [month, day] = occasionDate.split('-').map((n) => parseInt(n, 10));
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        await customersApi.addOccasion(customer.id, { label: occasionLabel.trim(), month, day }).catch(() => {
          // Occasion is a nice-to-have; don't block order creation if it fails.
        });
      }
    }
    return customer.id;
  }

  async function onSubmit() {
    const validItems = items
      .map((i) => ({ description: i.description.trim(), quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice) }))
      .filter((i) => i.description && i.quantity > 0 && !Number.isNaN(i.unitPrice));

    if (validItems.length === 0) {
      Alert.alert('Add at least one item', 'Fill in a description, quantity, and price.');
      return;
    }

    setSubmitting(true);
    try {
      const customerId = await resolveCustomerId();
      if (!customerId) {
        setSubmitting(false);
        return;
      }

      const { order } = await createOrder.mutateAsync({
        customerId,
        items: validItems,
        occasionTag: occasionTag.trim() || undefined,
        deliveryDate: deliveryDate.trim() ? new Date(deliveryDate.trim()).toISOString() : undefined,
        advancePaid: advancePaid.trim() ? parseFloat(advancePaid.trim()) : undefined,
      });

      router.replace(`/orders/${order.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Could not create order', message);
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
              }}
            />
            {customerQuery.length >= 2 && customers.length > 0 && (
              <View style={styles.suggestionList}>
                {customers.slice(0, 5).map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.suggestionRow}
                    onPress={() => {
                      setSelectedCustomer(c);
                      setCustomerQuery('');
                    }}>
                    <AppText variant="bodyBold">{c.name}</AppText>
                    <AppText variant="small" color={Colors.textMuted}>
                      {c.phone}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
            {customerQuery.length >= 2 && customers.length === 0 && !showNewCustomer ? (
              <Pressable onPress={() => setShowNewCustomer(true)}>
                <AppText variant="bodyBold" color={Colors.brand}>
                  + Add "{customerQuery}" as a new customer
                </AppText>
              </Pressable>
            ) : null}
            {!showNewCustomer && customerQuery.length < 2 ? (
              <Pressable onPress={() => setShowNewCustomer(true)}>
                <AppText variant="bodyBold" color={Colors.brand}>
                  + New customer
                </AppText>
              </Pressable>
            ) : null}
            {showNewCustomer ? (
              <View style={styles.newCustomerForm}>
                <TextField label="Name" placeholder="Customer name" value={newName} onChangeText={setNewName} />
                <TextField label="Phone" placeholder="10-digit number" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
                <AppText variant="small" color={Colors.textMuted}>
                  Optional — remind them next year automatically
                </AppText>
                <View style={styles.occasionRow}>
                  <View style={{ flex: 2 }}>
                    <TextField label="Occasion" placeholder="Birthday" value={occasionLabel} onChangeText={setOccasionLabel} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField label="Date (MM-DD)" placeholder="03-14" value={occasionDate} onChangeText={setOccasionDate} />
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
            <TextField placeholder="Description (e.g. 1kg chocolate cake)" value={item.description} onChangeText={(t) => updateItem(index, { description: t })} />
            <View style={styles.itemNumbersRow}>
              <View style={{ flex: 1 }}>
                <TextField placeholder="Qty" value={item.quantity} onChangeText={(t) => updateItem(index, { quantity: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 2 }}>
                <TextField placeholder="Unit price" value={item.unitPrice} onChangeText={(t) => updateItem(index, { unitPrice: t })} keyboardType="numeric" />
              </View>
              {items.length > 1 ? (
                <Pressable onPress={() => removeItemRow(index)} style={styles.removeButton}>
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))}
        <Pressable onPress={addItemRow}>
          <AppText variant="bodyBold" color={Colors.brand}>
            + Add item
          </AppText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <TextField label="Occasion tag (optional)" placeholder="Birthday, Anniversary, Festival..." value={occasionTag} onChangeText={setOccasionTag} />
        <TextField label="Delivery date (optional)" placeholder="YYYY-MM-DD" value={deliveryDate} onChangeText={setDeliveryDate} />
        <TextField label="Advance paid (optional)" placeholder="0" value={advancePaid} onChangeText={setAdvancePaid} keyboardType="numeric" />
      </View>

      <Card tone="muted" style={styles.totalRow}>
        <AppText variant="bodyMedium">Estimated total</AppText>
        <AppText variant="h2">₹{total.toLocaleString('en-IN')}</AppText>
      </Card>

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
    alignItems: 'center',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundMuted,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
