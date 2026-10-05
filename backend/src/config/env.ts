import dotenv from "dotenv";

dotenv.config({ quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isTest = nodeEnv === "test" || process.env.JEST_WORKER_ID !== undefined;

export const env = {
  nodeEnv,
  isTest,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  // Tests stay quiet unless LOG_LEVEL is set explicitly.
  logLevel: process.env.LOG_LEVEL ?? (isTest ? "silent" : "info"),
  // Human-readable output for local dev; JSON (one object per line) everywhere else.
  logPretty: process.env.LOG_PRETTY
    ? process.env.LOG_PRETTY === "true"
    : nodeEnv === "development" && !isTest && Boolean(process.stdout.isTTY),
  slowQueryMs: Number(process.env.LOG_SLOW_QUERY_MS ?? 500),
};
