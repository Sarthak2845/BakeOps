import { ApiError } from './api';

export type FieldErrors = Record<string, string>;

/** An error whose message is already written for the user (e.g. "WhatsApp isn't installed"). */
export class UserFacingError extends Error {}

// Human labels for API field names, used when the server rejects a field the
// screen doesn't render its own inline error for.
const FIELD_LABELS: Record<string, string> = {
  businessName: 'Shop name',
  ownerName: 'Your name',
  name: 'Name',
  email: 'Email',
  password: 'Password',
  phone: 'Phone',
  gstin: 'GSTIN',
  customerId: 'Customer',
  items: 'Items',
  description: 'Item description',
  quantity: 'Quantity',
  unitPrice: 'Unit price',
  occasionTag: 'Occasion tag',
  deliveryDate: 'Delivery date',
  orderDate: 'Order date',
  advancePaid: 'Advance paid',
  amount: 'Amount',
  label: 'Occasion',
  month: 'Occasion month',
  day: 'Occasion day',
};

function labelFor(path: string): string {
  const parts = path.split('.');
  const last = parts[parts.length - 1];
  const itemIndex = parts[0] === 'items' && parts.length > 1 ? Number(parts[1]) : NaN;
  const label = FIELD_LABELS[last] ?? last;
  return Number.isNaN(itemIndex) ? label : `Item ${itemIndex + 1} ${label.toLowerCase()}`;
}

/**
 * Field-level errors from a 400 validation response, keyed by the API's field
 * path ("advancePaid", "items.0.unitPrice").
 */
export function getFieldErrors(err: unknown): FieldErrors {
  if (!(err instanceof ApiError) || err.status !== 400) return {};
  const out: FieldErrors = {};

  for (const issue of err.issues ?? []) {
    if (issue.path && !out[issue.path]) out[issue.path] = issue.message;
  }

  const fieldErrors = (err.details as { fieldErrors?: Record<string, string[] | undefined> } | undefined)?.fieldErrors;
  if (fieldErrors) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0] && !out[field]) out[field] = messages[0];
    }
  }
  return out;
}

/** A sentence the user can act on, for any error thrown by an API call or screen logic. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof UserFacingError) return err.message;
  if (!(err instanceof ApiError)) return fallback;

  if (err.status === 0) return "Can't reach the server. Check your internet connection and try again.";
  if (err.status === 401) return err.message && err.message !== 'Unauthorized' ? err.message : 'Your session has expired. Please log in again.';
  if (err.status === 403) return "You don't have permission to do that.";
  if (err.status === 404) return err.message || 'We couldn’t find that. It may have been deleted.';
  if (err.status === 413) return 'That request is too large. Please shorten it and try again.';
  if (err.status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (err.status >= 500) return 'Something went wrong on our side. Please try again in a moment.';

  if (err.status === 400) {
    const fields = Object.entries(getFieldErrors(err));
    if (fields.length > 0) {
      const [path, message] = fields[0];
      const more = fields.length > 1 ? ` (and ${fields.length - 1} more)` : '';
      return `${labelFor(path)}: ${message}${more}`;
    }
  }

  return err.message || fallback;
}
