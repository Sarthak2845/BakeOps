import type { Request, Response } from "express";
import { getParam } from "../../utils/params";
import { isAllowedLogoUrl } from "../business/business.schema";
import * as invoicesService from "./invoices.service";

export async function generateInvoiceHandler(req: Request, res: Response) {
  const invoice = await invoicesService.generateInvoice(req.auth!.businessId, getParam(req.params, "id"));
  res.status(201).json({ invoice });
}

export async function listInvoicesHandler(req: Request, res: Response) {
  const invoices = await invoicesService.listInvoices(req.auth!.businessId, req.validatedQuery as never);
  res.json({ invoices });
}

export async function getInvoiceHandler(req: Request, res: Response) {
  const invoice = await invoicesService.getInvoice(req.auth!.businessId, getParam(req.params, "id"));
  res.json({ invoice });
}

export async function addPaymentHandler(req: Request, res: Response) {
  const invoice = await invoicesService.addPayment(
    req.auth!.businessId,
    getParam(req.params, "id"),
    req.body
  );
  res.status(201).json({ invoice });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function publicReceiptHandler(req: Request, res: Response) {
  const { business, invoice } = await invoicesService.getPublicInvoice(
    getParam(req.params, "slug"),
    getParam(req.params, "invoiceNumber")
  );
  const { order } = invoice;
  const money = (n: unknown) => `${business.currency} ${Number(n).toFixed(2)}`;

  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td style="text-align:right">${money(item.unitPrice)}</td>
          <td style="text-align:right">${money(item.lineTotal)}</td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)} — ${escapeHtml(business.name)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; color: #1a1a1a; }
    h1 { font-size: 1.4rem; margin-bottom: 0; }
    .muted { color: #666; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { text-align: left; border-bottom: 1px solid #ddd; padding: 8px 4px; font-size: 0.85rem; color: #666; }
    td { padding: 8px 4px; border-bottom: 1px solid #f0f0f0; }
    .totals td { border: none; padding: 4px; }
    .totals .label { text-align: right; color: #666; }
    .totals .value { text-align: right; width: 120px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo { width: 56px; height: 56px; border-radius: 12px; object-fit: contain; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eef; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="brand">
    ${business.logoUrl && isAllowedLogoUrl(business.logoUrl) ? `<img class="logo" src="${escapeHtml(business.logoUrl)}" alt="" />` : ""}
    <h1>${escapeHtml(business.name)}</h1>
  </div>
  <p class="muted">${escapeHtml(business.address ?? "")}</p>
  <h2>Invoice ${escapeHtml(invoice.invoiceNumber)}</h2>
  <p class="muted">Issued ${new Date(invoice.issuedDate).toDateString()} &middot;
    <span class="status">${escapeHtml(invoice.paymentStatus)}</span>
  </p>
  <p><strong>Bill to:</strong> ${escapeHtml(order.customer.name)} (${escapeHtml(order.customer.phone)})</p>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td class="label">Total</td><td class="value">${money(order.totalAmount)}</td></tr>
    <tr><td class="label">Advance Paid</td><td class="value">${money(order.advancePaid)}</td></tr>
    <tr><td class="label"><strong>Balance Due</strong></td><td class="value"><strong>${money(order.balanceDue)}</strong></td></tr>
  </table>
  ${invoice.pdfUrl ? `<p><a href="${invoice.pdfUrl}">Download PDF</a></p>` : ""}
  <p class="muted">Thank you for ordering!</p>
</body>
</html>`;

  res.type("html").send(html);
}
