import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { verifyToken, type JwtPayload } from "../utils/jwt";
import { moduleLogger } from "../utils/logger";
import { setRequestContext } from "../utils/requestContext";

const log = moduleLogger("auth");

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    req.auth = verifyToken(token);
  } catch (err) {
    log.warn({ reason: (err as Error).name }, "token verification failed");
    throw ApiError.unauthorized("Invalid or expired token");
  }

  setRequestContext({ businessId: req.auth.businessId, userId: req.auth.userId });
  next();
}
