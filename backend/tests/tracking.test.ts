import request from "supertest";
import { app, cleanupBusiness, disconnectPrisma, registerBusiness } from "./testHelpers";

describe("public order tracking", () => {
  let token: string;
  let businessId: string;
  let slug: string;
  let orderId: string;
  let otherSlug: string;
  let otherBusinessId: string;

  beforeAll(async () => {
    const first = await registerBusiness();
    token = first.res.body.token;
    businessId = first.res.body.business.id;
    slug = first.res.body.business.slug;
    const second = await registerBusiness();
    otherSlug = second.res.body.business.slug;
    otherBusinessId = second.res.body.business.id;

    const auth = { Authorization: `Bearer ${token}` };
    const customer = await request(app)
      .post("/api/customers")
      .set(auth)
      .send({ name: "Priya Sharma", phone: "9999922222", notes: "Allergic to nuts" });
    const order = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({
        customerId: customer.body.customer.id,
        occasionTag: "Birthday",
        advancePaid: 300,
        notes: "Write Happy Birthday Aarav",
        items: [{ description: "Black Forest Cake 1kg", quantity: 1, unitPrice: 790 }],
      });
    orderId = order.body.order.id;
  });

  afterAll(async () => {
    await cleanupBusiness(businessId);
    await cleanupBusiness(otherBusinessId);
    await disconnectPrisma();
  });

  it("returns the order's status and items without login", async () => {
    const res = await request(app).get(`/api/track/${slug}/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.business.slug).toBe(slug);
    expect(res.body.order.status).toBe("INQUIRY");
    expect(res.body.order.customerFirstName).toBe("Priya");
    expect(res.body.order.items).toEqual([{ description: "Black Forest Cake 1kg", quantity: 1 }]);
    expect(res.body.order.balanceDue).toBe(490);
  });

  it("never exposes notes, phone numbers or internal ids", async () => {
    const res = await request(app).get(`/api/track/${slug}/${orderId}`);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("Allergic");
    expect(text).not.toContain("Happy Birthday");
    expect(text).not.toContain("9999922222");
    expect(res.body.order.customerId).toBeUndefined();
    expect(res.body.business.id).toBeUndefined();
  });

  it("reflects status changes", async () => {
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: "CONFIRMED" });
    const res = await request(app).get(`/api/track/${slug}/${orderId}`);
    expect(res.body.order.status).toBe("CONFIRMED");
  });

  it("has no invoice until one is generated, then links to the receipt and PDF", async () => {
    const before = await request(app).get(`/api/track/${slug}/${orderId}`);
    expect(before.body.order.invoice).toBeNull();

    const inv = await request(app).post(`/api/orders/${orderId}/invoice`).set({ Authorization: `Bearer ${token}` });
    expect(inv.status).toBe(201);
    const invoiceNumber = inv.body.invoice.invoiceNumber;

    const after = await request(app).get(`/api/track/${slug}/${orderId}`);
    expect(after.body.order.invoice).toEqual({
      invoiceNumber,
      paymentStatus: "UNPAID",
      receiptPath: `/r/${slug}/${invoiceNumber}`,
      pdfPath: `/r/${slug}/${invoiceNumber}/pdf`,
    });
    expect((await request(app).get(after.body.order.invoice.receiptPath)).status).toBe(200);
    expect((await request(app).get(after.body.order.invoice.pdfPath)).headers["content-type"]).toMatch(/^application\/pdf/);
  });

  it("404s for a wrong shop, a wrong order, or another shop's order", async () => {
    expect((await request(app).get(`/api/track/no-such-shop/${orderId}`)).status).toBe(404);
    expect((await request(app).get(`/api/track/${slug}/clzzzzzzzzzzzzzzzzzzzzzzz`)).status).toBe(404);
    expect((await request(app).get(`/api/track/${otherSlug}/${orderId}`)).status).toBe(404);
  });
});
