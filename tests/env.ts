process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-with-enough-length';
process.env.DATABASE_URL ??= 'postgres://postgres:postgres@localhost:5432/task_manager_test';
