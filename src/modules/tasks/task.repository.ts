import { pool } from '../../db/pool';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schemas';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `id, title, description, status, priority,
  to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at, updated_at`;

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Whitelisted ORDER BY expressions: user input never reaches the SQL string directly
const SORT_COLUMNS: Record<ListTasksQuery['sortBy'], string> = {
  createdAt: 'created_at',
  dueDate: 'due_date',
  priority: "array_position(ARRAY['low','medium','high'], priority)",
};

const UPDATABLE_COLUMNS: Record<keyof UpdateTaskInput, string> = {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  dueDate: 'due_date',
};

export const taskRepository = {
  async create(userId: string, input: CreateTaskInput): Promise<Task> {
    const { rows } = await pool.query<TaskRow>(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SELECT_COLUMNS}`,
      [userId, input.title, input.description ?? null, input.status, input.priority, input.dueDate ?? null],
    );
    return toTask(rows[0]);
  },

  async findAll(userId: string, query: ListTasksQuery): Promise<{ tasks: Task[]; total: number }> {
    const conditions = ['user_id = $1'];
    const values: unknown[] = [userId];

    if (query.status) {
      values.push(query.status);
      conditions.push(`status = $${values.length}`);
    }
    if (query.priority) {
      values.push(query.priority);
      conditions.push(`priority = $${values.length}`);
    }
    if (query.search) {
      values.push(`%${query.search}%`);
      conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }

    const where = conditions.join(' AND ');
    const order = `${SORT_COLUMNS[query.sortBy]} ${query.order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, id`;

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM tasks WHERE ${where}`,
      values,
    );

    values.push(query.limit, (query.page - 1) * query.limit);
    const { rows } = await pool.query<TaskRow>(
      `SELECT ${SELECT_COLUMNS} FROM tasks
       WHERE ${where}
       ORDER BY ${order}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return { tasks: rows.map(toTask), total: Number(countResult.rows[0].count) };
  },

  async findById(userId: string, id: string): Promise<Task | null> {
    const { rows } = await pool.query<TaskRow>(
      `SELECT ${SELECT_COLUMNS} FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ? toTask(rows[0]) : null;
  },

  async update(userId: string, id: string, input: UpdateTaskInput): Promise<Task | null> {
    const entries = Object.entries(input) as [keyof UpdateTaskInput, unknown][];
    const sets = entries.map(([key], i) => `${UPDATABLE_COLUMNS[key]} = $${i + 3}`);

    const { rows } = await pool.query<TaskRow>(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING ${SELECT_COLUMNS}`,
      [id, userId, ...entries.map(([, value]) => value)],
    );
    return rows[0] ? toTask(rows[0]) : null;
  },

  async delete(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);
    return (rowCount ?? 0) > 0;
  },
};
