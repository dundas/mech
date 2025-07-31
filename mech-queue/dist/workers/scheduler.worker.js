"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSchedulerWorker = createSchedulerWorker;
const bullmq_1 = require("bullmq");
const schedule_service_1 = require("../services/schedule.service");
const logger_1 = __importDefault(require("../utils/logger"));
function createSchedulerWorker(queueManager) {
    const scheduleService = new schedule_service_1.ScheduleService(queueManager);
    const worker = new bullmq_1.Worker('scheduler', async (job) => {
        const { scheduleId } = job.data;
        logger_1.default.info(`Processing scheduled job: ${scheduleId}`);
        try {
            await scheduleService.executeScheduledJob(scheduleId);
            logger_1.default.info(`Successfully executed scheduled job: ${scheduleId}`);
            return { success: true, scheduleId };
        }
        catch (error) {
            logger_1.default.error(`Failed to execute scheduled job ${scheduleId}:`, error);
            throw error;
        }
    }, {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
        },
        concurrency: 5,
        removeOnComplete: {
            count: 100,
            age: 3600, // 1 hour
        },
        removeOnFail: {
            count: 1000,
            age: 86400, // 24 hours
        },
    });
    worker.on('completed', (job) => {
        logger_1.default.info(`Scheduler job ${job.id} completed`);
    });
    worker.on('failed', (job, err) => {
        logger_1.default.error(`Scheduler job ${job?.id} failed:`, err);
    });
    worker.on('error', (err) => {
        logger_1.default.error('Scheduler worker error:', err);
    });
    return worker;
}
//# sourceMappingURL=scheduler.worker.js.map