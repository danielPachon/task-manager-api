import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { userRepository, type User } from '../users/user.repository';
import type { LoginInput, RegisterInput } from './auth.schemas';

const SALT_ROUNDS = 10;
const UNIQUE_VIOLATION = '23505';

export interface AuthResult {
  user: User;
  token: string;
}

const signToken = (userId: string) =>
  jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

export const authService = {
  async register({ name, email, password }: RegisterInput): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    try {
      const user = await userRepository.create(name, email, passwordHash);
      return { user, token: signToken(user.id) };
    } catch (err) {
      if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
        throw AppError.conflict('Email is already registered');
      }
      throw err;
    }
  },

  async login({ email, password }: LoginInput): Promise<AuthResult> {
    const found = await userRepository.findByEmailWithPassword(email);
    // Same error for unknown email and wrong password to avoid user enumeration
    const valid = found && (await bcrypt.compare(password, found.passwordHash));
    if (!found || !valid) throw AppError.unauthorized('Invalid email or password');

    const { passwordHash: _ignored, ...user } = found;
    return { user, token: signToken(user.id) };
  },

  verifyToken(token: string): string {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      if (typeof payload === 'string' || !payload.sub) throw new Error('Invalid payload');
      return payload.sub;
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }
  },
};
