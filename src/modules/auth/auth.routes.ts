import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { userRepository } from '../users/user.repository';
import { loginSchema, registerSchema } from './auth.schemas';
import { authService } from './auth.service';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
});

authRouter.post('/register', authLimiter, validate(registerSchema), async (_req, res) => {
  const result = await authService.register(res.locals.body);
  res.status(201).json(result);
});

authRouter.post('/login', authLimiter, validate(loginSchema), async (_req, res) => {
  const result = await authService.login(res.locals.body);
  res.json(result);
});

authRouter.get('/me', authenticate, async (_req, res) => {
  const user = await userRepository.findById(res.locals.userId);
  if (!user) throw AppError.unauthorized('User no longer exists');
  res.json({ user });
});
