import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import type { UpdateBusinessInput } from "./business.schema";

export async function getBusiness(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw ApiError.notFound("Business not found");
  return business;
}

export async function updateBusiness(businessId: string, input: UpdateBusinessInput) {
  await getBusiness(businessId);
  return prisma.business.update({ where: { id: businessId }, data: input });
}
