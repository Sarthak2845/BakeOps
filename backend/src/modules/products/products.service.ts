import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import type {
  BulkCreateProductsInput,
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "./products.schema";

function findByName(businessId: string, name: string) {
  return prisma.product.findFirst({
    where: { businessId, name: { equals: name, mode: "insensitive" } },
  });
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function createProduct(businessId: string, input: CreateProductInput) {
  const existing = await findByName(businessId, input.name);
  if (existing) {
    throw ApiError.conflict("A product with this name already exists", { productId: existing.id });
  }

  try {
    return await prisma.product.create({ data: { ...input, businessId } });
  } catch (err) {
    // Two simultaneous saves of the same name can both pass the check above.
    if (isUniqueViolation(err)) throw ApiError.conflict("A product with this name already exists");
    throw err;
  }
}

// Names the shop already has (any case) are skipped rather than failing the whole import.
export async function bulkCreateProducts(businessId: string, input: BulkCreateProductsInput) {
  const existing = await prisma.product.findMany({ where: { businessId }, select: { name: true } });
  const taken = new Set(existing.map((p) => p.name.toLowerCase()));

  const skipped: string[] = [];
  const data: Prisma.ProductCreateManyInput[] = [];
  for (const product of input.products) {
    const key = product.name.toLowerCase();
    if (taken.has(key)) {
      skipped.push(product.name);
      continue;
    }
    taken.add(key);
    data.push({ ...product, businessId });
  }

  const { count } = await prisma.product.createMany({ data, skipDuplicates: true });
  return { created: count, skipped };
}

export async function listProducts(businessId: string, query: ListProductsQuery) {
  const where: Prisma.ProductWhereInput = { businessId };

  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  return prisma.product.findMany({ where, orderBy: { name: "asc" } });
}

async function findProductOrThrow(businessId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } });
  if (!product) throw ApiError.notFound("Product not found");
  return product;
}

export async function getProduct(businessId: string, productId: string) {
  return findProductOrThrow(businessId, productId);
}

export async function updateProduct(businessId: string, productId: string, input: UpdateProductInput) {
  await findProductOrThrow(businessId, productId);

  if (input.name) {
    const existing = await findByName(businessId, input.name);
    if (existing && existing.id !== productId) {
      throw ApiError.conflict("Another product already uses this name");
    }
  }

  try {
    return await prisma.product.update({ where: { id: productId }, data: input });
  } catch (err) {
    if (isUniqueViolation(err)) throw ApiError.conflict("Another product already uses this name");
    throw err;
  }
}

// Order items copy the name and price, so deleting a product never changes past orders.
export async function deleteProduct(businessId: string, productId: string) {
  await findProductOrThrow(businessId, productId);
  await prisma.product.delete({ where: { id: productId } });
}
