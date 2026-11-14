import express from "express";
import cors from "cors";
import { authRouter } from "./modules/auth/auth.routes";
import { businessRouter } from "./modules/business/business.routes";
import { customersRouter } from "./modules/customers/customers.routes";
import { ordersRouter, publicTrackingRouter } from "./modules/orders/orders.routes";
import { productsRouter } from "./modules/products/products.routes";
import { invoicesRouter, publicReceiptRouter } from "./modules/invoices/invoices.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/requestLogger.middleware";

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(cors({ exposedHeaders: ["X-Request-Id"] }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/business", businessRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/r", publicReceiptRouter);
  app.use("/api/track", publicTrackingRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
