import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import type {
  CreateCustomerInput,
  CreateOccasionInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "./customers.schema";

export async function createCustomer(businessId: string, input: CreateCustomerInput) {
  const existing = await prisma.customer.findUnique({
    where: { businessId_phone: { businessId, phone: input.phone } },
  });
  if (existing) {
    throw ApiError.conflict("A customer with this phone number already exists", {
      customerId: existing.id,
    });
  }

  return prisma.customer.create({ data: { ...input, businessId } });
}

export async function listCustomers(businessId: string, query: ListCustomersQuery) {
  const where: Prisma.CustomerWhereInput = { businessId };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
    ];
  }

  return prisma.customer.findMany({ where, orderBy: { createdAt: "desc" } });
}

async function findCustomerOrThrow(businessId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId } });
  if (!customer) throw ApiError.notFound("Customer not found");
  return customer;
}

export async function getCustomer(businessId: string, customerId: string) {
  const customer = await findCustomerOrThrow(businessId, customerId);

  const orders = await prisma.order.findMany({
    where: { customerId },
    include: { items: true, invoice: true },
    orderBy: { orderDate: "desc" },
  });

  const occasions = await prisma.customerOccasion.findMany({ where: { customerId } });

  const lifetimeValue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return { ...customer, orders, occasions, lifetimeValue, orderCount: orders.length };
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  input: UpdateCustomerInput
) {
  await findCustomerOrThrow(businessId, customerId);

  if (input.phone) {
    const existing = await prisma.customer.findUnique({
      where: { businessId_phone: { businessId, phone: input.phone } },
    });
    if (existing && existing.id !== customerId) {
      throw ApiError.conflict("Another customer already uses this phone number");
    }
  }

  return prisma.customer.update({ where: { id: customerId }, data: input });
}

export async function deleteCustomer(businessId: string, customerId: string) {
  await findCustomerOrThrow(businessId, customerId);
  await prisma.customer.delete({ where: { id: customerId } });
}

export async function addOccasion(
  businessId: string,
  customerId: string,
  input: CreateOccasionInput
) {
  await findCustomerOrThrow(businessId, customerId);
  return prisma.customerOccasion.create({ data: { ...input, customerId } });
}

export async function deleteOccasion(businessId: string, customerId: string, occasionId: string) {
  await findCustomerOrThrow(businessId, customerId);
  const occasion = await prisma.customerOccasion.findFirst({
    where: { id: occasionId, customerId },
  });
  if (!occasion) throw ApiError.notFound("Occasion not found");
  await prisma.customerOccasion.delete({ where: { id: occasionId } });
}
