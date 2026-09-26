import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import { signToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";
import { generateUniqueBusinessSlug } from "../../utils/slug";
import type { LoginInput, RegisterInput } from "./auth.schema";

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
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

  const owner = business.users[0];
  const token = signToken({ userId: owner.id, businessId: business.id, role: owner.role });

  return { token, business, user: owner };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { business: true },
  });

  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken({ userId: user.id, businessId: user.businessId, role: user.role });
  return { token, business: user.business, user };
}
