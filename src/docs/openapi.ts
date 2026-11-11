const taskProperties = {
  id: { type: 'string', format: 'uuid' },
  title: { type: 'string', example: 'Prepare sprint demo' },
  description: { type: 'string', nullable: true },
  status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
  dueDate: { type: 'string', format: 'date', nullable: true, example: '2026-12-01' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const taskIdParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Task Manager API',
    version: '1.0.0',
    description: 'RESTful API to manage personal tasks with JWT authentication.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: { message: { type: 'string' }, details: { type: 'object' } },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: { user: { $ref: '#/components/schemas/User' }, token: { type: 'string' } },
      },
      Task: { type: 'object', properties: taskProperties },
      TaskInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: taskProperties.title,
          description: { type: 'string' },
          status: taskProperties.status,
          priority: taskProperties.priority,
          dueDate: taskProperties.dueDate,
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Daniel' },
                  email: { type: 'string', format: 'email', example: 'daniel@example.com' },
                  password: { type: 'string', example: 'Secret123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: errorResponse('Validation failed'),
          409: errorResponse('Email already registered'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and get a JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Logged in', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: errorResponse('Invalid credentials'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current user',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Current user' }, 401: errorResponse('Unauthorized') },
      },
    },
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks with filters, sorting and pagination',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: taskProperties.status },
          { name: 'priority', in: 'query', schema: taskProperties.priority },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'dueDate', 'priority'] } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { 200: { description: 'Paginated tasks' }, 401: errorResponse('Unauthorized') },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } } },
        responses: {
          201: { description: 'Task created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          400: errorResponse('Validation failed'),
        },
      },
    },
    '/tasks/{id}': {
      parameters: [taskIdParam],
      get: {
        tags: ['Tasks'],
        summary: 'Get a task',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Task' }, 404: errorResponse('Not found') },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task (partial)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } } },
        responses: { 200: { description: 'Updated task' }, 400: errorResponse('Validation failed'), 404: errorResponse('Not found') },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'Deleted' }, 404: errorResponse('Not found') },
      },
    },
  },
};
