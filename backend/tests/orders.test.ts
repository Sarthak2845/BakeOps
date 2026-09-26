import request from "supertest";
import { app, cleanupBusiness, disconnectPrisma, registerBusiness } from "./testHelpers";

describe("orders", () => {
  let token: string;
  let businessId: string;
  let customerId: string;

  beforeAll(async () => {
    const { res } = await registerBusiness();
    token = res.body.token;
    businessId = res.body.business.id;

    const customer = await request(app)
      .post("/api/customers")
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: "Order Customer", phone: "9999911111" });
    customerId = customer.body.customer.id;
  });

  afterAll(async () => {
    await cleanupBusiness(businessId);
    await disconnectPrisma();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("creates an order and computes totals from items", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set(auth())
      .send({
        customerId,
        occasionTag: "Birthday",
        advancePaid: 200,
        items: [
          { description: "1kg chocolate cake", quantity: 1, unitPrice: 900 },
          { description: "Candles", quantity: 2, unitPrice: 25 },
        ],
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.order.totalAmount)).toBe(950);
    expect(Number(res.body.order.balanceDue)).toBe(750);
    expect(res.body.order.status).toBe("INQUIRY");
  });

  it("walks the status pipeline forward but rejects skipping a step", async () => {
    const create = await request(app)
      .post("/api/orders")
      .set(auth())
      .send({ customerId, items: [{ description: "Cupcakes", quantity: 6, unitPrice: 50 }] });
    const orderId = create.body.order.id;

    const toConfirmed = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth())
      .send({ status: "CONFIRMED" });
    expect(toConfirmed.status).toBe(200);

    const skip = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth())
      .send({ status: "READY" });
    expect(skip.status).toBe(400);
  });

  it("allows cancelling from an in-progress state but not after delivery", async () => {
    const create = await request(app)
      .post("/api/orders")
      .set(auth())
      .send({ customerId, items: [{ description: "Cookies", quantity: 12, unitPrice: 20 }] });
    const orderId = create.body.order.id;

    const cancel = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth())
      .send({ status: "CANCELLED" });
    expect(cancel.status).toBe(200);

    const reopen = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth())
      .send({ status: "CONFIRMED" });
    expect(reopen.status).toBe(400);
  });

  it("filters orders by status", async () => {
    const res = await request(app).get("/api/orders").set(auth()).query({ status: "CANCELLED" });
    expect(res.status).toBe(200);
    expect(res.body.orders.every((o: { status: string }) => o.status === "CANCELLED")).toBe(true);
  });
});
