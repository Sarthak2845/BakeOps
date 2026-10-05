import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./config/env";
import { moduleLogger } from "./utils/logger";

const log = moduleLogger("db");

const adapter = new PrismaPg({ connectionString: env.databaseUrl });

const baseClient = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

baseClient.$on("warn", (e) => log.warn({ target: e.target }, e.message));
baseClient.$on("error", (e) => log.error({ target: e.target }, e.message));

function errorFields(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return { prismaCode: err.code, prismaMeta: err.meta, err };
  }
  return { err };
}

// Times every operation (model calls, raw queries, ops inside transactions)
// and logs it with model/operation. Query args are deliberately not logged:
// they carry customer names, phone numbers, etc.
export const prisma = baseClient.$extends({
  name: "logging",
  query: {
    async $allOperations({ model, operation, args, query }) {
      const startedAt = performance.now();
      try {
        const result = await query(args);
        const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
        if (durationMs >= env.slowQueryMs) {
          log.warn({ model, operation, durationMs, thresholdMs: env.slowQueryMs }, "slow db operation");
        } else {
          log.debug({ model, operation, durationMs }, "db operation");
        }
        return result;
      } catch (err) {
        const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
        log.error({ model, operation, durationMs, ...errorFields(err) }, "db operation failed");
        throw err;
      }
    },
  },
});

export type DbClient = typeof prisma;
export type DbTransaction = Parameters<Parameters<DbClient["$transaction"]>[0]>[0];
