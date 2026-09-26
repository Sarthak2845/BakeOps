import express from "express";
import cors from "cors";
import path from "node:path";
import { authRouter } from "./modules/auth/auth.routes";
import { businessRouter } from "./modules/business/business.routes";
import { customersRouter } from "./modules/customers/customers.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { invoicesRouter, publicReceiptRouter } from "./modules/invoices/invoices.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/files", express.static(path.join(__dirname, "..", "storage")));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/business", businessRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/r", publicReceiptRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
