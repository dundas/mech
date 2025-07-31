"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
class QueueManager {
    static instance;
    redis;
    queues = new Map();
    workers = new Map();
    queueEvents = new Map();
    queueDefinitions = new Map();
    constructor() {
        // DigitalOcean Valkey uses TLS on port 25061
        const useTLS = config_1.config.redis.port === 25061;
        this.redis = new ioredis_1.default({
            host: config_1.config.redis.host,
            port: config_1.config.redis.port,
            password: config_1.config.redis.password,
            db: config_1.config.redis.db,
            maxRetriesPerRequest: null,
            ...(useTLS && {
                tls: {
                    rejectUnauthorized: false
                }
            })
        });
        this.redis.on('error', (error) => {
            logger_1.default.error('Redis connection error:', error);
        });
        this.redis.on('connect', () => {
            logger_1.default.info('Connected to Redis');
        });
    }
    static getInstance() {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
    registerQueue(definition) {
        if (this.queues.has(definition.name)) {
            return this.queues.get(definition.name);
        }
        const queue = new bullmq_1.Queue(definition.name, {
            connection: this.redis,
            defaultJobOptions: definition.defaultJobOptions || {
                attempts: config_1.config.workers.defaultJobAttempts,
                backoff: {
                    type: 'exponential',
                    delay: config_1.config.workers.defaultJobBackoffDelay,
                },
                removeOnComplete: {
                    age: config_1.config.queues.removeCompletedJobsAfter,
                },
                removeOnFail: {
                    age: config_1.config.queues.removeFailedJobsAfter,
                },
            },
        });
        const queueEvents = new bullmq_1.QueueEvents(definition.name, {
            connection: this.redis,
        });
        this.queues.set(definition.name, queue);
        this.queueEvents.set(definition.name, queueEvents);
        this.queueDefinitions.set(definition.name, definition);
        logger_1.default.info(`Registered queue: ${definition.name}`);
        return queue;
    }
    registerWorker(definition) {
        const workers = this.workers.get(definition.queueName) || [];
        const worker = new bullmq_1.Worker(definition.queueName, definition.processor, {
            connection: this.redis,
            concurrency: definition.concurrency,
        });
        worker.on('completed', (job) => {
            logger_1.default.info(`Job ${job.id} completed in queue ${definition.queueName}`);
        });
        worker.on('failed', (job, error) => {
            logger_1.default.error(`Job ${job?.id} failed in queue ${definition.queueName}:`, error);
        });
        workers.push(worker);
        this.workers.set(definition.queueName, workers);
        logger_1.default.info(`Registered worker for queue: ${definition.queueName}`);
        return worker;
    }
    getQueue(name) {
        return this.queues.get(name);
    }
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
    async getAllQueueStats() {
        const stats = await Promise.all(Array.from(this.queues.keys()).map((name) => this.getQueueStats(name)));
        return stats.filter((stat) => stat !== null);
    }
    async addJob(queueName, jobName, data, options) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            logger_1.default.error(`Queue not found: ${queueName}`);
            return null;
        }
        const job = await queue.add(jobName, data, options);
        logger_1.default.info(`Added job ${job.id} to queue ${queueName}`);
        return job.id ?? null;
    }
    async getJob(queueName, jobId) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return null;
        return queue.getJob(jobId);
    }
    async pauseQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return false;
        await queue.pause();
        logger_1.default.info(`Paused queue: ${queueName}`);
        return true;
    }
    async resumeQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return false;
        await queue.resume();
        logger_1.default.info(`Resumed queue: ${queueName}`);
        return true;
    }
    async cleanQueue(queueName, grace = 0) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return false;
        await queue.clean(grace, 1000);
        logger_1.default.info(`Cleaned queue: ${queueName}`);
        return true;
    }
    async shutdown() {
        logger_1.default.info('Shutting down queue manager...');
        // Close all workers
        for (const workers of this.workers.values()) {
            await Promise.all(workers.map((worker) => worker.close()));
        }
        // Close all queue events
        for (const queueEvents of this.queueEvents.values()) {
            await queueEvents.close();
        }
        // Close all queues
        for (const queue of this.queues.values()) {
            await queue.close();
        }
        // Close Redis connection
        this.redis.disconnect();
        logger_1.default.info('Queue manager shutdown complete');
    }
    getRegisteredQueues() {
        return Array.from(this.queues.keys());
    }
    getQueueDefinition(queueName) {
        return this.queueDefinitions.get(queueName);
    }
}
exports.QueueManager = QueueManager;
//# sourceMappingURL=queue-manager.js.map