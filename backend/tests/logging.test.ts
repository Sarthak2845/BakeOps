import request from "supertest";
import { app, disconnectPrisma } from "./testHelpers";

afterAll(async () => {
  await disconnectPrisma();
});

describe("request tracing", () => {
  it("generates an X-Request-Id when the client does not send one", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("echoes a valid client-supplied X-Request-Id", async () => {
    const res = await request(app).get("/health").set("X-Request-Id", "mobile-abc.123");
    expect(res.headers["x-request-id"]).toBe("mobile-abc.123");
  });

  it("replaces a malformed client-supplied X-Request-Id", async () => {
    const res = await request(app).get("/health").set("X-Request-Id", "bad id\twith spaces");
    expect(res.headers["x-request-id"]).not.toBe("bad id\twith spaces");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("includes the requestId in error responses", async () => {
    const res = await request(app).get("/api/orders").set("X-Request-Id", "trace-401");
    expect(res.status).toBe(401);
    expect(res.body.error.requestId).toBe("trace-401");
  });

  it("includes the requestId in 404 responses", async () => {
    const res = await request(app).get("/nope").set("X-Request-Id", "trace-404");
    expect(res.status).toBe(404);
    expect(res.body.error.requestId).toBe("trace-404");
  });

  it("returns 400 (not 500) for a malformed JSON body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.requestId).toEqual(expect.any(String));
  });
});
