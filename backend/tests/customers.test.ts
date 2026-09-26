import request from "supertest";
import { app, cleanupBusiness, disconnectPrisma, registerBusiness } from "./testHelpers";

describe("customers", () => {
  let token: string;
  let businessId: string;

  beforeAll(async () => {
    const { res } = await registerBusiness();
    token = res.body.token;
    businessId = res.body.business.id;
  });

  afterAll(async () => {
    await cleanupBusiness(businessId);
    await disconnectPrisma();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("creates and lists a customer", async () => {
    const create = await request(app)
      .post("/api/customers")
      .set(auth())
      .send({ name: "Mrs Sharma", phone: "9999900001" });
    expect(create.status).toBe(201);

    const list = await request(app).get("/api/customers").set(auth());
    expect(list.status).toBe(200);
    expect(list.body.customers.some((c: { id: string }) => c.id === create.body.customer.id)).toBe(true);
  });

  it("rejects a duplicate phone number for the same business", async () => {
    await request(app).post("/api/customers").set(auth()).send({ name: "A", phone: "9999900002" });
    const dupe = await request(app).post("/api/customers").set(auth()).send({ name: "B", phone: "9999900002" });
    expect(dupe.status).toBe(409);
  });

  it("adds an occasion and reflects it in customer detail", async () => {
    const create = await request(app)
      .post("/api/customers")
      .set(auth())
      .send({ name: "Mr Gupta", phone: "9999900003" });
    const customerId = create.body.customer.id;

    const occasion = await request(app)
      .post(`/api/customers/${customerId}/occasions`)
      .set(auth())
      .send({ label: "Birthday", month: 3, day: 14 });
    expect(occasion.status).toBe(201);

    const detail = await request(app).get(`/api/customers/${customerId}`).set(auth());
    expect(detail.status).toBe(200);
    expect(detail.body.customer.occasions).toHaveLength(1);
    expect(detail.body.customer.lifetimeValue).toBe(0);
  });

  it("returns 404 for a customer belonging to another business", async () => {
    const other = await registerBusiness();
    const otherCustomer = await request(app)
      .post("/api/customers")
      .set({ Authorization: `Bearer ${other.token}` })
      .send({ name: "Other", phone: "9999900004" });

    const res = await request(app).get(`/api/customers/${otherCustomer.body.customer.id}`).set(auth());
    expect(res.status).toBe(404);

    await cleanupBusiness(other.res.body.business.id);
  });
});
