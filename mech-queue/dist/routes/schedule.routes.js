"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScheduleRoutes = createScheduleRoutes;
const express_1 = require("express");
const schedule_service_1 = require("../services/schedule.service");
const express_validator_1 = require("express-validator");
const async_handler_1 = require("../utils/async-handler");
function createScheduleRoutes(queueManager) {
    const router = (0, express_1.Router)();
    const scheduleService = new schedule_service_1.ScheduleService(queueManager);
    // Create schedule validation
    const createScheduleValidation = [
        (0, express_validator_1.body)('name').isString().notEmpty().withMessage('Schedule name is required'),
        (0, express_validator_1.body)('endpoint').isObject().withMessage('Endpoint configuration is required'),
        (0, express_validator_1.body)('endpoint.url').isURL().withMessage('Valid endpoint URL is required'),
        (0, express_validator_1.body)('endpoint.method').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).withMessage('Valid HTTP method is required'),
        (0, express_validator_1.body)('endpoint.headers').optional().isObject(),
        (0, express_validator_1.body)('endpoint.body').optional(),
        (0, express_validator_1.body)('endpoint.timeout').optional().isInt({ min: 1000, max: 300000 }),
        (0, express_validator_1.body)('schedule').isObject().withMessage('Schedule configuration is required'),
        (0, express_validator_1.body)('schedule.cron').optional().isString(),
        (0, express_validator_1.body)('schedule.at').optional().isISO8601(),
        (0, express_validator_1.body)('schedule.timezone').optional().isString(),
        (0, express_validator_1.body)('schedule.endDate').optional().isISO8601(),
        (0, express_validator_1.body)('schedule.limit').optional().isInt({ min: 1 }),
        (0, express_validator_1.body)('retryPolicy').optional().isObject(),
        (0, express_validator_1.body)('retryPolicy.attempts').optional().isInt({ min: 1, max: 10 }),
        (0, express_validator_1.body)('retryPolicy.backoff').optional().isObject(),
        (0, express_validator_1.body)('enabled').optional().isBoolean(),
        (0, express_validator_1.body)('metadata').optional().isObject()
    ];
    // Update schedule validation
    const updateScheduleValidation = [
        (0, express_validator_1.param)('scheduleId').isMongoId(),
        (0, express_validator_1.body)('name').optional().isString().notEmpty(),
        (0, express_validator_1.body)('endpoint').optional().isObject(),
        (0, express_validator_1.body)('endpoint.url').optional().isURL(),
        (0, express_validator_1.body)('endpoint.method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
        (0, express_validator_1.body)('endpoint.headers').optional().isObject(),
        (0, express_validator_1.body)('endpoint.body').optional(),
        (0, express_validator_1.body)('endpoint.timeout').optional().isInt({ min: 1000, max: 300000 }),
        (0, express_validator_1.body)('schedule').optional().isObject(),
        (0, express_validator_1.body)('schedule.cron').optional().isString(),
        (0, express_validator_1.body)('schedule.at').optional().isISO8601(),
        (0, express_validator_1.body)('schedule.timezone').optional().isString(),
        (0, express_validator_1.body)('schedule.endDate').optional().isISO8601(),
        (0, express_validator_1.body)('schedule.limit').optional().isInt({ min: 1 }),
        (0, express_validator_1.body)('retryPolicy').optional().isObject(),
        (0, express_validator_1.body)('retryPolicy.attempts').optional().isInt({ min: 1, max: 10 }),
        (0, express_validator_1.body)('retryPolicy.backoff').optional().isObject(),
        (0, express_validator_1.body)('enabled').optional().isBoolean(),
        (0, express_validator_1.body)('metadata').optional().isObject()
    ];
    // List schedules validation
    const listSchedulesValidation = [
        (0, express_validator_1.query)('enabled').optional().isBoolean(),
        (0, express_validator_1.query)('createdBy').optional().isString(),
        (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
        (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 })
    ];
    // Create a schedule
    router.post('/schedules', createScheduleValidation, (0, async_handler_1.asyncHandler)(async (req, res) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const createdBy = req.body.createdBy || 'system';
        const schedule = await scheduleService.createSchedule(req.body, createdBy);
        res.status(201).json({
            success: true,
            data: schedule
        });
    }));
    // Update a schedule
    router.put('/schedules/:scheduleId', updateScheduleValidation, (0, async_handler_1.asyncHandler)(async (req, res) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { scheduleId } = req.params;
        const updatedBy = req.body.updatedBy || 'system';
        const schedule = await scheduleService.updateSchedule(scheduleId, req.body, updatedBy);
        res.json({
            success: true,
            data: schedule
        });
    }));
    // Delete a schedule
    router.delete('/schedules/:scheduleId', [
        (0, express_validator_1.param)('scheduleId').isMongoId()
    ], (0, async_handler_1.asyncHandler)(async (req, res) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { scheduleId } = req.params;
        await scheduleService.deleteSchedule(scheduleId);
        res.json({
            success: true,
            message: 'Schedule deleted successfully'
        });
    }));
    // Get a schedule
    router.get('/schedules/:scheduleId', [
        (0, express_validator_1.param)('scheduleId').isMongoId()
    ], (0, async_handler_1.asyncHandler)(async (req, res) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { scheduleId } = req.params;
        const schedule = await scheduleService.getSchedule(scheduleId);
        res.json({
            success: true,
            data: schedule
        });
    }));
    // List schedules
    router.get('/schedules', listSchedulesValidation, (0, async_handler_1.asyncHandler)(async (req, res) => {
        const errors = (0, express_validator_1.validationResult)(req);
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
    }));
    // Execute schedule immediately
    router.post('/schedules/:scheduleId/execute', [
        (0, express_validator_1.param)('scheduleId').isMongoId()
    ], (0, async_handler_1.asyncHandler)(async (req, res) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { scheduleId } = req.params;
        const result = await scheduleService.executeScheduleNow(scheduleId);
        res.json({
            success: true,
            data: result
        });
    }));
    // Enable/disable a schedule
    router.patch('/schedules/:scheduleId/toggle', [
        (0, express_validator_1.param)('scheduleId').isMongoId(),
        (0, express_validator_1.body)('enabled').isBoolean().withMessage('Enabled status is required')
    ], (0, async_handler_1.asyncHandler)(async (req, res) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { scheduleId } = req.params;
        const { enabled } = req.body;
        const updatedBy = req.body.updatedBy || 'system';
        const schedule = await scheduleService.updateSchedule(scheduleId, { enabled }, updatedBy);
        res.json({
            success: true,
            data: schedule
        });
    }));
    return router;
}
//# sourceMappingURL=schedule.routes.js.map