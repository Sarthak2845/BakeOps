import PDFDocument from "pdfkit";

export interface InvoicePdfData {
  invoiceNumber: string;
  issuedDate: Date;
  business: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    gstin?: string | null;
  };
  customer: {
    name: string;
    phone: string;
    address?: string | null;
  };
  items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: string;
  currency: string;
}

export function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const money = (n: number) => `${data.currency} ${n.toFixed(2)}`;

    doc.fontSize(20).text(data.business.name, { continued: false });
    doc.fontSize(10).fillColor("#555");
    if (data.business.address) doc.text(data.business.address);
    const contactLine = [data.business.phone, data.business.email].filter(Boolean).join("  |  ");
    if (contactLine) doc.text(contactLine);
    if (data.business.gstin) doc.text(`GSTIN: ${data.business.gstin}`);
    doc.fillColor("#000");

    doc.moveDown(1.5);
    doc.fontSize(14).text(`Invoice ${data.invoiceNumber}`);
    doc.fontSize(10).fillColor("#555").text(`Issued: ${data.issuedDate.toDateString()}`);
    doc.fillColor("#000");

    doc.moveDown(1);
    doc.fontSize(11).text("Bill To:");
    doc.fontSize(10).text(data.customer.name);
    doc.text(data.customer.phone);
    if (data.customer.address) doc.text(data.customer.address);

    doc.moveDown(1.5);
    const tableTop = doc.y;
    doc.fontSize(10).fillColor("#555");
    doc.text("Description", 50, tableTop, { width: 220 });
    doc.text("Qty", 280, tableTop, { width: 60, align: "right" });
    doc.text("Unit Price", 350, tableTop, { width: 90, align: "right" });
    doc.text("Line Total", 450, tableTop, { width: 90, align: "right" });
    doc.fillColor("#000");
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    let y = tableTop + 22;
    for (const item of data.items) {
      doc.fontSize(10);
      doc.text(item.description, 50, y, { width: 220 });
      doc.text(String(item.quantity), 280, y, { width: 60, align: "right" });
      doc.text(money(item.unitPrice), 350, y, { width: 90, align: "right" });
      doc.text(money(item.lineTotal), 450, y, { width: 90, align: "right" });
      y += 20;
    }

    doc.moveTo(50, y + 5).lineTo(545, y + 5).stroke();
    y += 15;

    const summaryLine = (label: string, value: string, bold = false) => {
      doc.fontSize(bold ? 12 : 10);
      if (bold) doc.font("Helvetica-Bold");
      doc.text(label, 350, y, { width: 90, align: "right" });
      doc.text(value, 450, y, { width: 90, align: "right" });
      if (bold) doc.font("Helvetica");
      y += bold ? 22 : 18;
    };

    summaryLine("Total", money(data.totalAmount), true);
    summaryLine("Advance Paid", money(data.advancePaid));
    summaryLine("Balance Due", money(data.balanceDue), true);

    doc.moveDown(2);
    doc.fontSize(10).fillColor("#555").text(`Payment status: ${data.paymentStatus}`, 50, y + 10);

    doc.moveDown(2);
    doc.fontSize(10).fillColor("#888").text("Thank you for ordering!", 50, doc.y + 20);

    doc.end();
  });
}
