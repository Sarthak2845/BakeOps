import { z } from "zod";

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
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().nonnegative(),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  orderDate: z.coerce.date().optional(),
  deliveryDate: z.coerce.date().optional(),
  occasionTag: z.string().max(60).optional(),
  advancePaid: z.coerce.number().nonnegative().default(0),
  notes: z.string().max(1000).optional(),
  items: z.array(orderItemSchema).min(1),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  deliveryDate: z.coerce.date().optional(),
  occasionTag: z.string().max(60).optional(),
  advancePaid: z.coerce.number().nonnegative().optional(),
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
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
