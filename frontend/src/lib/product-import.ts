import type { Order, Product } from './types';
import { toNumber } from './format';
import { MAX_MONEY } from './validators';

export const MAX_IMPORT_PRODUCTS = 500;

export interface ParsedProduct {
  name: string;
  unitPrice: number;
  unit?: string;
}

export interface ParseFailure {
  line: number;
  text: string;
  reason: string;
}

// The price is the last number on the line. Accepts the ways shops write menus:
//   Black Forest Cake, 950        (also tab-separated, as pasted from Excel/Sheets)
//   Truffle Cake 1kg - ₹1,200
//   Brownie = Rs. 60/-
//   Plum Cake 800/kg
//   Plum Cake, 800, kg
const LINE_RE = /^(.+?)[\s,:=–-]+(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/\s*([a-z]+)|[,\t]\s*([a-z]+)|\/-)?\s*$/i;

const HEADER_RE = /^\W*(name|item|product)\b.*\bprice\b/i;

export function parseProductList(text: string): { products: ParsedProduct[]; failures: ParseFailure[] } {
  const products: ParsedProduct[] = [];
  const failures: ParseFailure[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || HEADER_RE.test(line)) return;

    const fail = (reason: string) => failures.push({ line: index + 1, text: line, reason });
    const match = LINE_RE.exec(line);
    if (!match) return fail('No price found');

    const name = match[1].replace(/[\s,:=–-]+$/, '').trim();
    const unitPrice = parseFloat(match[2].replace(/,/g, ''));
    const unit = match[3] ?? match[4];

    if (!name) return fail('No name found');
    if (name.length > 200) return fail('Name is longer than 200 characters');
    if (unitPrice > MAX_MONEY) return fail('Price is too large');

    const key = name.toLowerCase();
    if (seen.has(key)) return fail('Listed twice');
    seen.add(key);

    products.push({ name, unitPrice, ...(unit ? { unit: unit.toLowerCase() } : {}) });
  });

  return { products, failures };
}

/** Items sold in past orders that aren't saved yet, as importable lines, using each item's latest price. */
export function linesFromPastOrders(orders: Order[], saved: Product[]): string[] {
  const savedNames = new Set(saved.map((p) => p.name.toLowerCase()));
  const lines = new Map<string, string>();

  const newestFirst = [...orders]
    .filter((o) => o.status !== 'CANCELLED')
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  for (const order of newestFirst) {
    for (const item of order.items) {
      const name = item.description.trim();
      const key = name.toLowerCase();
      if (!name || savedNames.has(key) || lines.has(key)) continue;
      lines.set(key, `${name}, ${toNumber(item.unitPrice)}`);
    }
  }
  return [...lines.values()];
}
