import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./config/env";
import { moduleLogger } from "./utils/logger";

const log = moduleLogger("db");

// Neon (free plan) suspends the database after ~5 min without queries and
// closes every open connection. Drop idle connections well before that, so a
// request never picks up one Neon has already closed.
const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 20_000,
  keepAlive: true,
});

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

// Reads are safe to repeat; writes are not (one could have committed just
// before the connection dropped), so only reads are retried.
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/** The connection was closed or unreachable (e.g. Neon woke up from sleep), not a query error. */
function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code === "P1017" || err.code === "P1001") return true;
  const kind = (err.meta as { driverAdapterError?: { cause?: { kind?: string } } } | undefined)?.driverAdapterError?.cause?.kind;
  return kind === "ConnectionClosed";
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
        let result: unknown;
        try {
          result = await query(args);
        } catch (err) {
          if (!READ_OPERATIONS.has(operation) || !isConnectionError(err)) throw err;
          log.warn({ model, operation, prismaCode: (err as Prisma.PrismaClientKnownRequestError).code }, "db connection was closed; retrying read once");
          result = await query(args);
        }
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
