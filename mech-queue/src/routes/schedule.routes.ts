import { Router, Request, Response } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { QueueManager } from '../services/queue-manager';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler } from '../utils/async-handler';
import logger from '../utils/logger';

export function createScheduleRoutes(queueManager: QueueManager): Router {
  const router = Router();
  const scheduleService = new ScheduleService(queueManager);

  // Create schedule validation
  const createScheduleValidation = [
    body('name').isString().notEmpty().withMessage('Schedule name is required'),
    body('endpoint').isObject().withMessage('Endpoint configuration is required'),
    body('endpoint.url').isURL().withMessage('Valid endpoint URL is required'),
    body('endpoint.method').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).withMessage('Valid HTTP method is required'),
    body('endpoint.headers').optional().isObject(),
    body('endpoint.body').optional(),
    body('endpoint.timeout').optional().isInt({ min: 1000, max: 300000 }),
    body('schedule').isObject().withMessage('Schedule configuration is required'),
    body('schedule.cron').optional().isString(),
    body('schedule.at').optional().isISO8601(),
    body('schedule.timezone').optional().isString(),
    body('schedule.endDate').optional().isISO8601(),
    body('schedule.limit').optional().isInt({ min: 1 }),
    body('retryPolicy').optional().isObject(),
    body('retryPolicy.attempts').optional().isInt({ min: 1, max: 10 }),
    body('retryPolicy.backoff').optional().isObject(),
    body('enabled').optional().isBoolean(),
    body('metadata').optional().isObject()
  ];

  // Update schedule validation
  const updateScheduleValidation = [
    param('scheduleId').isMongoId(),
    body('name').optional().isString().notEmpty(),
    body('endpoint').optional().isObject(),
    body('endpoint.url').optional().isURL(),
    body('endpoint.method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    body('endpoint.headers').optional().isObject(),
    body('endpoint.body').optional(),
    body('endpoint.timeout').optional().isInt({ min: 1000, max: 300000 }),
    body('schedule').optional().isObject(),
    body('schedule.cron').optional().isString(),
    body('schedule.at').optional().isISO8601(),
    body('schedule.timezone').optional().isString(),
    body('schedule.endDate').optional().isISO8601(),
    body('schedule.limit').optional().isInt({ min: 1 }),
    body('retryPolicy').optional().isObject(),
    body('retryPolicy.attempts').optional().isInt({ min: 1, max: 10 }),
    body('retryPolicy.backoff').optional().isObject(),
    body('enabled').optional().isBoolean(),
    body('metadata').optional().isObject()
  ];

  // List schedules validation
  const listSchedulesValidation = [
    query('enabled').optional().isBoolean(),
    query('createdBy').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ];

  // Create a schedule
  router.post(
    '/schedules',
    createScheduleValidation,
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const createdBy = req.body.createdBy || 'system';

      const schedule = await scheduleService.createSchedule(
        req.body,
        createdBy
      );

      res.status(201).json({
        success: true,
        data: schedule
      });
    })
  );

  // Update a schedule
  router.put(
    '/schedules/:scheduleId',
    updateScheduleValidation,
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scheduleId } = req.params;
      const updatedBy = req.body.updatedBy || 'system';

      const schedule = await scheduleService.updateSchedule(
        scheduleId,
        req.body,
        updatedBy
      );

      res.json({
        success: true,
        data: schedule
      });
    })
  );

  // Delete a schedule
  router.delete(
    '/schedules/:scheduleId',
    [
      param('scheduleId').isMongoId()
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scheduleId } = req.params;

      await scheduleService.deleteSchedule(scheduleId);

      res.json({
        success: true,
        message: 'Schedule deleted successfully'
      });
    })
  );

  // Get a schedule
  router.get(
    '/schedules/:scheduleId',
    [
      param('scheduleId').isMongoId()
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scheduleId } = req.params;

      const schedule = await scheduleService.getSchedule(scheduleId);

      res.json({
        success: true,
        data: schedule
      });
    })
  );

  // List schedules
  router.get(
    '/schedules',
    listSchedulesValidation,
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await scheduleService.listSchedules(req.query);

      res.json({
        success: true,
        data: result.schedules,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages
        }
      });
    })
  );

  // Execute schedule immediately
  router.post(
    '/schedules/:scheduleId/execute',
    [
      param('scheduleId').isMongoId()
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scheduleId } = req.params;

      const result = await scheduleService.executeScheduleNow(scheduleId);

      res.json({
        success: true,
        data: result
      });
    })
  );

  // Enable/disable a schedule
  router.patch(
    '/schedules/:scheduleId/toggle',
    [
      param('scheduleId').isMongoId(),
      body('enabled').isBoolean().withMessage('Enabled status is required')
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { scheduleId } = req.params;
      const { enabled } = req.body;
      const updatedBy = req.body.updatedBy || 'system';

      const schedule = await scheduleService.updateSchedule(
        scheduleId,
        { enabled },
        updatedBy
      );

      res.json({
        success: true,
        data: schedule
      });
    })
  );

  return router;
}