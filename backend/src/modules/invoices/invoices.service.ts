import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import { moduleLogger } from "../../utils/logger";
import { nextInvoiceNumber } from "./invoiceNumber";
import { fetchLogoForPdf } from "./invoice.logo";
import { renderInvoicePdf } from "./invoice.pdf";
import type { CreatePaymentInput, ListInvoicesQuery } from "./invoices.schema";

const log = moduleLogger("invoices");

// PDFs are rendered on request rather than saved to disk: hosts like Render
// wipe the local filesystem on every deploy/restart, and rendering live means
// the PDF always shows the current payment status.
export function invoicePdfPath(slug: string, invoiceNumber: string): string {
  return `/r/${encodeURIComponent(slug)}/${encodeURIComponent(invoiceNumber)}/pdf`;
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
        pdfUrl: invoicePdfPath(order.business.slug, invoiceNumber),
      },
      include: { order: { include: { items: true, customer: true } } },
    });
  });

  log.info(
    { event: "invoice.created", invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, orderId },
    "invoice record created"
  );

  return invoice;
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

/** Renders a receipt's PDF on demand for the public /r/:slug/:invoiceNumber/pdf link. */
export async function renderPublicInvoicePdf(slug: string, invoiceNumber: string) {
  const { business, invoice } = await getPublicInvoice(slug, invoiceNumber);
  const { order } = invoice;
  const startedAt = performance.now();

  const pdf = await renderInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issuedDate: invoice.issuedDate,
    business: { ...business, logo: await fetchLogoForPdf(business.logoUrl) },
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
    currency: business.currency,
  });

  log.info(
    {
      event: "invoice.pdf_rendered",
      invoiceId: invoice.id,
      invoiceNumber,
      sizeBytes: pdf.length,
      durationMs: Math.round(performance.now() - startedAt),
    },
    "invoice PDF rendered"
  );
  return { pdf, filename: `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf` };
}
