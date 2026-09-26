import { z } from "zod";

export const updateBusinessSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: z.string().max(60).optional(),
  logoUrl: z.string().url().optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  gstin: z.string().max(30).optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(60).optional(),
});
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
