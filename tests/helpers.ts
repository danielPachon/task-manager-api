import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db/pool';

export const app = createApp();

export async function resetDatabase() {
  await pool.query('TRUNCATE tasks, users RESTART IDENTITY CASCADE');
}

let counter = 0;

/** Registers a fresh user and returns its token. */
export async function registerUser(overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  counter += 1;
  const body = {
    name: 'Test User',
    email: `user${counter}@example.com`,
    password: 'Secret123',
    ...overrides,
  };
  const res = await request(app).post('/api/v1/auth/register').send(body);
  return { token: res.body.token as string, user: res.body.user, credentials: body };
}
