import pino from "pino";
import { env } from "../config/env";
import { getRequestContext } from "./requestContext";

export const logger = pino({
  level: env.logLevel,
  base: { service: "bakeops-api", env: env.nodeEnv },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Every log line written while handling a request is tagged with its
  // requestId (and businessId/userId once authenticated), so one grep for
  // the id returns the full trace: request -> db ops -> events -> errors.
  mixin() {
    const ctx = getRequestContext();
    if (!ctx) return {};
    return {
      requestId: ctx.requestId,
      ...(ctx.businessId ? { businessId: ctx.businessId } : {}),
      ...(ctx.userId ? { userId: ctx.userId } : {}),
    };
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "*.password",
      "*.passwordHash",
      "*.token",
      "headers.authorization",
      "headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  transport: env.logPretty
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname,service,env" },
      }
    : undefined,
});

export type Logger = typeof logger;

export function moduleLogger(module: string): Logger {
  return logger.child({ module });
}
