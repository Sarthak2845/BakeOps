import { z } from "zod";

export const listInvoicesQuerySchema = z.object({
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
});
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.string().max(40).optional(),
  paidAt: z.coerce.date().optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
