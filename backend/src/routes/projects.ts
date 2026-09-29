import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler.js';
import { param } from '../lib/params.js';
import { requireAuth, requireStudent, studentIdOf } from '../middleware/requireAuth.js';
import {
  discoverQuerySchema,
  joinDecisionSchema,
  joinRequestSchema,
  projectSchema,
  projectUpdateSchema,
  taskSchema,
  taskUpdateSchema,
} from '../models/project.model.js';
import {
  addTask,
  createProject,
  decideJoinRequest,
  deleteProject,
  deleteTask,
  discover,
  getProject,
  listIdeas,
  listMine,
  removeMember,
  requestToJoin,
  startIdea,
  updateProject,
  updateTask,
} from '../services/project.service.js';

/**
 * Every project route below checks access in the service through
 * `assertProjectAccess` — owner, team, or any student for campus-visible ones.
 */
export const projectsRouter = Router();

projectsRouter.use(requireAuth, requireStudent);

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: listMine(studentIdOf(req)) });
  }),
);

projectsRouter.get(
  '/discover',
  asyncHandler(async (req, res) => {
    res.json({ data: discover(studentIdOf(req), discoverQuerySchema.parse(req.query)) });
  }),
);

projectsRouter.get(
  '/ideas',
  asyncHandler(async (req, res) => {
    res.json({ data: listIdeas(studentIdOf(req)) });
  }),
);

projectsRouter.post(
  '/ideas/:ideaId/start',
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await startIdea(studentIdOf(req), param(req, 'ideaId')) });
  }),
);

projectsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ data: await createProject(studentIdOf(req), projectSchema.parse(req.body)) });
  }),
);

projectsRouter.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    res.json({ data: getProject(studentIdOf(req), param(req, 'projectId')) });
  }),
);

projectsRouter.patch(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const input = projectUpdateSchema.parse(req.body);
    res.json({ data: await updateProject(studentIdOf(req), param(req, 'projectId'), input) });
  }),
);

projectsRouter.delete(
  '/:projectId',
  asyncHandler(async (req, res) => {
    await deleteProject(studentIdOf(req), param(req, 'projectId'));
    res.json({ data: null });
  }),
);

projectsRouter.post(
  '/:projectId/tasks',
  asyncHandler(async (req, res) => {
    const input = taskSchema.parse(req.body);
    res.status(201).json({ data: await addTask(studentIdOf(req), param(req, 'projectId'), input) });
  }),
);

projectsRouter.patch(
  '/:projectId/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const input = taskUpdateSchema.parse(req.body);
    res.json({
      data: await updateTask(
        studentIdOf(req),
        param(req, 'projectId'),
        param(req, 'taskId'),
        input,
      ),
    });
  }),
);

projectsRouter.delete(
  '/:projectId/tasks/:taskId',
  asyncHandler(async (req, res) => {
    res.json({
      data: await deleteTask(studentIdOf(req), param(req, 'projectId'), param(req, 'taskId')),
    });
  }),
);

projectsRouter.post(
  '/:projectId/join-requests',
  asyncHandler(async (req, res) => {
    const { message } = joinRequestSchema.parse(req.body);
    res
      .status(201)
      .json({ data: await requestToJoin(studentIdOf(req), param(req, 'projectId'), message) });
  }),
);

projectsRouter.patch(
  '/:projectId/join-requests/:requestId',
  asyncHandler(async (req, res) => {
    const { decision, role } = joinDecisionSchema.parse(req.body);
    res.json({
      data: await decideJoinRequest(
        studentIdOf(req),
        param(req, 'projectId'),
        param(req, 'requestId'),
        decision,
        role,
      ),
    });
  }),
);

/** The owner removing someone, or a member leaving. */
projectsRouter.delete(
  '/:projectId/members/:studentId',
  asyncHandler(async (req, res) => {
    res.json({
      data: await removeMember(studentIdOf(req), param(req, 'projectId'), param(req, 'studentId')),
    });
  }),
);
