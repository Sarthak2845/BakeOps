// Client-side mirrors of the backend's zod limits, so the user sees what's
// wrong next to the field before a request is sent.
export const MAX_MONEY = 9_999_999_999.99;
export const MAX_QUANTITY = 99_999_999.99;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

const NUMBER_RE = /^\d+(\.\d+)?$/;

export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required`;
}

export function validateLength(value: string, label: string, { min = 0, max }: { min?: number; max: number }): string | null {
  const len = value.trim().length;
  if (min > 0 && len < min) return `${label} must be at least ${min} characters`;
  if (len > max) return `${label} must be at most ${max} characters`;
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Email is required';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Enter a valid email address';
}

export function validatePhone(value: string, { required = true }: { required?: boolean } = {}): string | null {
  const v = value.trim();
  if (!v) return required ? 'Phone number is required' : null;
  if (!/^[+\d\s()-]+$/.test(v)) return 'Phone can only contain digits, spaces, +, - and ()';
  const digits = v.replace(/\D/g, '').length;
  if (digits < 7 || digits > 15) return 'Enter a valid phone number';
  if (v.length > 30) return 'Phone must be at most 30 characters';
  return null;
}

/** Validates a non-negative amount typed by the user. */
export function validateMoney(value: string, label: string, { required = false, positive = false } = {}): string | null {
  const v = value.trim();
  if (!v) return required ? `${label} is required` : null;
  if (!NUMBER_RE.test(v)) return `${label} must be a number`;
  const n = parseFloat(v);
  if (positive && n <= 0) return `${label} must be more than 0`;
  if (n > MAX_MONEY) return `${label} is too large`;
  return null;
}

export function validateQuantity(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Qty is required';
  if (!NUMBER_RE.test(v)) return 'Qty must be a number';
  const n = parseFloat(v);
  if (n <= 0) return 'Qty must be more than 0';
  if (n > MAX_QUANTITY) return 'Qty is too large';
  return null;
}

/** Parses a strict YYYY-MM-DD date, rejecting impossible dates like 2026-02-31. */
export function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function validateDateInput(value: string, label: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const date = parseDateInput(v);
  if (!date) return `${label} must be a real date in YYYY-MM-DD format`;
  const year = date.getFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return `${label} must be between ${MIN_YEAR} and ${MAX_YEAR}`;
  return null;
}

/** Parses "MM-DD" for a yearly occasion. */
export function parseMonthDay(value: string): { month: number; day: number } | null {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  // 2024 is a leap year, so 02-29 is allowed.
  const probe = new Date(2024, month - 1, day);
  if (month < 1 || month > 12 || probe.getMonth() !== month - 1) return null;
  return { month, day };
}

export function hasErrors(errors: Record<string, string | null | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
