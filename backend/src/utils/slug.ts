import slugify from "slugify";
import type { PrismaClient } from "@prisma/client";

export async function generateUniqueBusinessSlug(
  prisma: PrismaClient,
  name: string
): Promise<string> {
  const base = slugify(name, { lower: true, strict: true }) || "business";
  let candidate = base;
  let suffix = 1;

  while (await prisma.business.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
