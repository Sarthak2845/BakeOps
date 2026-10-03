import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { customersApi, invoicesApi, ordersApi } from './api';
import type { OrderStatus, PaymentStatus } from './types';

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ['customers', search ?? ''],
    queryFn: () => customersApi.list(search).then((r) => r.customers),
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id as string).then((r) => r.customer),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useOrders(filters: { status?: OrderStatus; customerId?: string; from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersApi.list(filters).then((r) => r.orders),
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id as string).then((r) => r.order),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => ordersApi.updateStatus(id, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', vars.id] });
    },
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => ordersApi.generateInvoice(orderId),
    onSuccess: (_data, orderId) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useInvoices(paymentStatus?: PaymentStatus) {
  return useQuery({
    queryKey: ['invoices', paymentStatus ?? ''],
    queryFn: () => invoicesApi.list(paymentStatus).then((r) => r.invoices),
  });
}

export function useInvoice(id?: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id as string).then((r) => r.invoice),
    enabled: !!id,
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, amount, method }: { invoiceId: string; amount: number; method?: string }) =>
      invoicesApi.addPayment(invoiceId, { amount, method }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice', vars.invoiceId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
