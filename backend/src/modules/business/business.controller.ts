import type { Request, Response } from "express";
import * as businessService from "./business.service";

export async function getMyBusinessHandler(req: Request, res: Response) {
  const business = await businessService.getBusiness(req.auth!.businessId);
  res.json({ business });
}

export async function updateMyBusinessHandler(req: Request, res: Response) {
  const business = await businessService.updateBusiness(req.auth!.businessId, req.body);
  res.json({ business });
}
