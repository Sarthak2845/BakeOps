import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

// Express 5 makes `req.query` a getter with no setter, so the parsed
// (and coerced) query is stashed on `req.validatedQuery` instead of
// reassigning `req.query`.
export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.validatedQuery = schema.parse(req.query);
    next();
  };
}
