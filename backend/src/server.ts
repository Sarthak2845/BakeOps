import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./prisma";
import { logger } from "./utils/logger";

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception, shutting down");
  logger.flush();
  process.exit(1);
});

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(
    { port: env.port, nodeEnv: env.nodeEnv, logLevel: env.logLevel },
    `BakeOps API listening on http://localhost:${env.port}`
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, "shutdown signal received, closing server");
  server.close(async (err) => {
    if (err) logger.error({ err }, "error while closing HTTP server");
    await prisma.$disconnect().catch((e) => logger.error({ err: e }, "error disconnecting prisma"));
    logger.info("shutdown complete");
    logger.flush();
    process.exit(err ? 1 : 0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
