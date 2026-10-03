export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : parseFloat(value);
}

export function formatMoney(value: string | number | null | undefined, currency = 'INR'): string {
  const n = toNumber(value);
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return `${symbol}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDate(value: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short' });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / msPerDay);
}
