import { z } from "zod";
import { dateSchema, moneySchema, quantitySchema } from "../../utils/validation";

export const orderStatusValues = [
  "INQUIRY",
  "CONFIRMED",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;
export const orderStatusSchema = z.enum(orderStatusValues);

export const orderItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: quantitySchema.default(1),
  unitPrice: moneySchema,
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  orderDate: dateSchema.optional(),
  deliveryDate: dateSchema.optional(),
  occasionTag: z.string().max(60).optional(),
  advancePaid: moneySchema.default(0),
  notes: z.string().max(1000).optional(),
  items: z.array(orderItemSchema).min(1),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  deliveryDate: dateSchema.optional(),
  occasionTag: z.string().max(60).optional(),
  advancePaid: moneySchema.optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(orderItemSchema).min(1).optional(),
});
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const listOrdersQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  customerId: z.string().optional(),
  occasionTag: z.string().optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
