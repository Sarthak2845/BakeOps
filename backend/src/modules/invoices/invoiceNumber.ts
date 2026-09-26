import type { Prisma, PrismaClient } from "@prisma/client";

function prefixFromName(name: string): string {
  const alpha = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (alpha.slice(0, 4) || "INV");
}

export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient | PrismaClient,
  businessId: string,
  businessName: string
): Promise<string> {
  const business = await tx.business.update({
    where: { id: businessId },
    data: { invoiceSequence: { increment: 1 } },
  });

  const year = new Date().getFullYear();
  const sequence = String(business.invoiceSequence).padStart(4, "0");
  return `${prefixFromName(businessName)}-${year}-${sequence}`;
}
