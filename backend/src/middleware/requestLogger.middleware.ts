import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { moduleLogger } from "../utils/logger";
import { getRequestContext, runWithRequestContext } from "../utils/requestContext";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const log = moduleLogger("http");

// Accept a caller-supplied id (from a proxy or the mobile app) so traces can
// span services; otherwise mint one. Bounded and charset-limited so a client
// can't inject junk into the logs.
const INCOMING_ID = /^[A-Za-z0-9._-]{1,128}$/;

function resolveRequestId(req: Request): string {
  const incoming = req.header("x-request-id");
  return incoming && INCOMING_ID.test(incoming) ? incoming : randomUUID();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = resolveRequestId(req);
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  runWithRequestContext({ requestId, method: req.method, path: req.path }, () => {
    const context = getRequestContext()!;

    log.debug({ method: req.method, path: req.originalUrl }, "request received");

    // `finish` = response fully sent; `close` without `finish` = client went away.
    let logged = false;
    const done = (aborted: boolean) => {
      if (logged) return;
      logged = true;

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const status = res.statusCode;
      const fields = {
        requestId,
        businessId: context.businessId,
        userId: context.userId,
        method: req.method,
        path: req.originalUrl,
        status,
        durationMs: Math.round(durationMs * 10) / 10,
        contentLength: res.getHeader("content-length"),
        ip: req.ip,
        userAgent: req.header("user-agent"),
        ...(aborted ? { aborted: true } : {}),
      };

      const message = `${req.method} ${req.originalUrl} ${status} ${fields.durationMs}ms`;
      if (aborted) log.warn(fields, `request aborted: ${message}`);
      else if (status >= 500) log.error(fields, message);
      else if (status >= 400) log.warn(fields, message);
      else log.info(fields, message);
    };

    res.on("finish", () => done(false));
    res.on("close", () => done(!res.writableFinished));

    next();
  });
}
