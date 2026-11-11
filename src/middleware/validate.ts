import type { RequestHandler } from 'express';
import { z, type ZodType } from 'zod';
import { AppError } from '../utils/AppError';

type Source = 'body' | 'query' | 'params';

/**
 * Validates and parses a request section with a Zod schema.
 * Parsed values are stored in res.locals so handlers get typed, coerced data.
 */
export const validate =
  (schema: ZodType, source: Source = 'body'): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(AppError.badRequest('Validation failed', z.flattenError(result.error).fieldErrors));
    }
    res.locals[source] = result.data;
    next();
  };
