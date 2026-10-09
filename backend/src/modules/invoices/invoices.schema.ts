import { z } from "zod";
import { dateSchema, moneySchema } from "../../utils/validation";

export const listInvoicesQuerySchema = z.object({
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
});
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

export const createPaymentSchema = z.object({
  amount: moneySchema.positive(),
  method: z.string().max(40).optional(),
  paidAt: dateSchema.optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
