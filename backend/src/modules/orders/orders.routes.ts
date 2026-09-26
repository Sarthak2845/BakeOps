import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateQuery } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from "./orders.schema";
import {
  createOrderHandler,
  deleteOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  updateOrderHandler,
  updateOrderStatusHandler,
} from "./orders.controller";
import { generateInvoiceHandler } from "../invoices/invoices.controller";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.post("/", validateBody(createOrderSchema), asyncHandler(createOrderHandler));
ordersRouter.get("/", validateQuery(listOrdersQuerySchema), asyncHandler(listOrdersHandler));
ordersRouter.get("/:id", asyncHandler(getOrderHandler));
ordersRouter.patch("/:id", validateBody(updateOrderSchema), asyncHandler(updateOrderHandler));
ordersRouter.patch(
  "/:id/status",
  validateBody(updateOrderStatusSchema),
  asyncHandler(updateOrderStatusHandler)
);
ordersRouter.delete("/:id", asyncHandler(deleteOrderHandler));

ordersRouter.post("/:id/invoice", asyncHandler(generateInvoiceHandler));
