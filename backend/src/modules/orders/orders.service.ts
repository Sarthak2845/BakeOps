import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "../../prisma";
import { ApiError } from "../../utils/apiError";
import { moduleLogger } from "../../utils/logger";
import { MAX_MONEY } from "../../utils/validation";
import type {
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderInput,
} from "./orders.schema";

const log = moduleLogger("orders");

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
  if (lineItems.some((i) => i.lineTotal > MAX_MONEY) || totalAmount > MAX_MONEY) {
    throw ApiError.badRequest(`Order total must be at most ${MAX_MONEY}`);
  }
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

  const order = await prisma.order.create({
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

  log.info(
    {
      event: "order.created",
      orderId: order.id,
      customerId: order.customerId,
      status: order.status,
      itemCount: lineItems.length,
      totalAmount,
      advancePaid: input.advancePaid,
      balanceDue,
      deliveryDate: order.deliveryDate,
    },
    "order created"
  );

  return order;
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
    log.warn({ event: "order.update_blocked", orderId, status: order.status }, "edit blocked on closed order");
    throw ApiError.badRequest(`Cannot edit an order that is already ${order.status.toLowerCase()}`);
  }

  const advancePaid = input.advancePaid ?? Number(order.advancePaid);
  const items = input.items ?? order.items.map((i) => ({
    description: i.description,
    quantity: Number(i.quantity),
    unitPrice: Number(i.unitPrice),
  }));

  const { lineItems, totalAmount, balanceDue } = computeTotals(items, advancePaid);

  const updated = await prisma.$transaction(async (tx) => {
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

  log.info(
    {
      event: "order.updated",
      orderId,
      changedFields: Object.keys(input).filter((k) => input[k as keyof UpdateOrderInput] !== undefined),
      itemsReplaced: Boolean(input.items),
      totalAmount: { from: Number(order.totalAmount), to: totalAmount },
      balanceDue: { from: Number(order.balanceDue), to: balanceDue },
    },
    "order updated"
  );

  return updated;
}

export async function updateOrderStatus(businessId: string, orderId: string, status: string) {
  const order = await findOrderOrThrow(businessId, orderId);

  try {
    assertValidTransition(order.status, status);
  } catch (err) {
    log.warn(
      { event: "order.status_change_rejected", orderId, fromStatus: order.status, toStatus: status },
      "invalid order status transition"
    );
    throw err;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as OrderStatus },
    include: { items: true, customer: true, invoice: true },
  });

  if (order.status !== status) {
    log.info(
      { event: "order.status_changed", orderId, fromStatus: order.status, toStatus: status },
      `order status ${order.status} -> ${status}`
    );
  }

  return updated;
}

export async function deleteOrder(businessId: string, orderId: string) {
  const order = await findOrderOrThrow(businessId, orderId);
  if (order.invoice) {
    log.warn(
      { event: "order.delete_blocked", orderId, invoiceId: order.invoice.id },
      "delete blocked: order has an invoice"
    );
    throw ApiError.badRequest("Cannot delete an order that already has an invoice");
  }
  await prisma.order.delete({ where: { id: orderId } });
  log.info(
    { event: "order.deleted", orderId, status: order.status, totalAmount: Number(order.totalAmount) },
    "order deleted"
  );
}
