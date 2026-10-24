import { z } from "zod";
import { env } from "../../config/env";

// The server downloads the logo to embed it in invoice PDFs, so only accept
// Cloudinary image URLs — never arbitrary hosts the server would fetch.
export function isAllowedLogoUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.port) return false;
  const [cloud, resource, delivery] = url.pathname.split("/").filter(Boolean);
  if (resource !== "image" || delivery !== "upload") return false;
  return !env.cloudinaryCloudName || cloud === env.cloudinaryCloudName;
}

export const updateBusinessSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: z.string().max(60).optional(),
  logoUrl: z
    .string()
    .max(500)
    .refine(isAllowedLogoUrl, "Logo must be an image uploaded to Cloudinary")
    .nullable()
    .optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  gstin: z.string().max(30).optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(60).optional(),
});
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
