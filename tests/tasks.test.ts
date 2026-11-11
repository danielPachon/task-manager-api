import request from 'supertest';
import { pool } from '../src/db/pool';
import { app, registerUser, resetDatabase } from './helpers';

let token: string;
const auth = () => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  await resetDatabase();
  ({ token } = await registerUser());
});
afterAll(() => pool.end());

const createTask = (body: object) => request(app).post('/api/v1/tasks').set(auth()).send(body);

describe('Tasks CRUD', () => {
  it('creates a task with defaults', async () => {
    const res = await createTask({ title: 'Write README', dueDate: '2026-12-01' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Write README',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-12-01',
    });
  });

  it('validates input', async () => {
    const res = await createTask({ title: '', priority: 'urgent' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('title');
    expect(res.body.error.details).toHaveProperty('priority');
  });

  it('gets, updates and deletes a task', async () => {
    const { body: task } = await createTask({ title: 'Deploy API' });

    const fetched = await request(app).get(`/api/v1/tasks/${task.id}`).set(auth());
    expect(fetched.body.title).toBe('Deploy API');

    const updated = await request(app)
      .patch(`/api/v1/tasks/${task.id}`)
      .set(auth())
      .send({ status: 'done', description: null });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ status: 'done', description: null, title: 'Deploy API' });

    const deleted = await request(app).delete(`/api/v1/tasks/${task.id}`).set(auth());
    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/v1/tasks/${task.id}`).set(auth());
    expect(missing.status).toBe(404);
  });

  it('rejects an empty update', async () => {
    const { body: task } = await createTask({ title: 'Task' });
    const res = await request(app).patch(`/api/v1/tasks/${task.id}`).set(auth()).send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/v1/tasks/not-a-uuid').set(auth());
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/tasks');
    expect(res.status).toBe(401);
  });
});

describe('Ownership', () => {
  it("does not let a user read, update or delete another user's task", async () => {
    const { body: task } = await createTask({ title: 'Private task' });
    const { token: otherToken } = await registerUser();
    const other = { Authorization: `Bearer ${otherToken}` };

    expect((await request(app).get(`/api/v1/tasks/${task.id}`).set(other)).status).toBe(404);
    expect(
      (await request(app).patch(`/api/v1/tasks/${task.id}`).set(other).send({ title: 'Hacked' })).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/v1/tasks/${task.id}`).set(other)).status).toBe(404);

    const list = await request(app).get('/api/v1/tasks').set(other);
    expect(list.body.meta.total).toBe(0);
  });
});

describe('GET /api/v1/tasks (listing)', () => {
  beforeEach(async () => {
    await createTask({ title: 'Buy groceries', priority: 'low', dueDate: '2026-12-10' });
    await createTask({ title: 'Fix login bug', priority: 'high', status: 'in_progress', dueDate: '2026-12-01' });
    await createTask({ title: 'Plan sprint', priority: 'medium', status: 'done' });
  });

  it('filters by status and priority', async () => {
    const byStatus = await request(app).get('/api/v1/tasks?status=done').set(auth());
    expect(byStatus.body.data.map((t: { title: string }) => t.title)).toEqual(['Plan sprint']);

    const byPriority = await request(app).get('/api/v1/tasks?priority=high').set(auth());
    expect(byPriority.body.data).toHaveLength(1);
  });

  it('searches by text, case-insensitively', async () => {
    const res = await request(app).get('/api/v1/tasks?search=BUG').set(auth());
    expect(res.body.data.map((t: { title: string }) => t.title)).toEqual(['Fix login bug']);
  });

  it('sorts by priority and by due date with nulls last', async () => {
    const byPriority = await request(app).get('/api/v1/tasks?sortBy=priority&order=desc').set(auth());
    expect(byPriority.body.data.map((t: { priority: string }) => t.priority)).toEqual(['high', 'medium', 'low']);

    const byDue = await request(app).get('/api/v1/tasks?sortBy=dueDate&order=asc').set(auth());
    expect(byDue.body.data.map((t: { dueDate: string | null }) => t.dueDate)).toEqual([
      '2026-12-01',
      '2026-12-10',
      null,
    ]);
  });

  it('paginates and reports metadata', async () => {
    const res = await request(app).get('/api/v1/tasks?limit=2&page=2').set(auth());

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });
});
