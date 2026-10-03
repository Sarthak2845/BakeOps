import { daysBetween, toNumber } from './format';
import type { Customer, CustomerOccasion, Invoice, Order } from './types';

const ACTIVE_STATUSES = new Set(['INQUIRY', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'DELIVERED']);

export function isActiveOrder(order: Order): boolean {
  return order.status !== 'CANCELLED';
}

export function nextOccurrence(occasion: CustomerOccasion, today: Date): Date {
  const year = today.getFullYear();
  let date = new Date(year, occasion.month - 1, occasion.day);
  if (daysBetween(today, date) < 0) {
    date = new Date(year + 1, occasion.month - 1, occasion.day);
  }
  return date;
}

export interface UpcomingOccasion {
  customer: Customer;
  occasion: CustomerOccasion;
  daysUntil: number;
  yearsRunning: number;
  lastOrderSummary: string | null;
}

export function ordersForOccasion(orders: Order[], customerId: string, label: string): Order[] {
  const needle = label.trim().toLowerCase();
  return orders
    .filter((o) => o.customerId === customerId && isActiveOrder(o) && (o.occasionTag ?? '').trim().toLowerCase() === needle)
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
}

function yearsRunningStreak(matchingOrders: Order[], today: Date): number {
  const years = new Set(matchingOrders.map((o) => new Date(o.orderDate).getFullYear()));
  let year = today.getFullYear() - 1;
  let streak = 0;
  while (years.has(year)) {
    streak += 1;
    year -= 1;
  }
  return streak;
}

function summarizeOrder(order: Order): string {
  const itemsDesc = order.items.map((i) => i.description).join(', ');
  return `${itemsDesc} · ₹${Math.round(toNumber(order.totalAmount)).toLocaleString('en-IN')}`;
}

export function getUpcomingOccasions(
  customers: Customer[],
  orders: Order[],
  today: Date,
  withinDays = 30
): UpcomingOccasion[] {
  const results: UpcomingOccasion[] = [];

  for (const customer of customers) {
    for (const occasion of customer.occasions ?? []) {
      const next = nextOccurrence(occasion, today);
      const daysUntil = daysBetween(today, next);
      if (daysUntil < 0 || daysUntil > withinDays) continue;

      const matching = ordersForOccasion(orders, customer.id, occasion.label);
      results.push({
        customer,
        occasion,
        daysUntil,
        yearsRunning: yearsRunningStreak(matching, today),
        lastOrderSummary: matching.length > 0 ? summarizeOrder(matching[0]) : null,
      });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function isToday(dateStr: string | null | undefined, today: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.toDateString() === today.toDateString();
}

export function dateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function monthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

export function ordersInRange(orders: Order[], start: Date, end: Date, dateField: 'orderDate' | 'deliveryDate' = 'orderDate') {
  return orders.filter((o) => {
    const raw = o[dateField];
    if (!raw) return false;
    const d = new Date(raw);
    return d >= start && d <= end && isActiveOrder(o);
  });
}

export function sumTotals(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + toNumber(o.totalAmount), 0);
}

export function sumBalanceDue(orders: Order[]): number {
  return orders.filter(isActiveOrder).reduce((sum, o) => sum + toNumber(o.balanceDue), 0);
}

export interface FlavourStat {
  description: string;
  count: number;
  revenue: number;
}

export function topFlavours(orders: Order[], limit = 4): FlavourStat[] {
  const map = new Map<string, FlavourStat>();
  for (const order of orders) {
    if (!isActiveOrder(order)) continue;
    for (const item of order.items) {
      const key = item.description.trim();
      const existing = map.get(key) ?? { description: key, count: 0, revenue: 0 };
      existing.count += toNumber(item.quantity);
      existing.revenue += toNumber(item.lineTotal);
      map.set(key, existing);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function repeatRate(orders: Order[]): number {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (!isActiveOrder(order)) continue;
    counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1);
  }
  const total = counts.size;
  if (total === 0) return 0;
  const repeat = Array.from(counts.values()).filter((c) => c > 1).length;
  return Math.round((repeat / total) * 100);
}

export function ordersOnDate(orders: Order[], date: Date, dateField: 'orderDate' | 'deliveryDate' = 'deliveryDate') {
  return orders.filter((o) => {
    const raw = o[dateField];
    return raw && new Date(raw).toDateString() === date.toDateString() && isActiveOrder(o);
  });
}

export interface DueRow {
  invoice: Invoice;
  balance: number;
  overdueDays: number | null;
}

export interface MoneyBreakdown {
  totalDue: number;
  customerCount: number;
  overdueCount: number;
  dueLater: number;
  dueThisWeek: number;
  overdue: number;
  rows: DueRow[];
  receivedThisWeek: { invoice: Invoice; amount: number; method: string | null; paidAt: string }[];
}

export function getMoneyBreakdown(invoices: Invoice[], today: Date): MoneyBreakdown {
  let dueLater = 0;
  let dueThisWeek = 0;
  let overdue = 0;
  let overdueCount = 0;
  const customerIds = new Set<string>();
  const rows: DueRow[] = [];

  for (const invoice of invoices) {
    const balance = toNumber(invoice.order.balanceDue);
    if (balance <= 0) continue;

    customerIds.add(invoice.order.customerId);
    const referenceDate = invoice.order.deliveryDate ? new Date(invoice.order.deliveryDate) : new Date(invoice.issuedDate);
    const diff = daysBetween(referenceDate, today);

    let overdueDays: number | null = null;
    if (diff > 0) {
      overdueDays = diff;
      overdue += balance;
      overdueCount += 1;
    } else if (diff >= -7) {
      dueThisWeek += balance;
    } else {
      dueLater += balance;
    }

    rows.push({ invoice, balance, overdueDays });
  }

  rows.sort((a, b) => (b.overdueDays ?? -999) - (a.overdueDays ?? -999));

  const receivedThisWeek = invoices
    .flatMap((invoice) => (invoice.payments ?? []).map((p) => ({ invoice, amount: toNumber(p.amount), method: p.method, paidAt: p.paidAt })))
    .filter((p) => daysBetween(new Date(p.paidAt), today) <= 7)
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  return {
    totalDue: dueLater + dueThisWeek + overdue,
    customerCount: customerIds.size,
    overdueCount,
    dueLater,
    dueThisWeek,
    overdue,
    rows,
    receivedThisWeek,
  };
}

export { ACTIVE_STATUSES };
