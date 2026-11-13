import { z } from "zod";
import { moneySchema } from "../../utils/validation";

export const createProductSchema = z.object({
  // Same limit as OrderItem.description, since a product's name fills that field.
  name: z.string().trim().min(1).max(200),
  unitPrice: moneySchema,
  unit: z.string().trim().min(1).max(20).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

// `unit: null` clears it.
export const updateProductSchema = createProductSchema.partial().extend({
  unit: z.string().trim().min(1).max(20).nullable().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const bulkCreateProductsSchema = z.object({
  products: z.array(createProductSchema).min(1).max(500),
});
export type BulkCreateProductsInput = z.infer<typeof bulkCreateProductsSchema>;

export const listProductsQuerySchema = z.object({
  search: z.string().max(120).optional(),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
