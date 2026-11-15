import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import { signToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";
import { generateUniqueBusinessSlug } from "../../utils/slug";
import { moduleLogger } from "../../utils/logger";

const log = moduleLogger("auth");

// "jane.doe@example.com" -> "j***@example.com": enough to correlate a
// support request with failed logins without storing full addresses.
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return domain ? `${local.slice(0, 1)}***@${domain}` : "***";
}
import type { LoginInput, RegisterInput } from "./auth.schema";

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    log.warn({ event: "auth.register_conflict", email: maskEmail(input.email) }, "email already registered");
    throw ApiError.conflict("An account with this email already exists");
  }

  const slug = await generateUniqueBusinessSlug(prisma, input.businessName);
  const passwordHash = await hashPassword(input.password);

  const business = await prisma.business.create({
    data: {
      name: input.businessName,
      slug,
      category: input.category,
      phone: input.phone,
      email: input.email,
      logoUrl: input.logoUrl,
      users: {
        create: {
          name: input.ownerName,
          email: input.email,
          passwordHash,
          role: "OWNER",
        },
      },
    },
    include: { users: true },
  });

  const { users, ...businessWithoutUsers } = business;
  const owner = users[0];
  const token = signToken({ userId: owner.id, businessId: business.id, role: owner.role });

  log.info(
    { event: "auth.business_registered", businessId: business.id, userId: owner.id, slug: business.slug },
    "business registered"
  );
  return { token, business: businessWithoutUsers, user: owner };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { business: true },
  });

  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    // The client always gets the same message; the log records which check failed.
    log.warn(
      {
        event: "auth.login_failed",
        email: maskEmail(input.email),
        reason: user ? "bad_password" : "unknown_email",
        ...(user ? { userId: user.id, businessId: user.businessId } : {}),
      },
      "login failed"
    );
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken({ userId: user.id, businessId: user.businessId, role: user.role });
  log.info({ event: "auth.login_succeeded", userId: user.id, businessId: user.businessId }, "login succeeded");
  return { token, business: user.business, user };
}
