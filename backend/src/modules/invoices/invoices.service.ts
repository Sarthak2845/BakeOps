import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import { moduleLogger } from "../../utils/logger";
import { nextInvoiceNumber } from "./invoiceNumber";
import { renderInvoicePdf } from "./invoice.pdf";
import type { CreatePaymentInput, ListInvoicesQuery } from "./invoices.schema";

const log = moduleLogger("invoices");

const STORAGE_DIR = path.join(__dirname, "..", "..", "..", "storage", "invoices");

async function writeInvoicePdf(invoiceNumber: string, buffer: Buffer): Promise<string> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const filename = `${invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
  await fs.writeFile(path.join(STORAGE_DIR, filename), buffer);
  return `/files/invoices/${filename}`;
}

export async function generateInvoice(businessId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
    include: { items: true, customer: true, invoice: true, business: true },
  });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.invoice) {
    log.warn(
      { event: "invoice.generate_rejected", orderId, invoiceId: order.invoice.id, reason: "already_invoiced" },
      "order already has an invoice"
    );
    throw ApiError.conflict("This order already has an invoice", {
      invoiceId: order.invoice.id,
    });
  }
  if (order.status === "CANCELLED") {
    log.warn(
      { event: "invoice.generate_rejected", orderId, reason: "order_cancelled" },
      "cannot invoice a cancelled order"
    );
    throw ApiError.badRequest("Cannot generate an invoice for a cancelled order");
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextInvoiceNumber(tx, businessId, order.business.name);

    return tx.invoice.create({
      data: {
        businessId,
        orderId,
        invoiceNumber,
      },
    });
  });

  log.info(
    { event: "invoice.created", invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, orderId },
    "invoice record created"
  );

  // The invoice row is already committed at this point. If the PDF step
  // fails, the invoice exists without a pdfUrl, so log enough to find and
  // repair it.
  let pdfUrl: string;
  const pdfStartedAt = performance.now();
  try {
    const pdfBuffer = await renderInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: invoice.issuedDate,
      business: order.business,
      customer: order.customer,
      items: order.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      totalAmount: Number(order.totalAmount),
      advancePaid: Number(order.advancePaid),
      balanceDue: Number(order.balanceDue),
      paymentStatus: invoice.paymentStatus,
      currency: order.business.currency,
    });

    pdfUrl = await writeInvoicePdf(invoice.invoiceNumber, pdfBuffer);
    log.info(
      {
        event: "invoice.pdf_generated",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderId,
        pdfUrl,
        sizeBytes: pdfBuffer.length,
        durationMs: Math.round(performance.now() - pdfStartedAt),
      },
      "invoice PDF generated"
    );
  } catch (err) {
    log.error(
      { event: "invoice.pdf_failed", err, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, orderId },
      "invoice PDF generation failed; invoice exists without a PDF"
    );
    throw err;
  }

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: { pdfUrl },
    include: { order: { include: { items: true, customer: true } } },
  });
}

export async function listInvoices(businessId: string, query: ListInvoicesQuery) {
  return prisma.invoice.findMany({
    where: { businessId, ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}) },
    include: { order: { include: { customer: true } }, payments: true },
    orderBy: { issuedDate: "desc" },
  });
}

async function findInvoiceOrThrow(businessId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: { order: { include: { items: true, customer: true } }, payments: true },
  });
  if (!invoice) throw ApiError.notFound("Invoice not found");
  return invoice;
}

export async function getInvoice(businessId: string, invoiceId: string) {
  return findInvoiceOrThrow(businessId, invoiceId);
}

export async function getPublicInvoice(slug: string, invoiceNumber: string) {
  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) {
    log.warn({ event: "receipt.not_found", slug, invoiceNumber, reason: "unknown_business" }, "public receipt not found");
    throw ApiError.notFound("Not found");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { businessId_invoiceNumber: { businessId: business.id, invoiceNumber } },
    include: { order: { include: { items: true, customer: true } } },
  });
  if (!invoice) {
    log.warn(
      { event: "receipt.not_found", businessId: business.id, slug, invoiceNumber, reason: "unknown_invoice" },
      "public receipt not found"
    );
    throw ApiError.notFound("Not found");
  }

  log.info(
    { event: "receipt.viewed", businessId: business.id, invoiceId: invoice.id, invoiceNumber },
    "public receipt viewed"
  );
  return { business, invoice };
}

function recomputePaymentStatus(totalAmount: number, paidSoFar: number): "UNPAID" | "PARTIAL" | "PAID" {
  if (paidSoFar <= 0) return "UNPAID";
  if (paidSoFar >= totalAmount) return "PAID";
  return "PARTIAL";
}

export async function addPayment(businessId: string, invoiceId: string, input: CreatePaymentInput) {
  const invoice = await findInvoiceOrThrow(businessId, invoiceId);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt ?? new Date(),
      },
    });

    const payments = await tx.payment.findMany({ where: { invoiceId } });
    const paidSoFar = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = Number(invoice.order.totalAmount);
    const paymentStatus = recomputePaymentStatus(totalAmount, paidSoFar);
    const balanceDue = Math.max(0, Math.round((totalAmount - paidSoFar) * 100) / 100);

    await tx.order.update({ where: { id: invoice.orderId }, data: { balanceDue } });

    const result = await tx.invoice.update({
      where: { id: invoiceId },
      data: { paymentStatus },
      include: { order: { include: { items: true, customer: true } }, payments: true },
    });
    return { result, paidSoFar, balanceDue, paymentStatus };
  });

  log.info(
    {
      event: "invoice.payment_recorded",
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      amount: input.amount,
      method: input.method,
      paidSoFar: updated.paidSoFar,
      balanceDue: updated.balanceDue,
      paymentStatus: { from: invoice.paymentStatus, to: updated.paymentStatus },
    },
    "payment recorded"
  );
  if (updated.paidSoFar > Number(invoice.order.totalAmount)) {
    log.warn(
      {
        event: "invoice.overpaid",
        invoiceId,
        orderId: invoice.orderId,
        paidSoFar: updated.paidSoFar,
        totalAmount: Number(invoice.order.totalAmount),
      },
      "payments exceed invoice total"
    );
  }

  return updated.result;
}
