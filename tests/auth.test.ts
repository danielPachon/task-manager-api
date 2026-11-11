import request from 'supertest';
import { pool } from '../src/db/pool';
import { app, registerUser, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => pool.end());

describe('POST /api/v1/auth/register', () => {
  it('creates a user and returns a token without exposing the password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Daniel', email: 'Daniel@Example.com', password: 'Secret123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Daniel', email: 'daniel@example.com' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser({ email: 'dup@example.com' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Other', email: 'dup@example.com', password: 'Secret123' });

    expect(res.status).toBe(409);
  });

  it('rejects a weak password with 400 and field details', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Daniel', email: 'weak@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('password');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const { credentials } = await registerUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('returns the same 401 for wrong password and unknown email', async () => {
    const { credentials } = await registerUser();
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'Wrong1234' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'Secret123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const { token, user } = await registerUser();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects missing and invalid tokens', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-token')).status,
    ).toBe(401);
  });
});
