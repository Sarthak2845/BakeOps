import type {
  AuthUser,
  Business,
  Customer,
  CustomerDetail,
  CustomerOccasion,
  Invoice,
  Order,
  OrderStatus,
  PaymentStatus,
} from './types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, body?.error?.details);
  }

  return body as T;
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries as [string, string][]).toString();
}

export const authApi = {
  register(input: {
    businessName: string;
    category?: string;
    ownerName: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    return apiFetch<{ token: string; business: Business; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  login(input: { email: string; password: string }) {
    return apiFetch<{ token: string; business: Business; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};

export const businessApi = {
  getMe() {
    return apiFetch<{ business: Business }>('/api/business/me');
  },
  updateMe(input: Partial<Business>) {
    return apiFetch<{ business: Business }>('/api/business/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};

export const customersApi = {
  list(search?: string) {
    return apiFetch<{ customers: Customer[] }>(`/api/customers${qs({ search })}`);
  },
  get(id: string) {
    return apiFetch<{ customer: CustomerDetail }>(`/api/customers/${id}`);
  },
  create(input: { name: string; phone: string; email?: string; address?: string; notes?: string }) {
    return apiFetch<{ customer: Customer }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(id: string, input: Partial<{ name: string; phone: string; email: string; address: string; notes: string }>) {
    return apiFetch<{ customer: Customer }>(`/api/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  remove(id: string) {
    return apiFetch<void>(`/api/customers/${id}`, { method: 'DELETE' });
  },
  addOccasion(customerId: string, input: { label: string; month: number; day: number }) {
    return apiFetch<{ occasion: CustomerOccasion }>(`/api/customers/${customerId}/occasions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};

export const ordersApi = {
  list(filters: { status?: OrderStatus; customerId?: string; occasionTag?: string; from?: string; to?: string } = {}) {
    return apiFetch<{ orders: Order[] }>(`/api/orders${qs(filters)}`);
  },
  get(id: string) {
    return apiFetch<{ order: Order }>(`/api/orders/${id}`);
  },
  create(input: {
    customerId: string;
    orderDate?: string;
    deliveryDate?: string;
    occasionTag?: string;
    advancePaid?: number;
    notes?: string;
    items: { description: string; quantity: number; unitPrice: number }[];
  }) {
    return apiFetch<{ order: Order }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateStatus(id: string, status: OrderStatus) {
    return apiFetch<{ order: Order }>(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  remove(id: string) {
    return apiFetch<void>(`/api/orders/${id}`, { method: 'DELETE' });
  },
  generateInvoice(orderId: string) {
    return apiFetch<{ invoice: Invoice }>(`/api/orders/${orderId}/invoice`, { method: 'POST' });
  },
};

export const invoicesApi = {
  list(paymentStatus?: PaymentStatus) {
    return apiFetch<{ invoices: Invoice[] }>(`/api/invoices${qs({ paymentStatus })}`);
  },
  get(id: string) {
    return apiFetch<{ invoice: Invoice }>(`/api/invoices/${id}`);
  },
  addPayment(invoiceId: string, input: { amount: number; method?: string }) {
    return apiFetch<{ invoice: Invoice }>(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  publicReceiptUrl(slug: string, invoiceNumber: string) {
    return `${API_URL}/r/${slug}/${invoiceNumber}`;
  },
};
