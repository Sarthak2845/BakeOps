import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateQuery } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  bulkCreateProductsSchema,
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from "./products.schema";
import {
  bulkCreateProductsHandler,
  createProductHandler,
  deleteProductHandler,
  getProductHandler,
  listProductsHandler,
  updateProductHandler,
} from "./products.controller";

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.post("/", validateBody(createProductSchema), asyncHandler(createProductHandler));
productsRouter.post("/bulk", validateBody(bulkCreateProductsSchema), asyncHandler(bulkCreateProductsHandler));
productsRouter.get("/", validateQuery(listProductsQuerySchema), asyncHandler(listProductsHandler));
productsRouter.get("/:id", asyncHandler(getProductHandler));
productsRouter.patch("/:id", validateBody(updateProductSchema), asyncHandler(updateProductHandler));
productsRouter.delete("/:id", asyncHandler(deleteProductHandler));
