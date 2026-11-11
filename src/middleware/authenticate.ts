import type { RequestHandler } from 'express';
import { authService } from '../modules/auth/auth.service';
import { AppError } from '../utils/AppError';

/** Requires a valid Bearer token and exposes the user id as res.locals.userId. */
export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(AppError.unauthorized());

  res.locals.userId = authService.verifyToken(header.slice('Bearer '.length));
  next();
};
