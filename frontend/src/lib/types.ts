// Decimal fields come back from the API as strings (Prisma Decimal -> JSON),
// e.g. "950.00" — never trust them as numbers without parsing.

export type UserRole = 'OWNER' | 'STAFF';

export type OrderStatus = 'INQUIRY' | 'CONFIRMED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface Business {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  currency: string;
  timezone: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId: string;
}

export interface CustomerOccasion {
  id: string;
  customerId: string;
  label: string;
  month: number;
  day: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  occasions?: CustomerOccasion[];
}

export interface CustomerDetail extends Customer {
  orders: Order[];
  occasions: CustomerOccasion[];
  lifetimeValue: number;
  orderCount: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  businessId: string;
  customerId: string;
  orderDate: string;
  deliveryDate: string | null;
  status: OrderStatus;
  occasionTag: string | null;
  advancePaid: string;
  totalAmount: string;
  balanceDue: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  customer: Customer;
  invoice?: Invoice | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  method: string | null;
  paidAt: string;
}

export interface Invoice {
  id: string;
  businessId: string;
  orderId: string;
  invoiceNumber: string;
  issuedDate: string;
  pdfUrl: string | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  order: Order;
  payments?: Payment[];
}
