import type { Request, Response } from "express";
import { getParam } from "../../utils/params";
import * as ordersService from "./orders.service";

export async function createOrderHandler(req: Request, res: Response) {
  const order = await ordersService.createOrder(req.auth!.businessId, req.body);
  res.status(201).json({ order });
}

export async function listOrdersHandler(req: Request, res: Response) {
  const orders = await ordersService.listOrders(req.auth!.businessId, req.validatedQuery as never);
  res.json({ orders });
}

export async function getOrderHandler(req: Request, res: Response) {
  const order = await ordersService.getOrder(req.auth!.businessId, getParam(req.params, "id"));
  res.json({ order });
}

export async function updateOrderHandler(req: Request, res: Response) {
  const order = await ordersService.updateOrder(
    req.auth!.businessId,
    getParam(req.params, "id"),
    req.body
  );
  res.json({ order });
}

export async function updateOrderStatusHandler(req: Request, res: Response) {
  const order = await ordersService.updateOrderStatus(
    req.auth!.businessId,
    getParam(req.params, "id"),
    req.body.status
  );
  res.json({ order });
}

export async function deleteOrderHandler(req: Request, res: Response) {
  await ordersService.deleteOrder(req.auth!.businessId, getParam(req.params, "id"));
  res.status(204).send();
}
