import type { Request, Response } from "express";
import * as authService from "./auth.service";

function serializeUser(user: { id: string; name: string; email: string; role: string; businessId: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, businessId: user.businessId };
}

export async function registerHandler(req: Request, res: Response) {
  const { token, business, user } = await authService.register(req.body);
  res.status(201).json({ token, business, user: serializeUser(user) });
}

export async function loginHandler(req: Request, res: Response) {
  const { token, business, user } = await authService.login(req.body);
  res.status(200).json({ token, business, user: serializeUser(user) });
}
