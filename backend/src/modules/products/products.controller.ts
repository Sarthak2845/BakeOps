import type { Request, Response } from "express";
import { getParam } from "../../utils/params";
import * as productsService from "./products.service";

export async function createProductHandler(req: Request, res: Response) {
  const product = await productsService.createProduct(req.auth!.businessId, req.body);
  res.status(201).json({ product });
}

export async function bulkCreateProductsHandler(req: Request, res: Response) {
  const result = await productsService.bulkCreateProducts(req.auth!.businessId, req.body);
  res.status(201).json(result);
}

export async function listProductsHandler(req: Request, res: Response) {
  const products = await productsService.listProducts(req.auth!.businessId, req.validatedQuery as never);
  res.json({ products });
}

export async function getProductHandler(req: Request, res: Response) {
  const product = await productsService.getProduct(req.auth!.businessId, getParam(req.params, "id"));
  res.json({ product });
}

export async function updateProductHandler(req: Request, res: Response) {
  const product = await productsService.updateProduct(
    req.auth!.businessId,
    getParam(req.params, "id"),
    req.body
  );
  res.json({ product });
}

export async function deleteProductHandler(req: Request, res: Response) {
  await productsService.deleteProduct(req.auth!.businessId, getParam(req.params, "id"));
  res.status(204).send();
}
