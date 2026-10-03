import { Platform } from 'react-native';

import { formatDate, toNumber } from './format';
import type { Order } from './types';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ordersToCsv(orders: Order[]): string {
  const header = ['Date', 'Customer', 'Phone', 'Items', 'Occasion', 'Status', 'Total', 'Advance', 'Balance'];
  const rows = orders.map((o) => [
    formatDate(o.orderDate, { day: 'numeric', month: 'short', year: 'numeric' }),
    o.customer.name,
    o.customer.phone,
    o.items.map((i) => `${i.description} x${i.quantity}`).join('; '),
    o.occasionTag ?? '',
    o.status,
    toNumber(o.totalAmount).toFixed(2),
    toNumber(o.advancePaid).toFixed(2),
    toNumber(o.balanceDue).toFixed(2),
  ]);

  return [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n');
}

export async function exportOrdersCsv(orders: Order[], filename: string): Promise<void> {
  const csv = ordersToCsv(orders);

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const [{ File, Paths }, Sharing] = await Promise.all([import('expo-file-system'), import('expo-sharing')]);

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export orders' });
  }
}
