import type { Request, Response } from "express";
import { getParam } from "../../utils/params";
import * as customersService from "./customers.service";

export async function createCustomerHandler(req: Request, res: Response) {
  const customer = await customersService.createCustomer(req.auth!.businessId, req.body);
  res.status(201).json({ customer });
}

export async function listCustomersHandler(req: Request, res: Response) {
  const customers = await customersService.listCustomers(req.auth!.businessId, req.validatedQuery as never);
  res.json({ customers });
}

export async function getCustomerHandler(req: Request, res: Response) {
  const customer = await customersService.getCustomer(req.auth!.businessId, getParam(req.params, "id"));
  res.json({ customer });
}

export async function updateCustomerHandler(req: Request, res: Response) {
  const customer = await customersService.updateCustomer(
    req.auth!.businessId,
    getParam(req.params, "id"),
    req.body
  );
  res.json({ customer });
}

export async function deleteCustomerHandler(req: Request, res: Response) {
  await customersService.deleteCustomer(req.auth!.businessId, getParam(req.params, "id"));
  res.status(204).send();
}

export async function addOccasionHandler(req: Request, res: Response) {
  const occasion = await customersService.addOccasion(
    req.auth!.businessId,
    getParam(req.params, "id"),
    req.body
  );
  res.status(201).json({ occasion });
}

export async function deleteOccasionHandler(req: Request, res: Response) {
  await customersService.deleteOccasion(
    req.auth!.businessId,
    getParam(req.params, "id"),
    getParam(req.params, "occasionId")
  );
  res.status(204).send();
}
