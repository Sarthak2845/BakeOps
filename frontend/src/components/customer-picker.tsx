import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { OccasionDatePicker, formatMonthDay, type MonthDay } from '@/components/occasion-date-picker';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts, FontSizes, Radii, Spacing, themedStyles } from '@/constants/theme';
import { getErrorMessage, type FieldErrors } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useCustomers, useOrders } from '@/lib/queries';
import type { Customer, Order } from '@/lib/types';
import { useTheme } from '@/lib/theme-context';

export interface NewCustomerDraft {
  name: string;
  phone: string;
  occasionLabel: string;
  occasionDate: MonthDay | null;
}

export const EMPTY_CUSTOMER_DRAFT: NewCustomerDraft = { name: '', phone: '', occasionLabel: '', occasionDate: null };

const OCCASION_LABELS = ['Birthday', 'Anniversary'];
const RECENT_COUNT = 4;
const MAX_RESULTS = 6;
const avatarColors = () => [Colors.brand, Colors.accent, Colors.accentSoft, Colors.info, Colors.success];

const webInputFix = Platform.OS === 'web' ? ({ boxSizing: 'border-box', minWidth: 0, outlineStyle: 'none' } as object) : null;

const digits = (s: string) => s.replace(/\D/g, '');

/** Last 10 digits, so "+91 98220 41556" and "9822041556" count as the same number. */
function phoneKey(phone: string): string {
  return digits(phone).slice(-10);
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  useTheme();
  const palette = avatarColors();
  const color = palette[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % palette.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <AppText variant="bodyBold" color={Colors.white}>
        {name.trim()[0]?.toUpperCase() ?? '?'}
      </AppText>
    </View>
  );
}

interface CustomerStats {
  count: number;
  lastOrder: Order;
}

export function CustomerPicker({
  selected,
  onSelect,
  adding,
  onAddingChange,
  draft,
  onDraftChange,
  errors,
  onClearError,
}: {
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
  /** Showing the new-customer form. */
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
  draft: NewCustomerDraft;
  onDraftChange: (draft: NewCustomerDraft) => void;
  /** Uses keys customer, customerName, customerPhone, occasionLabel, occasionDate. */
  errors: FieldErrors;
  onClearError: (...fields: string[]) => void;
}) {
  useTheme();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The full customer list is loaded once (the Home tab already uses it) and searched on the phone.
  const customersQuery = useCustomers();
  const ordersQuery = useOrders();
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);

  const stats = useMemo(() => {
    const map = new Map<string, CustomerStats>();
    for (const order of ordersQuery.data ?? []) {
      if (order.status === 'CANCELLED') continue;
      const current = map.get(order.customerId);
      if (!current) map.set(order.customerId, { count: 1, lastOrder: order });
      else {
        current.count += 1;
        if (new Date(order.orderDate) > new Date(current.lastOrder.orderDate)) current.lastOrder = order;
      }
    }
    return map;
  }, [ordersQuery.data]);

  const recent = useMemo(
    () =>
      customers
        .filter((c) => stats.has(c.id))
        .sort((a, b) => new Date(stats.get(b.id)!.lastOrder.orderDate).getTime() - new Date(stats.get(a.id)!.lastOrder.orderDate).getTime())
        .slice(0, RECENT_COUNT),
    [customers, stats]
  );

  const search = query.trim();
  const results = useMemo(() => {
    if (!search) return [];
    const lower = search.toLowerCase();
    const searchDigits = digits(search);
    return customers
      .filter((c) => c.name.toLowerCase().includes(lower) || (searchDigits.length >= 3 && digits(c.phone).includes(searchDigits)))
      .slice(0, MAX_RESULTS);
  }, [customers, search]);

  // Catch a number that's already saved before the server rejects it.
  const existingWithPhone = useMemo(() => {
    const key = phoneKey(draft.phone);
    return key.length === 10 ? customers.find((c) => phoneKey(c.phone) === key) : undefined;
  }, [customers, draft.phone]);

  function choose(customer: Customer) {
    onSelect(customer);
    onAddingChange(false);
    setQuery('');
    onClearError('customer');
  }

  function startAdding() {
    // Prefill from what was typed: a number goes to phone, anything else to name.
    const looksLikePhone = digits(search).length >= 5 && !/[a-z]/i.test(search);
    onDraftChange({
      ...draft,
      name: looksLikePhone ? draft.name : search || draft.name,
      phone: looksLikePhone ? search : draft.phone,
    });
    onAddingChange(true);
    setQuery('');
    onClearError('customer');
  }

  function updateDraft(patch: Partial<NewCustomerDraft>, ...clear: string[]) {
    onDraftChange({ ...draft, ...patch });
    if (clear.length) onClearError(...clear);
  }

  const describeStats = (c: Customer) => {
    const s = stats.get(c.id);
    if (!s) return 'New customer';
    return `${s.count} order${s.count === 1 ? '' : 's'} · last ${formatDate(s.lastOrder.orderDate)}`;
  };

  // --- Selected customer ---------------------------------------------------
  if (selected) {
    const s = stats.get(selected.id);
    const occasions = selected.occasions ?? customers.find((c) => c.id === selected.id)?.occasions ?? [];
    const lastItems = s?.lastOrder.items.map((i) => i.description).join(', ');
    return (
      <Card style={styles.selectedCard}>
        <View style={styles.row}>
          <Avatar name={selected.name} size={48} />
          <View style={styles.flex}>
            <AppText variant="bodyBold">{selected.name}</AppText>
            <AppText variant="small" color={Colors.textMuted}>
              {selected.phone}
            </AppText>
          </View>
          <Pressable
            onPress={() => onSelect(null)}
            style={styles.changeButton}
            accessibilityRole="button"
            accessibilityLabel="Change customer">
            <AppText variant="small" color={Colors.brand} style={styles.changeLabel}>
              Change
            </AppText>
          </Pressable>
        </View>
        {s || occasions.length > 0 ? (
          <View style={styles.statsBox}>
            {s ? (
              <View style={styles.statLine}>
                <Ionicons name="receipt-outline" size={14} color={Colors.textMuted} />
                <AppText variant="small" color={Colors.textMuted} style={styles.flex} numberOfLines={2}>
                  {describeStats(selected)}
                  {lastItems ? ` — ${lastItems}` : ''}
                </AppText>
              </View>
            ) : null}
            {occasions.map((o) => (
              <View key={o.id} style={styles.statLine}>
                <Ionicons name="gift-outline" size={14} color={Colors.accent} />
                <AppText variant="small" color={Colors.textMuted}>
                  {o.label} on {formatMonthDay(o)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    );
  }

  // --- New customer form ---------------------------------------------------
  if (adding) {
    return (
      <Card style={styles.formCard}>
        <View style={styles.formHeader}>
          <AppText variant="bodyBold">New customer</AppText>
          <Pressable onPress={() => onAddingChange(false)} hitSlop={8} accessibilityLabel="Back to search">
            <AppText variant="small" color={Colors.brand} style={styles.changeLabel}>
              Search instead
            </AppText>
          </Pressable>
        </View>

        <TextField
          label="Name"
          placeholder="Customer name"
          value={draft.name}
          onChangeText={(t) => updateDraft({ name: t }, 'customerName')}
          error={errors.customerName}
          autoCapitalize="words"
        />
        <TextField
          label="Phone"
          placeholder="10-digit mobile number"
          value={draft.phone}
          onChangeText={(t) => updateDraft({ phone: t }, 'customerPhone')}
          keyboardType="phone-pad"
          error={errors.customerPhone}
        />
        {existingWithPhone ? (
          <Pressable onPress={() => choose(existingWithPhone)} style={styles.existingHint}>
            <Avatar name={existingWithPhone.name} size={28} />
            <AppText variant="small" style={styles.flex}>
              Already saved as <AppText variant="small" style={styles.bold}>{existingWithPhone.name}</AppText>
            </AppText>
            <AppText variant="small" color={Colors.brand} style={styles.changeLabel}>
              Use
            </AppText>
          </Pressable>
        ) : null}

        <View style={styles.occasionBlock}>
          <AppText variant="bodyMedium">
            Remember an occasion <AppText variant="small" color={Colors.textMuted}>(optional)</AppText>
          </AppText>
          <AppText variant="small" color={Colors.textMuted}>
            You'll see a reminder on the Today tab every year.
          </AppText>
          <View style={styles.chipRow}>
            {OCCASION_LABELS.map((label) => {
              const active = draft.occasionLabel.trim().toLowerCase() === label.toLowerCase();
              return (
                <Pressable
                  key={label}
                  onPress={() => updateDraft({ occasionLabel: active ? '' : label }, 'occasionLabel')}
                  style={[styles.chip, active && styles.chipActive]}>
                  <AppText variant="bodyBold" color={active ? Colors.white : Colors.text}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {!OCCASION_LABELS.some((l) => l.toLowerCase() === draft.occasionLabel.trim().toLowerCase()) ? (
            <TextField
              placeholder="Or type one, e.g. Daughter's birthday"
              value={draft.occasionLabel}
              onChangeText={(t) => updateDraft({ occasionLabel: t }, 'occasionLabel')}
              error={errors.occasionLabel}
            />
          ) : null}
          <OccasionDatePicker
            value={draft.occasionDate}
            onChange={(d) => updateDraft({ occasionDate: d }, 'occasionDate')}
            error={errors.occasionDate}
            placeholder="Pick the date"
          />
        </View>
      </Card>
    );
  }

  // --- Search ---------------------------------------------------------------
  const showResults = search.length > 0;
  return (
    <View style={styles.container}>
      <View style={[styles.searchBar, focused && styles.searchBarFocused, errors.customer ? styles.searchBarError : null]}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={[styles.searchInput, webInputFix]}
          placeholder="Search by name or phone"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            onClearError('customer');
          }}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 200);
          }}
          onSubmitEditing={() => {
            if (results[0]) choose(results[0]);
          }}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {errors.customer ? (
        <AppText variant="small" color={Colors.dangerSoftText} style={styles.errorText}>
          {errors.customer}
        </AppText>
      ) : null}
      {customersQuery.isError ? (
        <AppText variant="small" color={Colors.dangerSoftText}>
          Couldn’t load your customers. {getErrorMessage(customersQuery.error)}
        </AppText>
      ) : null}

      {showResults ? (
        <Card padded={false} style={styles.list}>
          {results.map((c) => (
            <Pressable key={c.id} style={styles.listRow} onPress={() => choose(c)} accessibilityLabel={`Choose ${c.name}`}>
              <Avatar name={c.name} />
              <View style={styles.flex}>
                <AppText variant="bodyBold">{c.name}</AppText>
                <AppText variant="small" color={Colors.textMuted}>
                  {c.phone} · {describeStats(c)}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}
          {customersQuery.isSuccess && results.length === 0 ? (
            <AppText variant="small" color={Colors.textMuted} style={styles.noMatch}>
              No customer matches "{search}".
            </AppText>
          ) : null}
          <Pressable style={styles.listRow} onPress={startAdding}>
            <View style={[styles.avatar, styles.addAvatar]}>
              <Ionicons name="person-add-outline" size={18} color={Colors.brand} />
            </View>
            <AppText variant="bodyBold" color={Colors.brand} style={styles.flex}>
              Add "{search}" as a new customer
            </AppText>
          </Pressable>
        </Card>
      ) : (
        <>
          {recent.length > 0 ? (
            <View style={styles.recentBlock}>
              <AppText variant="eyebrow">Recent</AppText>
              <View style={styles.recentRow}>
                {recent.map((c) => (
                  <Pressable key={c.id} style={styles.recentItem} onPress={() => choose(c)} accessibilityLabel={`Choose ${c.name}`}>
                    <Avatar name={c.name} size={48} />
                    <AppText variant="small" numberOfLines={1} style={styles.recentName}>
                      {c.name.split(' ')[0]}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <Pressable style={styles.newButton} onPress={startAdding} accessibilityRole="button">
            <Ionicons name="person-add-outline" size={18} color={Colors.brand} />
            <AppText variant="bodyBold" color={Colors.brand}>
              New customer
            </AppText>
          </Pressable>
        </>
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
  bold: {
    fontFamily: Fonts.bodyBold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAvatar: {
    backgroundColor: Colors.backgroundMuted,
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
  searchBarError: {
    borderColor: Colors.danger,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.two + 4,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLarge,
    color: Colors.text,
  },
  errorText: {
    paddingHorizontal: Spacing.three,
  },
  list: {
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  noMatch: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  recentBlock: {
    gap: Spacing.two,
  },
  recentRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  recentItem: {
    width: 72,
    alignItems: 'center',
    gap: Spacing.one,
  },
  recentName: {
    textAlign: 'center',
    maxWidth: 72,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.brand,
  },
  selectedCard: {
    gap: Spacing.three,
  },
  changeButton: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    backgroundColor: Colors.backgroundMuted,
  },
  changeLabel: {
    fontFamily: Fonts.bodyBold,
  },
  statsBox: {
    gap: Spacing.one + 2,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radii.md,
    padding: Spacing.two + 4,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  formCard: {
    gap: Spacing.three,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  existingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.warningSoft,
    borderRadius: Radii.md,
    padding: Spacing.two + 2,
  },
  occasionBlock: {
    gap: Spacing.two,
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
}));
