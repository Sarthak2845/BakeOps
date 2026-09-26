import request from "supertest";
import { app, cleanupBusiness, disconnectPrisma, registerBusiness, uniqueEmail } from "./testHelpers";

describe("auth", () => {
  const createdBusinessIds: string[] = [];

  afterAll(async () => {
    await Promise.all(createdBusinessIds.map(cleanupBusiness));
    await disconnectPrisma();
  });

  it("registers a new business and owner", async () => {
    const { res } = await registerBusiness();
    createdBusinessIds.push(res.body.business.id);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.business.slug).toBeDefined();
    expect(res.body.user.role).toBe("OWNER");
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate email registration", async () => {
    const email = uniqueEmail("dupe");
    const first = await registerBusiness({ email });
    createdBusinessIds.push(first.res.body.business.id);

    const second = await registerBusiness({ email });
    expect(second.res.status).toBe(409);
  });

  it("logs in with correct credentials and rejects wrong password", async () => {
    const email = uniqueEmail("login");
    const { res } = await registerBusiness({ email });
    createdBusinessIds.push(res.body.business.id);

    const ok = await request(app).post("/api/auth/login").send({ email, password: "supersecret123" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeDefined();

    const bad = await request(app).post("/api/auth/login").send({ email, password: "wrongpass" });
    expect(bad.status).toBe(401);
  });

  it("rejects malformed registration input", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});
