# Task Manager API

[![CI](https://github.com/danielPachon/task-manager-api/actions/workflows/ci.yml/badge.svg)](https://github.com/danielPachon/task-manager-api/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

**🚀 Live demo:** [task-manager-api-0uhq.onrender.com/docs](https://task-manager-api-0uhq.onrender.com/docs) (interactive Swagger UI)

> Hosted on Render's free tier with a Neon PostgreSQL database. The first request after inactivity can take up to a minute while the service wakes up.

A RESTful API to manage personal tasks, with JWT authentication, input validation, filtering, sorting and pagination. Built with **Node.js, TypeScript, Express 5 and PostgreSQL**, covered by integration tests and shipped with Docker and CI.

## Features

- **Authentication**: register, log in and fetch the current user with JWT. Passwords are hashed with bcrypt, and login returns the same error for an unknown email or a wrong password to prevent user enumeration.
- **Task CRUD** with ownership checks: users can only see and change their own tasks.
- **Listing**: filter by status and priority, full-text search on title and description, sort by creation date, due date or priority, and paginate with metadata.
- **Validation** with Zod on body, query and path params, returning clear field-level errors.
- **Security**: Helmet headers, CORS, rate limiting on auth routes, body size limit, parameterized SQL and whitelisted sort columns.
- **Interactive docs** with OpenAPI 3 and Swagger UI at `/docs`.
- **Operational basics**: health check, versioned SQL migrations, graceful shutdown and environment validation at startup.

## Tech stack

| Layer | Tools |
|---|---|
| Runtime | Node.js 22, TypeScript (strict) |
| Web | Express 5, Helmet, CORS, express-rate-limit |
| Data | PostgreSQL 16, `pg` (no ORM, plain SQL) |
| Auth | JSON Web Tokens, bcrypt |
| Validation | Zod |
| Testing | Jest, Supertest (integration tests against a real database) |
| Tooling | ESLint, Docker, GitHub Actions |
| Hosting | Render (Docker, Blueprint as code), Neon (serverless PostgreSQL) |

## Architecture

```
src/
├── app.ts                 # Express app factory (used by server and tests)
├── server.ts              # HTTP server and graceful shutdown
├── config/env.ts          # Typed, validated environment variables
├── db/                    # Connection pool, migration runner and SQL migrations
├── middleware/            # Authentication, validation and error handling
├── modules/
│   ├── auth/              # Routes → service (business rules)
│   ├── tasks/             # Routes → service → repository (SQL)
│   └── users/
├── docs/openapi.ts        # OpenAPI specification
└── utils/AppError.ts      # Typed HTTP errors
```

Each module follows a **routes → service → repository** layering: routes handle HTTP concerns, services hold business rules (for example, every task query is scoped to the authenticated user) and repositories are the only place that talks to the database.

## Getting started

### Try it online

Open the [live Swagger UI](https://task-manager-api-0uhq.onrender.com/docs), register a user with `POST /auth/register`, click **Authorize** and paste the returned token to call the task endpoints.

### With Docker (recommended)

```bash
docker compose up --build
```

The API runs at http://localhost:3000 and the docs at http://localhost:3000/docs. Migrations run automatically on startup.

### Locally

Requirements: Node.js 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env      # adjust DATABASE_URL and JWT_SECRET
npm run migrate
npm run dev
```

## API overview

Base URL: `/api/v1`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create an account | – |
| POST | `/auth/login` | Log in and receive a JWT | – |
| GET | `/auth/me` | Current user | ✅ |
| GET | `/tasks` | List tasks (filters, search, sort, pagination) | ✅ |
| POST | `/tasks` | Create a task | ✅ |
| GET | `/tasks/:id` | Get a task | ✅ |
| PATCH | `/tasks/:id` | Partially update a task | ✅ |
| DELETE | `/tasks/:id` | Delete a task | ✅ |

### Example

```bash
# Register and keep the token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Daniel","email":"daniel@example.com","password":"Secret123"}' | jq -r .token)

# Create a task
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Prepare sprint demo","priority":"high","dueDate":"2026-12-01"}'

# High-priority tasks, nearest due date first
curl "http://localhost:3000/api/v1/tasks?priority=high&sortBy=dueDate&order=asc" \
  -H "Authorization: Bearer $TOKEN"
```

Paginated responses look like this:

```json
{
  "data": [{ "id": "…", "title": "Prepare sprint demo", "status": "todo", "priority": "high", "dueDate": "2026-12-01" }],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

Errors share a single format:

```json
{ "error": { "message": "Validation failed", "details": { "title": ["Too small: expected string to have >=1 characters"] } } }
```

## Testing

The test suite runs against a real PostgreSQL database to exercise the actual SQL, constraints and ownership rules.

```bash
# Uses postgres://postgres:postgres@localhost:5432/task_manager_test by default
npm test
```

CI runs lint, type checking, tests and the build on every push and pull request.

## Design decisions

- **Plain SQL instead of an ORM** to keep queries explicit and show how filtering, sorting and pagination work under the hood.
- **Ownership enforced in the query** (`WHERE id = $1 AND user_id = $2`), returning 404 rather than 403 so the API never reveals that another user's task exists.
- **App factory (`createApp`)** so tests can spin up the app without opening a port.
- **Fail fast on bad configuration**: the process exits at startup if environment variables are missing or invalid.

## Roadmap

- [ ] Refresh tokens and logout
- [ ] Task labels and sub-tasks
- [ ] Request logging with correlation IDs

## License

MIT © Daniel Pachón
