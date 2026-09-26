import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";

export const app = createApp();

export function uniqueEmail(label: string): string {
  return `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.test`;
}

export async function registerBusiness(overrides: Partial<{ businessName: string; email: string }> = {}) {
  const email = overrides.email ?? uniqueEmail("owner");
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      businessName: overrides.businessName ?? `Test Bakery ${Date.now()}`,
      ownerName: "Test Owner",
      email,
      password: "supersecret123",
      category: "Bakery",
    });

  return { res, token: res.body.token as string, business: res.body.business, user: res.body.user };
}

export async function cleanupBusiness(businessId: string) {
  await prisma.business.delete({ where: { id: businessId } }).catch(() => undefined);
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
