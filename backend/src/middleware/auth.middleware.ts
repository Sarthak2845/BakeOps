import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { verifyToken, type JwtPayload } from "../utils/jwt";

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
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }

  next();
}
