import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/apiError";
import { moduleLogger } from "../utils/logger";

const log = moduleLogger("error");

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.path}`, requestId: req.requestId },
  });
}

// body-parser and other http-errors based middleware attach a 4xx status
// (e.g. malformed JSON -> 400, payload too large -> 413).
function clientHttpError(err: unknown): { status: number; message: string; type?: string } | null {
  if (typeof err !== "object" || err === null) return null;
  const e = err as { status?: unknown; statusCode?: unknown; expose?: unknown; message?: unknown; type?: unknown };
  const status = typeof e.status === "number" ? e.status : typeof e.statusCode === "number" ? e.statusCode : null;
  if (!status || status < 400 || status >= 500 || e.expose === false) return null;
  return {
    status,
    message: typeof e.message === "string" ? e.message : "Bad request",
    type: typeof e.type === "string" ? e.type : undefined,
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    // Log which fields failed and why, never the submitted values.
    log.warn(
      {
        status: 400,
        issues: err.issues.map((i) => ({ path: i.path.join("."), code: i.code, message: i.message })),
      },
      "validation failed"
    );
    res.status(400).json({
      error: {
        message: "Validation failed",
        details: err.flatten(),
        requestId,
      },
    });
    return;
  }

  if (err instanceof ApiError) {
    log.warn({ status: err.status, reason: err.message, details: err.details }, "request rejected");
    res.status(err.status).json({ error: { message: err.message, details: err.details, requestId } });
    return;
  }

  const httpError = clientHttpError(err);
  if (httpError) {
    log.warn({ status: httpError.status, reason: httpError.message, type: httpError.type }, "request rejected");
    res.status(httpError.status).json({ error: { message: httpError.message, requestId } });
    return;
  }

  // P2000: value too long for column, P2020: value out of range for column type.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === "P2000" || err.code === "P2020")
  ) {
    log.warn({ status: 400, prismaCode: err.code, prismaMeta: err.meta }, "value out of range");
    res.status(400).json({ error: { message: "One or more values are out of range", requestId } });
    return;
  }

  log.error(
    {
      err,
      ...(err instanceof Prisma.PrismaClientKnownRequestError
        ? { prismaCode: err.code, prismaMeta: err.meta }
        : {}),
      method: req.method,
      path: req.originalUrl,
    },
    "unhandled error"
  );
  res.status(500).json({ error: { message: "Internal server error", requestId } });
}
