"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericQueueManager = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../utils/logger"));
class GenericQueueManager {
    static instance;
    queues = new Map();
    redis;
    constructor(config) {
        this.redis = new ioredis_1.Redis(config.redis);
    }
    static getInstance(config) {
        if (!GenericQueueManager.instance) {
            if (!config)
                throw new Error('Config required for first initialization');
            GenericQueueManager.instance = new GenericQueueManager(config);
        }
        return GenericQueueManager.instance;
    }
    // Submit a job to any queue (creates queue if doesn't exist)
    async submitJob({ queueName, data, options }) {
        const queue = this.getOrCreateQueue(queueName);
        const jobId = (0, uuid_1.v4)();
        const job = await queue.add(jobId, data, {
            jobId,
            ...options,
        });
        logger_1.default.info(`Job ${jobId} submitted to queue ${queueName}`);
        return job.id;
    }
    // Get job status
    async getJobStatus(queueName, jobId) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return null;
        const job = await queue.getJob(jobId);
        if (!job)
            return null;
        const state = await job.getState();
        return {
            id: job.id,
            status: state,
            data: job.data,
            result: job.returnvalue,
            error: job.failedReason,
            progress: job.progress,
            timestamps: {
                created: job.timestamp,
                processed: job.processedOn,
                completed: job.finishedOn && state === 'completed' ? job.finishedOn : undefined,
                failed: job.finishedOn && state === 'failed' ? job.finishedOn : undefined,
            },
        };
    }
    // Get all jobs in a queue with optional status filter
    async getJobs(queueName, status, limit = 100) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return [];
        let jobs = [];
        switch (status) {
            case 'waiting':
                jobs = await queue.getWaiting(0, limit);
                break;
            case 'active':
                jobs = await queue.getActive(0, limit);
                break;
            case 'completed':
                jobs = await queue.getCompleted(0, limit);
                break;
            case 'failed':
                jobs = await queue.getFailed(0, limit);
                break;
            default:
                // Get all jobs
                const [waiting, active, completed, failed] = await Promise.all([
                    queue.getWaiting(0, limit / 4),
                    queue.getActive(0, limit / 4),
                    queue.getCompleted(0, limit / 4),
                    queue.getFailed(0, limit / 4),
                ]);
                jobs = [...waiting, ...active, ...completed, ...failed];
        }
        return Promise.all(jobs.map(async (job) => ({
            id: job.id,
            status: await job.getState(),
            data: job.data,
            result: job.returnvalue,
            error: job.failedReason,
            progress: job.progress,
            attempts: job.attemptsMade,
            timestamp: job.timestamp,
        })));
    }
    // Cancel/remove a job
    async cancelJob(queueName, jobId) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return false;
        const job = await queue.getJob(jobId);
        if (!job)
            return false;
        await job.remove();
        logger_1.default.info(`Job ${jobId} removed from queue ${queueName}`);
        return true;
    }
    // Queue statistics
    async getQueueStats(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return null;
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
            queue.isPaused(),
        ]);
        return {
            name: queueName,
            waiting,
            active,
            completed,
            failed,
            delayed,
            paused,
        };
    }
    // List all queues
    async listQueues() {
        return Array.from(this.queues.keys());
    }
    // Pause/resume queue
    async pauseQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue)
            await queue.pause();
    }
    async resumeQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue)
            await queue.resume();
    }
    // Clean completed/failed jobs
    async cleanQueue(queueName, grace = 0, limit = 1000, status = 'completed') {
        const queue = this.queues.get(queueName);
        if (!queue)
            return [];
        return await queue.clean(grace, limit, status);
    }
    getOrCreateQueue(queueName) {
        let queue = this.queues.get(queueName);
        if (!queue) {
            queue = new bullmq_1.Queue(queueName, {
                connection: this.redis,
                defaultJobOptions: {
                    removeOnComplete: {
                        age: 3600, // Keep completed jobs for 1 hour
                        count: 1000, // Keep max 1000 completed jobs
                    },
                    removeOnFail: {
                        age: 86400, // Keep failed jobs for 24 hours
                        count: 5000, // Keep max 5000 failed jobs
                    },
                },
            });
            this.queues.set(queueName, queue);
            logger_1.default.info(`Created queue: ${queueName}`);
        }
        return queue;
    }
    async shutdown() {
        logger_1.default.info('Shutting down queue manager...');
        for (const [name, queue] of this.queues) {
            await queue.close();
            logger_1.default.info(`Closed queue: ${name}`);
        }
        await this.redis.quit();
        this.queues.clear();
    }
}
exports.GenericQueueManager = GenericQueueManager;
//# sourceMappingURL=generic-queue-manager.js.map