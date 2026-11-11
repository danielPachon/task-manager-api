import { AppError } from '../../utils/AppError';
import { taskRepository, type Task } from './task.repository';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schemas';

export interface PaginatedTasks {
  data: Task[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Business rules for tasks. Every operation is scoped to the authenticated user,
 * so a user can never read or modify someone else's tasks.
 */
export const taskService = {
  create(userId: string, input: CreateTaskInput) {
    return taskRepository.create(userId, input);
  },

  async list(userId: string, query: ListTasksQuery): Promise<PaginatedTasks> {
    const { tasks, total } = await taskRepository.findAll(userId, query);
    return {
      data: tasks,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async get(userId: string, id: string) {
    const task = await taskRepository.findById(userId, id);
    if (!task) throw AppError.notFound('Task not found');
    return task;
  },

  async update(userId: string, id: string, input: UpdateTaskInput) {
    const task = await taskRepository.update(userId, id, input);
    if (!task) throw AppError.notFound('Task not found');
    return task;
  },

  async remove(userId: string, id: string) {
    const deleted = await taskRepository.delete(userId, id);
    if (!deleted) throw AppError.notFound('Task not found');
  },
};
