import { pool } from '../../db/pool';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
});

export const userRepository = {
  async create(name: string, email: string, passwordHash: string): Promise<User> {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, passwordHash],
    );
    return toUser(rows[0]);
  },

  async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
    const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows[0]) return null;
    return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
  },

  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? toUser(rows[0]) : null;
  },
};
