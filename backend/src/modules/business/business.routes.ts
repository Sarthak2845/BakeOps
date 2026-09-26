import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { updateBusinessSchema } from "./business.schema";
import { getMyBusinessHandler, updateMyBusinessHandler } from "./business.controller";

export const businessRouter = Router();

businessRouter.use(requireAuth);
businessRouter.get("/me", asyncHandler(getMyBusinessHandler));
businessRouter.patch("/me", validateBody(updateBusinessSchema), asyncHandler(updateMyBusinessHandler));
