import request from "supertest";
import { app, cleanupBusiness, disconnectPrisma, registerBusiness } from "./testHelpers";

describe("invoices (core loop)", () => {
  let token: string;
  let businessId: string;
  let businessSlug: string;
  let customerId: string;

  beforeAll(async () => {
    const { res } = await registerBusiness({ businessName: `Mom's Cakes ${Date.now()}` });
    token = res.body.token;
    businessId = res.body.business.id;
    businessSlug = res.body.business.slug;

    const customer = await request(app)
      .post("/api/customers")
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: "Invoice Customer", phone: "9999922222" });
    customerId = customer.body.customer.id;
  });

  afterAll(async () => {
    await cleanupBusiness(businessId);
    await disconnectPrisma();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("runs the full core loop: order -> invoice -> public receipt -> payment", async () => {
    const order = await request(app)
      .post("/api/orders")
      .set(auth())
      .send({
        customerId,
        advancePaid: 100,
        items: [{ description: "2kg vanilla cake", quantity: 1, unitPrice: 1500 }],
      });
    const orderId = order.body.order.id;

    const invoiceRes = await request(app).post(`/api/orders/${orderId}/invoice`).set(auth());
    expect(invoiceRes.status).toBe(201);
    expect(invoiceRes.body.invoice.invoiceNumber).toMatch(/^[A-Z]+-\d{4}-\d{4}$/);
    expect(invoiceRes.body.invoice.pdfUrl).toMatch(/^\/r\/[^/]+\/[^/]+\/pdf$/);

    const invoiceId = invoiceRes.body.invoice.id;
    const invoiceNumber = invoiceRes.body.invoice.invoiceNumber;

    const duplicate = await request(app).post(`/api/orders/${orderId}/invoice`).set(auth());
    expect(duplicate.status).toBe(409);

    const publicView = await request(app).get(`/r/${businessSlug}/${invoiceNumber}`);
    expect(publicView.status).toBe(200);
    expect(publicView.text).toContain("Invoice Customer");
    expect(publicView.text).toContain(invoiceNumber);

    const pdf = await request(app).get(invoiceRes.body.invoice.pdfUrl);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toMatch(/^application\/pdf/);
    expect(Buffer.from(pdf.body).subarray(0, 5).toString()).toBe("%PDF-");

    const partialPayment = await request(app)
      .post(`/api/invoices/${invoiceId}/payments`)
      .set(auth())
      .send({ amount: 500, method: "cash" });
    expect(partialPayment.status).toBe(201);
    expect(partialPayment.body.invoice.paymentStatus).toBe("PARTIAL");

    const finalPayment = await request(app)
      .post(`/api/invoices/${invoiceId}/payments`)
      .set(auth())
      .send({ amount: 1000, method: "upi" });
    expect(finalPayment.status).toBe(201);
    expect(finalPayment.body.invoice.paymentStatus).toBe("PAID");
    expect(Number(finalPayment.body.invoice.order.balanceDue)).toBe(0);
  });

  it("returns 404 for an unknown public invoice", async () => {
    const res = await request(app).get(`/r/${businessSlug}/DOES-NOT-EXIST`);
    expect(res.status).toBe(404);
  });
});
