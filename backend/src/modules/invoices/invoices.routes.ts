import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateQuery } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { createPaymentSchema, listInvoicesQuerySchema } from "./invoices.schema";
import {
  addPaymentHandler,
  getInvoiceHandler,
  listInvoicesHandler,
  publicReceiptHandler,
} from "./invoices.controller";

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);
invoicesRouter.get("/", validateQuery(listInvoicesQuerySchema), asyncHandler(listInvoicesHandler));
invoicesRouter.get("/:id", asyncHandler(getInvoiceHandler));
invoicesRouter.post(
  "/:id/payments",
  validateBody(createPaymentSchema),
  asyncHandler(addPaymentHandler)
);

export const publicReceiptRouter = Router();
publicReceiptRouter.get("/:slug/:invoiceNumber", asyncHandler(publicReceiptHandler));
