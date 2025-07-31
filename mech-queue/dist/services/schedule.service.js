"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
const schedule_model_1 = require("../models/schedule.model");
const logger_1 = __importDefault(require("../utils/logger"));
const errors_1 = require("../utils/errors");
const cronParser = __importStar(require("cron-parser"));
const luxon_1 = require("luxon");
const axios_1 = __importDefault(require("axios"));
class ScheduleService {
    queueManager;
    schedulerQueue;
    constructor(queueManager) {
        this.queueManager = queueManager;
        // Create a dedicated queue for the scheduler
        this.initializeSchedulerQueue();
    }
    async initializeSchedulerQueue() {
        try {
            this.schedulerQueue = await this.queueManager.getQueue('scheduler');
            logger_1.default.info('Scheduler queue initialized');
        }
        catch (error) {
            logger_1.default.error('Failed to initialize scheduler queue:', error);
        }
    }
    async createSchedule(dto, createdBy) {
        try {
            // Validate schedule configuration
            this.validateScheduleConfig(dto.schedule);
            this.validateEndpointConfig(dto.endpoint);
            // Check if schedule with same name exists
            const existing = await schedule_model_1.Schedule.findOne({ name: dto.name });
            if (existing) {
                throw new errors_1.ApiError(409, `Schedule with name '${dto.name}' already exists`);
            }
            // Calculate next execution time
            const nextExecutionAt = this.calculateNextExecution(dto.schedule);
            // Create schedule document
            const schedule = new schedule_model_1.Schedule({
                name: dto.name,
                description: dto.description,
                schedule: dto.schedule,
                endpoint: dto.endpoint,
                retryPolicy: dto.retryPolicy,
                enabled: dto.enabled !== false,
                createdBy,
                metadata: dto.metadata,
                nextExecutionAt,
                executionCount: 0
            });
            // If enabled, add to BullMQ
            if (schedule.enabled) {
                const bullJobKey = await this.addScheduleToQueue(schedule);
                schedule.bullJobKey = bullJobKey;
            }
            await schedule.save();
            logger_1.default.info(`Schedule created: ${schedule.name}`);
            return this.formatScheduleResponse(schedule);
        }
        catch (error) {
            logger_1.default.error('Error creating schedule:', error);
            throw error;
        }
    }
    async updateSchedule(scheduleId, dto, updatedBy) {
        try {
            const schedule = await schedule_model_1.Schedule.findById(scheduleId);
            if (!schedule) {
                throw new errors_1.ApiError(404, 'Schedule not found');
            }
            // Validate if schedule config is being updated
            if (dto.schedule) {
                this.validateScheduleConfig({ ...schedule.schedule, ...dto.schedule });
            }
            // Validate endpoint if being updated
            if (dto.endpoint) {
                this.validateEndpointConfig({ ...schedule.endpoint, ...dto.endpoint });
            }
            // Remove from BullMQ if currently active
            if (schedule.enabled && schedule.bullJobKey) {
                await this.removeFromQueue(schedule.bullJobKey);
            }
            // Update fields
            Object.assign(schedule, {
                ...dto,
                schedule: dto.schedule ? { ...schedule.schedule, ...dto.schedule } : schedule.schedule,
                endpoint: dto.endpoint ? { ...schedule.endpoint, ...dto.endpoint } : schedule.endpoint,
                retryPolicy: dto.retryPolicy || schedule.retryPolicy
            });
            // Recalculate next execution if schedule changed
            if (dto.schedule || dto.enabled !== undefined) {
                schedule.nextExecutionAt = this.calculateNextExecution(schedule.schedule);
            }
            // Re-add to BullMQ if enabled
            if (schedule.enabled) {
                const bullJobKey = await this.addScheduleToQueue(schedule);
                schedule.bullJobKey = bullJobKey;
            }
            else {
                schedule.bullJobKey = undefined;
            }
            await schedule.save();
            logger_1.default.info(`Schedule updated: ${schedule.name}`);
            return this.formatScheduleResponse(schedule);
        }
        catch (error) {
            logger_1.default.error('Error updating schedule:', error);
            throw error;
        }
    }
    async deleteSchedule(scheduleId) {
        try {
            const schedule = await schedule_model_1.Schedule.findById(scheduleId);
            if (!schedule) {
                throw new errors_1.ApiError(404, 'Schedule not found');
            }
            // Remove from BullMQ if active
            if (schedule.bullJobKey) {
                await this.removeFromQueue(schedule.bullJobKey);
            }
            await schedule.deleteOne();
            logger_1.default.info(`Schedule deleted: ${schedule.name}`);
        }
        catch (error) {
            logger_1.default.error('Error deleting schedule:', error);
            throw error;
        }
    }
    async getSchedule(scheduleId) {
        const schedule = await schedule_model_1.Schedule.findById(scheduleId);
        if (!schedule) {
            throw new errors_1.ApiError(404, 'Schedule not found');
        }
        return this.formatScheduleResponse(schedule);
    }
    async listSchedules(query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = {};
        if (query.enabled !== undefined)
            filter.enabled = query.enabled;
        if (query.createdBy)
            filter.createdBy = query.createdBy;
        const [schedules, total] = await Promise.all([
            schedule_model_1.Schedule.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            schedule_model_1.Schedule.countDocuments(filter)
        ]);
        return {
            schedules: schedules.map(s => this.formatScheduleResponse(s)),
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }
    async executeScheduleNow(scheduleId) {
        try {
            const schedule = await schedule_model_1.Schedule.findById(scheduleId);
            if (!schedule) {
                throw new errors_1.ApiError(404, 'Schedule not found');
            }
            // Execute the HTTP call immediately
            const executionId = `manual_${scheduleId}_${Date.now()}`;
            await this.executeHttpCall(schedule, executionId);
            return { executionId };
        }
        catch (error) {
            logger_1.default.error('Error executing schedule:', error);
            throw error;
        }
    }
    // Method called by the queue worker to execute scheduled HTTP calls
    async executeScheduledJob(scheduleId) {
        try {
            const schedule = await schedule_model_1.Schedule.findById(scheduleId);
            if (!schedule || !schedule.enabled) {
                logger_1.default.warn(`Schedule ${scheduleId} not found or disabled`);
                return;
            }
            const executionId = `scheduled_${scheduleId}_${Date.now()}`;
            await this.executeHttpCall(schedule, executionId);
            // Update execution count and next execution time
            schedule.executionCount += 1;
            schedule.lastExecutedAt = new Date();
            // Check if we've reached the limit
            if (schedule.schedule.limit && schedule.executionCount >= schedule.schedule.limit) {
                schedule.enabled = false;
                schedule.bullJobKey = undefined;
                logger_1.default.info(`Schedule ${schedule.name} reached execution limit`);
            }
            // Check if we've passed the end date
            if (schedule.schedule.endDate && new Date() > new Date(schedule.schedule.endDate)) {
                schedule.enabled = false;
                schedule.bullJobKey = undefined;
                logger_1.default.info(`Schedule ${schedule.name} passed end date`);
            }
            await schedule.save();
        }
        catch (error) {
            logger_1.default.error(`Error executing scheduled job ${scheduleId}:`, error);
            throw error;
        }
    }
    async executeHttpCall(schedule, executionId) {
        const startTime = Date.now();
        let attempt = 0;
        const maxAttempts = schedule.retryPolicy?.attempts || 3;
        const backoffDelay = schedule.retryPolicy?.backoff?.delay || 5000;
        const backoffType = schedule.retryPolicy?.backoff?.type || 'exponential';
        while (attempt < maxAttempts) {
            try {
                logger_1.default.info(`Executing HTTP call for schedule ${schedule.name} (attempt ${attempt + 1}/${maxAttempts})`);
                const response = await (0, axios_1.default)({
                    method: schedule.endpoint.method,
                    url: schedule.endpoint.url,
                    headers: schedule.endpoint.headers,
                    data: schedule.endpoint.body,
                    timeout: schedule.endpoint.timeout || 30000,
                    validateStatus: (status) => status < 500 // Don't throw on 4xx errors
                });
                const duration = Date.now() - startTime;
                // Update schedule with execution results
                schedule.lastExecutionStatus = response.status < 400 ? 'success' : 'failed';
                schedule.lastExecutionError = response.status >= 400 ? `HTTP ${response.status}: ${response.statusText}` : undefined;
                await schedule.save();
                logger_1.default.info(`HTTP call completed for schedule ${schedule.name}: ${response.status} in ${duration}ms`);
                // If successful or client error (4xx), don't retry
                if (response.status < 500) {
                    return;
                }
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            catch (error) {
                attempt++;
                if (attempt >= maxAttempts) {
                    // Final attempt failed
                    schedule.lastExecutionStatus = 'failed';
                    schedule.lastExecutionError = error.message;
                    await schedule.save();
                    logger_1.default.error(`HTTP call failed for schedule ${schedule.name} after ${maxAttempts} attempts:`, error);
                    throw error;
                }
                // Calculate backoff delay
                const delay = backoffType === 'exponential'
                    ? backoffDelay * Math.pow(2, attempt - 1)
                    : backoffDelay;
                logger_1.default.warn(`HTTP call failed for schedule ${schedule.name}, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    async addScheduleToQueue(schedule) {
        const jobName = `schedule_${schedule._id}`;
        const jobData = { scheduleId: schedule._id.toString() };
        if (schedule.schedule.cron) {
            // Recurring job with cron pattern
            const job = await this.schedulerQueue.add(jobName, jobData, {
                repeat: {
                    pattern: schedule.schedule.cron,
                    tz: schedule.schedule.timezone,
                    endDate: schedule.schedule.endDate,
                    limit: schedule.schedule.limit
                },
                jobId: `repeat_${schedule._id}`
            });
            return job.id;
        }
        else if (schedule.schedule.at) {
            // One-time scheduled job
            const delay = new Date(schedule.schedule.at).getTime() - Date.now();
            if (delay > 0) {
                const job = await this.schedulerQueue.add(jobName, jobData, {
                    delay,
                    jobId: `once_${schedule._id}_${Date.now()}`
                });
                return job.id;
            }
            throw new errors_1.ApiError(400, 'Scheduled time must be in the future');
        }
        throw new errors_1.ApiError(400, 'No valid schedule configuration');
    }
    async removeFromQueue(jobKey) {
        try {
            await this.schedulerQueue.removeRepeatableByKey(jobKey);
        }
        catch (error) {
            logger_1.default.error(`Error removing job from queue: ${error}`);
        }
    }
    validateScheduleConfig(schedule) {
        if (!schedule.cron && !schedule.at) {
            throw new errors_1.ApiError(400, 'Either cron pattern or at time must be specified');
        }
        if (schedule.cron && schedule.at) {
            throw new errors_1.ApiError(400, 'Cannot specify both cron pattern and at time');
        }
        if (schedule.cron) {
            try {
                cronParser.parseExpression(schedule.cron);
            }
            catch (error) {
                throw new errors_1.ApiError(400, `Invalid cron pattern: ${schedule.cron}`);
            }
        }
        if (schedule.at) {
            const atTime = new Date(schedule.at);
            if (isNaN(atTime.getTime())) {
                throw new errors_1.ApiError(400, 'Invalid date format for at time');
            }
            if (atTime.getTime() <= Date.now()) {
                throw new errors_1.ApiError(400, 'Scheduled time must be in the future');
            }
        }
        if (schedule.timezone) {
            if (!luxon_1.DateTime.local().setZone(schedule.timezone).isValid) {
                throw new errors_1.ApiError(400, `Invalid timezone: ${schedule.timezone}`);
            }
        }
    }
    validateEndpointConfig(endpoint) {
        if (!endpoint.url) {
            throw new errors_1.ApiError(400, 'Endpoint URL is required');
        }
        try {
            new URL(endpoint.url);
        }
        catch (error) {
            throw new errors_1.ApiError(400, 'Invalid endpoint URL');
        }
        if (!endpoint.method) {
            throw new errors_1.ApiError(400, 'HTTP method is required');
        }
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        if (!validMethods.includes(endpoint.method)) {
            throw new errors_1.ApiError(400, `Invalid HTTP method: ${endpoint.method}`);
        }
    }
    calculateNextExecution(schedule) {
        if (schedule.cron) {
            try {
                const options = {
                    currentDate: new Date(),
                    tz: schedule.timezone || 'UTC'
                };
                if (schedule.endDate) {
                    options.endDate = new Date(schedule.endDate);
                }
                const interval = cronParser.parseExpression(schedule.cron, options);
                return interval.next().toDate();
            }
            catch (error) {
                logger_1.default.error('Error calculating next execution:', error);
                return undefined;
            }
        }
        else if (schedule.at) {
            return new Date(schedule.at);
        }
        return undefined;
    }
    formatScheduleResponse(schedule) {
        return {
            id: schedule._id.toString(),
            name: schedule.name,
            description: schedule.description,
            schedule: {
                cron: schedule.schedule.cron,
                at: schedule.schedule.at?.toISOString(),
                timezone: schedule.schedule.timezone,
                endDate: schedule.schedule.endDate?.toISOString(),
                limit: schedule.schedule.limit
            },
            endpoint: {
                url: schedule.endpoint.url,
                method: schedule.endpoint.method,
                headers: schedule.endpoint.headers,
                body: schedule.endpoint.body,
                timeout: schedule.endpoint.timeout
            },
            retryPolicy: schedule.retryPolicy,
            enabled: schedule.enabled,
            createdBy: schedule.createdBy,
            metadata: schedule.metadata,
            lastExecutedAt: schedule.lastExecutedAt?.toISOString(),
            lastExecutionStatus: schedule.lastExecutionStatus,
            lastExecutionError: schedule.lastExecutionError,
            nextExecutionAt: schedule.nextExecutionAt?.toISOString(),
            executionCount: schedule.executionCount,
            createdAt: schedule.createdAt.toISOString(),
            updatedAt: schedule.updatedAt.toISOString()
        };
    }
}
exports.ScheduleService = ScheduleService;
//# sourceMappingURL=schedule.service.js.map