import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import type {
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderInput,
} from "./orders.schema";

const STATUS_ORDER = ["INQUIRY", "CONFIRMED", "IN_PROGRESS", "READY", "DELIVERED"] as const;

function assertValidTransition(current: string, next: string) {
  if (current === next) return;

  if (next === "CANCELLED") {
    if (current === "DELIVERED") {
      throw ApiError.badRequest("A delivered order cannot be cancelled");
    }
    return;
  }

  if (current === "CANCELLED" || current === "DELIVERED") {
    throw ApiError.badRequest(`Order is already ${current.toLowerCase()} and cannot move to ${next}`);
  }

  const currentIndex = STATUS_ORDER.indexOf(current as (typeof STATUS_ORDER)[number]);
  const nextIndex = STATUS_ORDER.indexOf(next as (typeof STATUS_ORDER)[number]);

  if (nextIndex !== currentIndex + 1) {
    throw ApiError.badRequest(
      `Cannot move order from ${current} to ${next}; the pipeline only moves forward one step at a time (${STATUS_ORDER.join(" -> ")})`
    );
  }
}

function computeTotals(
  items: { description: string; quantity: number; unitPrice: number }[],
  advancePaid: number
) {
  const lineItems = items.map((item) => ({
    ...item,
    lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
  }));
  const totalAmount = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const balanceDue = Math.max(0, Math.round((totalAmount - advancePaid) * 100) / 100);
  return { lineItems, totalAmount, balanceDue };
}

async function assertCustomerBelongsToBusiness(businessId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId } });
  if (!customer) throw ApiError.badRequest("Customer not found for this business");
}

export async function createOrder(businessId: string, input: CreateOrderInput) {
  await assertCustomerBelongsToBusiness(businessId, input.customerId);

  const { lineItems, totalAmount, balanceDue } = computeTotals(input.items, input.advancePaid);

  return prisma.order.create({
    data: {
      businessId,
      customerId: input.customerId,
      orderDate: input.orderDate ?? new Date(),
      deliveryDate: input.deliveryDate,
      occasionTag: input.occasionTag,
      advancePaid: input.advancePaid,
      notes: input.notes,
      totalAmount,
      balanceDue,
      items: { create: lineItems },
    },
    include: { items: true, customer: true },
  });
}

export async function listOrders(businessId: string, query: ListOrdersQuery) {
  const where: Prisma.OrderWhereInput = { businessId };

  if (query.status) where.status = query.status;
  if (query.customerId) where.customerId = query.customerId;
  if (query.occasionTag) where.occasionTag = query.occasionTag;
  if (query.from || query.to) {
    where.deliveryDate = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  return prisma.order.findMany({
    where,
    include: { items: true, customer: true, invoice: true },
    orderBy: { deliveryDate: "asc" },
  });
}

async function findOrderOrThrow(businessId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
    include: { items: true, customer: true, invoice: true },
  });
  if (!order) throw ApiError.notFound("Order not found");
  return order;
}

export async function getOrder(businessId: string, orderId: string) {
  return findOrderOrThrow(businessId, orderId);
}

export async function updateOrder(businessId: string, orderId: string, input: UpdateOrderInput) {
  const order = await findOrderOrThrow(businessId, orderId);

  if (order.status === "DELIVERED" || order.status === "CANCELLED") {
    throw ApiError.badRequest(`Cannot edit an order that is already ${order.status.toLowerCase()}`);
  }

  const advancePaid = input.advancePaid ?? Number(order.advancePaid);
  const items = input.items ?? order.items.map((i) => ({
    description: i.description,
    quantity: Number(i.quantity),
    unitPrice: Number(i.unitPrice),
  }));

  const { lineItems, totalAmount, balanceDue } = computeTotals(items, advancePaid);

  return prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.orderItem.deleteMany({ where: { orderId } });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        deliveryDate: input.deliveryDate,
        occasionTag: input.occasionTag,
        notes: input.notes,
        advancePaid,
        totalAmount,
        balanceDue,
        items: input.items ? { create: lineItems } : undefined,
      },
      include: { items: true, customer: true, invoice: true },
    });
  });
}

export async function updateOrderStatus(businessId: string, orderId: string, status: string) {
  const order = await findOrderOrThrow(businessId, orderId);
  assertValidTransition(order.status, status);

  return prisma.order.update({
    where: { id: orderId },
    data: { status: status as OrderStatus },
    include: { items: true, customer: true, invoice: true },
  });
}

export async function deleteOrder(businessId: string, orderId: string) {
  const order = await findOrderOrThrow(businessId, orderId);
  if (order.invoice) {
    throw ApiError.badRequest("Cannot delete an order that already has an invoice");
  }
  await prisma.order.delete({ where: { id: orderId } });
}
