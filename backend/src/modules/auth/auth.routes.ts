import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateBody } from "../../middleware/validate.middleware";
import { loginSchema, registerSchema } from "./auth.schema";
import { loginHandler, registerHandler } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), asyncHandler(registerHandler));
authRouter.post("/login", validateBody(loginSchema), asyncHandler(loginHandler));
