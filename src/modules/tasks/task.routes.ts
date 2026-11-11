import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from './task.schemas';
import { taskService } from './task.service';

export const taskRouter = Router();

taskRouter.use(authenticate);

taskRouter.get('/', validate(listTasksQuerySchema, 'query'), async (_req, res) => {
  res.json(await taskService.list(res.locals.userId, res.locals.query));
});

taskRouter.post('/', validate(createTaskSchema), async (_req, res) => {
  res.status(201).json(await taskService.create(res.locals.userId, res.locals.body));
});

taskRouter.get('/:id', validate(taskIdParamsSchema, 'params'), async (_req, res) => {
  res.json(await taskService.get(res.locals.userId, res.locals.params.id));
});

taskRouter.patch(
  '/:id',
  validate(taskIdParamsSchema, 'params'),
  validate(updateTaskSchema),
  async (_req, res) => {
    res.json(await taskService.update(res.locals.userId, res.locals.params.id, res.locals.body));
  },
);

taskRouter.delete('/:id', validate(taskIdParamsSchema, 'params'), async (_req, res) => {
  await taskService.remove(res.locals.userId, res.locals.params.id);
  res.status(204).send();
});
