// Works out which reminder notifications the next few days need, from the
// shop's orders and customers. Pure (no React Native), so it's easy to check;
// src/lib/notifications.ts hands the result to the phone (issue #37).

import { deliveriesOn, hasDeliveryTime, isActiveOrder, isOpenOrder, nextOccurrence, prepList } from './business-logic';
import { formatDate, formatMoney, formatTime, toNumber } from './format';
import type { Customer, Order } from './types';

export interface ReminderSettings {
  /** Master switch: off cancels every reminder. */
  enabled: boolean;
  /** Each day with deliveries: what's going out today. */
  morning: boolean;
  morningHour: number;
  /** The evening before a delivery day: what to prepare. */
  evening: boolean;
  eveningHour: number;
  /** Before a delivery with a set time. */
  beforeDelivery: boolean;
  hoursBefore: number;
  /** After delivery, while a balance is still due; plus a Monday summary. */
  payments: boolean;
  /** A week before a customer's saved occasion. */
  occasions: boolean;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  morning: true,
  morningHour: 8,
  evening: true,
  eveningHour: 20,
  beforeDelivery: true,
  hoursBefore: 2,
  payments: true,
  occasions: true,
};

export interface PlannedReminder {
  /** Stable id, so the same reminder keeps the same id across re-plans. */
  id: string;
  date: Date;
  title: string;
  body: string;
  /** App route to open when tapped. */
  url: string;
}

/** How far ahead reminders are scheduled. They're re-planned every time the app opens. */
export const HORIZON_DAYS = 7;
/** Android allows ~500 scheduled alarms per app; stay far below. */
const MAX_REMINDERS = 64;
const MAX_LINES = 4;
const PAYMENT_FOLLOW_UP_DAYS = [1, 7];
const OCCASION_DAYS_AHEAD = 7;

function atHour(day: Date, hour: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function dayId(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function deliveries(n: number): string {
  return `${n} ${n === 1 ? 'delivery' : 'deliveries'}`;
}

function qty(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function itemsSummary(order: Order): string {
  const first = order.items[0];
  if (!first) return 'No items';
  const q = toNumber(first.quantity);
  return `${q !== 1 ? `${qty(q)}× ` : ''}${first.description}${order.items.length > 1 ? ` +${order.items.length - 1} more` : ''}`;
}

function withMore(lines: string[], total: number, separator = '\n'): string {
  const shown = lines.slice(0, MAX_LINES);
  const rest = total - shown.length;
  return shown.join(separator) + (rest > 0 ? `${separator}+${rest} more` : '');
}

function deliveryLine(order: Order): string {
  const time = order.deliveryDate && hasDeliveryTime(order.deliveryDate) ? formatTime(order.deliveryDate) : 'Any time';
  return `${time} · ${order.customer?.name ?? 'Customer'} · ${itemsSummary(order)}`;
}

export function planReminders(
  orders: Order[],
  customers: Customer[],
  settings: ReminderSettings,
  now: Date
): PlannedReminder[] {
  if (!settings.enabled) return [];

  const out: PlannedReminder[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizonEnd = addDays(today, HORIZON_DAYS + 1); // exclusive
  const add = (r: PlannedReminder) => {
    if (r.date > now && r.date < horizonEnd) out.push(r);
  };
  const openDeliveriesOn = (day: Date) => deliveriesOn(orders, day).filter(isOpenOrder);

  for (let d = 0; d <= HORIZON_DAYS; d++) {
    const day = addDays(today, d);

    // Morning brief: today's deliveries.
    if (settings.morning) {
      const list = openDeliveriesOn(day);
      if (list.length > 0) {
        add({
          id: `morning:${dayId(day)}`,
          date: atHour(day, settings.morningHour),
          title: `Today: ${deliveries(list.length)}`,
          body: withMore(list.map(deliveryLine), list.length),
          url: '/',
        });
      }
    }

    // Evening before: what to prepare for tomorrow.
    if (settings.evening) {
      const tomorrow = addDays(day, 1);
      const list = openDeliveriesOn(tomorrow);
      if (list.length > 0) {
        const prep = prepList(list);
        const body =
          prep.length > 0
            ? 'Prep: ' + withMore(prep.map((p) => `${qty(p.quantity)}× ${p.description}`), prep.length, ', ')
            : withMore(list.map(deliveryLine), list.length);
        add({
          id: `evening:${dayId(day)}`,
          date: atHour(day, settings.eveningHour),
          title: `Tomorrow: ${deliveries(list.length)}`,
          body,
          url: '/',
        });
      }
    }
  }

  // A few hours before each delivery that has a set time.
  if (settings.beforeDelivery) {
    for (const order of orders) {
      if (!order.deliveryDate || !isOpenOrder(order) || !hasDeliveryTime(order.deliveryDate)) continue;
      const due = new Date(order.deliveryDate);
      const h = settings.hoursBefore;
      add({
        id: `before:${order.id}`,
        date: new Date(due.getTime() - h * 60 * 60 * 1000),
        title: `In ${plural(h, 'hour')}: ${order.customer?.name ?? 'a delivery'}`,
        body: `${itemsSummary(order)} at ${formatTime(order.deliveryDate)}`,
        url: `/orders/${order.id}`,
      });
    }
  }

  // Money still to collect after delivery.
  if (settings.payments) {
    const unpaid = orders.filter((o) => o.status === 'DELIVERED' && toNumber(o.balanceDue) > 0);
    for (const order of unpaid) {
      const delivered = new Date(order.deliveryDate ?? order.updatedAt);
      const deliveredDay = new Date(delivered.getFullYear(), delivered.getMonth(), delivered.getDate());
      for (const after of PAYMENT_FOLLOW_UP_DAYS) {
        add({
          id: `payment:${order.id}:${after}`,
          date: atHour(addDays(deliveredDay, after), settings.morningHour),
          title: `Collect ${formatMoney(order.balanceDue)} from ${order.customer?.name ?? 'a customer'}`,
          body: `${itemsSummary(order)} · delivered ${formatDate(order.deliveryDate ?? order.updatedAt)}`,
          url: `/orders/${order.id}`,
        });
      }
    }

    // Every Monday: everything still owed, so old balances aren't forgotten.
    if (unpaid.length > 0) {
      const total = unpaid.reduce((sum, o) => sum + toNumber(o.balanceDue), 0);
      const people = new Set(unpaid.map((o) => o.customerId)).size;
      for (let d = 0; d <= HORIZON_DAYS; d++) {
        const day = addDays(today, d);
        if (day.getDay() !== 1) continue;
        add({
          id: `payments-week:${dayId(day)}`,
          date: atHour(day, settings.morningHour),
          title: `${formatMoney(total)} still to collect`,
          body: `From ${plural(people, 'customer')}. Tap to see who owes what.`,
          url: '/money',
        });
      }
    }
  }

  // A week before a customer's birthday, anniversary, …
  if (settings.occasions) {
    for (const customer of customers) {
      for (const occasion of customer.occasions ?? []) {
        const next = nextOccurrence(occasion, today);
        const remindOn = addDays(next, -OCCASION_DAYS_AHEAD);
        const last = orders
          .filter(
            (o) =>
              o.customerId === customer.id &&
              isActiveOrder(o) &&
              (o.occasionTag ?? '').trim().toLowerCase() === occasion.label.trim().toLowerCase()
          )
          .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0];
        add({
          id: `occasion:${occasion.id}:${next.getFullYear()}`,
          date: atHour(remindOn, settings.morningHour),
          title: `${customer.name}'s ${occasion.label} is in a week`,
          body: last
            ? `Last time: ${itemsSummary(last)} · ${formatMoney(last.totalAmount)}. A good moment to send a message.`
            : 'A good moment to send a message about a cake.',
          url: '/',
        });
      }
    }
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_REMINDERS);
}
