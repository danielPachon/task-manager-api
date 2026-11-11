import './env';

export default async function globalSetup() {
  const { runMigrations } = await import('../src/db/migrate');
  const { pool } = await import('../src/db/pool');
  await runMigrations();
  await pool.end();
}
