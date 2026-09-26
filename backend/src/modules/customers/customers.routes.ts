import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateQuery } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createCustomerSchema,
  createOccasionSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customers.schema";
import {
  addOccasionHandler,
  createCustomerHandler,
  deleteCustomerHandler,
  deleteOccasionHandler,
  getCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from "./customers.controller";

export const customersRouter = Router();

customersRouter.use(requireAuth);

customersRouter.post("/", validateBody(createCustomerSchema), asyncHandler(createCustomerHandler));
customersRouter.get("/", validateQuery(listCustomersQuerySchema), asyncHandler(listCustomersHandler));
customersRouter.get("/:id", asyncHandler(getCustomerHandler));
customersRouter.patch("/:id", validateBody(updateCustomerSchema), asyncHandler(updateCustomerHandler));
customersRouter.delete("/:id", asyncHandler(deleteCustomerHandler));

customersRouter.post(
  "/:id/occasions",
  validateBody(createOccasionSchema),
  asyncHandler(addOccasionHandler)
);
customersRouter.delete("/:id/occasions/:occasionId", asyncHandler(deleteOccasionHandler));
