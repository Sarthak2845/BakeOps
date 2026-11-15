import { z } from "zod";
import { isAllowedLogoUrl } from "../business/business.schema";

export const registerSchema = z.object({
  businessName: z.string().min(2).max(120),
  category: z.string().max(60).optional(),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().max(30).optional(),
  // Optional: uploaded to Cloudinary from the register screen.
  logoUrl: z.string().max(500).refine(isAllowedLogoUrl, "Logo must be an image uploaded to Cloudinary").optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;
