import request from "supertest";
import { app, cleanupBusiness, disconnectPrisma, registerBusiness } from "./testHelpers";

describe("products", () => {
  let token: string;
  let businessId: string;
  let otherToken: string;
  let otherBusinessId: string;

  beforeAll(async () => {
    const first = await registerBusiness();
    token = first.res.body.token;
    businessId = first.res.body.business.id;
    const second = await registerBusiness();
    otherToken = second.res.body.token;
    otherBusinessId = second.res.body.business.id;
  });

  afterAll(async () => {
    await cleanupBusiness(businessId);
    await cleanupBusiness(otherBusinessId);
    await disconnectPrisma();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const otherAuth = () => ({ Authorization: `Bearer ${otherToken}` });

  it("creates a product and finds it by case-insensitive search", async () => {
    const create = await request(app)
      .post("/api/products")
      .set(auth())
      .send({ name: "  Black Forest Cake ", unitPrice: 950, unit: "kg" });
    expect(create.status).toBe(201);
    expect(create.body.product.name).toBe("Black Forest Cake");

    const match = await request(app).get("/api/products").query({ search: "black for" }).set(auth());
    expect(match.status).toBe(200);
    expect(match.body.products.map((p: { id: string }) => p.id)).toEqual([create.body.product.id]);

    const miss = await request(app).get("/api/products").query({ search: "truffle" }).set(auth());
    expect(miss.body.products).toEqual([]);
  });

  it("rejects a duplicate name regardless of case, but only within a business", async () => {
    await request(app).post("/api/products").set(auth()).send({ name: "Pineapple Cake", unitPrice: 500 });

    const dupe = await request(app).post("/api/products").set(auth()).send({ name: "pineapple cake", unitPrice: 600 });
    expect(dupe.status).toBe(409);

    const otherShop = await request(app).post("/api/products").set(otherAuth()).send({ name: "Pineapple Cake", unitPrice: 600 });
    expect(otherShop.status).toBe(201);
  });

  it("rejects invalid input", async () => {
    const tooExpensive = await request(app).post("/api/products").set(auth()).send({ name: "Gold Cake", unitPrice: 12342345678 });
    expect(tooExpensive.status).toBe(400);

    const noName = await request(app).post("/api/products").set(auth()).send({ name: "   ", unitPrice: 10 });
    expect(noName.status).toBe(400);
  });

  it("updates and deletes a product", async () => {
    const { body } = await request(app).post("/api/products").set(auth()).send({ name: "Brownie", unitPrice: 60 });
    const id = body.product.id;

    const update = await request(app).patch(`/api/products/${id}`).set(auth()).send({ unitPrice: 75 });
    expect(update.status).toBe(200);
    expect(Number(update.body.product.unitPrice)).toBe(75);

    const remove = await request(app).delete(`/api/products/${id}`).set(auth());
    expect(remove.status).toBe(204);

    const gone = await request(app).get(`/api/products/${id}`).set(auth());
    expect(gone.status).toBe(404);
  });

  it("clears a unit with null", async () => {
    const { body } = await request(app).post("/api/products").set(auth()).send({ name: "Plum Cake", unitPrice: 800, unit: "kg" });
    const update = await request(app).patch(`/api/products/${body.product.id}`).set(auth()).send({ unit: null });
    expect(update.status).toBe(200);
    expect(update.body.product.unit).toBeNull();
  });

  it("bulk-creates products, skipping names already saved or repeated", async () => {
    await request(app).post("/api/products").set(auth()).send({ name: "Fruit Cake", unitPrice: 400 });

    const res = await request(app)
      .post("/api/products/bulk")
      .set(auth())
      .send({
        products: [
          { name: "Rusk", unitPrice: 50 },
          { name: "Khari", unitPrice: 40, unit: "pack" },
          { name: "khari", unitPrice: 45 },
          { name: "FRUIT CAKE", unitPrice: 999 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(2);
    expect(res.body.skipped).toEqual(["khari", "FRUIT CAKE"]);

    const fruit = await request(app).get("/api/products").query({ search: "fruit cake" }).set(auth());
    expect(fruit.body.products).toHaveLength(1);
    expect(Number(fruit.body.products[0].unitPrice)).toBe(400);
  });

  it("rejects a bulk import with an invalid or oversized list", async () => {
    const bad = await request(app).post("/api/products/bulk").set(auth()).send({ products: [{ name: "No Price" }] });
    expect(bad.status).toBe(400);

    const tooMany = Array.from({ length: 501 }, (_, i) => ({ name: `Item ${i}`, unitPrice: 1 }));
    const big = await request(app).post("/api/products/bulk").set(auth()).send({ products: tooMany });
    expect(big.status).toBe(400);
  });

  it("keeps products private to their business", async () => {
    const { body } = await request(app).post("/api/products").set(auth()).send({ name: "Secret Recipe", unitPrice: 100 });
    const id = body.product.id;

    expect((await request(app).get(`/api/products/${id}`).set(otherAuth())).status).toBe(404);
    expect((await request(app).patch(`/api/products/${id}`).set(otherAuth()).send({ unitPrice: 1 })).status).toBe(404);
    expect((await request(app).delete(`/api/products/${id}`).set(otherAuth())).status).toBe(404);

    const list = await request(app).get("/api/products").query({ search: "Secret" }).set(otherAuth());
    expect(list.body.products).toEqual([]);
  });
});
