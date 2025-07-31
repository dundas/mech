"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedJobTracker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
class EnhancedJobTracker {
    static instance;
    queues = new Map();
    queueEvents = new Map();
    redis;
    jobWebhooks = new Map();
    jobMetadata = new Map();
    constructor(redisConfig) {
        this.redis = new ioredis_1.Redis(redisConfig);
    }
    static getInstance(config) {
        if (!EnhancedJobTracker.instance) {
            if (!config)
                throw new Error('Config required for initialization');
            EnhancedJobTracker.instance = new EnhancedJobTracker(config);
        }
        return EnhancedJobTracker.instance;
    }
    // Submit a job with optional metadata and webhooks
    async submitJob({ queue, data, metadata = {}, webhooks = {}, }) {
        const queueInstance = this.getOrCreateQueue(queue);
        const jobId = (0, uuid_1.v4)();
        // Store job data with metadata
        await queueInstance.add(jobId, {
            ...data,
            _jobId: jobId,
            _submittedAt: new Date().toISOString(),
            _metadata: metadata,
        }, {
            jobId,
        });
        // Store metadata separately for efficient filtering
        this.jobMetadata.set(jobId, metadata);
        // Store webhooks if provided
        if (Object.keys(webhooks).length > 0) {
            // Filter out undefined values
            const cleanWebhooks = {};
            for (const [key, value] of Object.entries(webhooks)) {
                if (value !== undefined) {
                    cleanWebhooks[key] = value;
                }
            }
            this.jobWebhooks.set(jobId, cleanWebhooks);
        }
        logger_1.default.info(`Job ${jobId} submitted to queue ${queue}`, { metadata });
        return jobId;
    }
    // Update job and trigger webhooks
    async updateJob(update) {
        const { jobId, status, progress, result, error, metadata } = update;
        // Find the job
        let job = null;
        let queueName = null;
        for (const [name, queue] of this.queues) {
            const foundJob = await queue.getJob(jobId);
            if (foundJob) {
                job = foundJob;
                queueName = name;
                break;
            }
        }
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        // Update job metadata if provided
        if (metadata) {
            const existingMetadata = this.jobMetadata.get(jobId) || {};
            this.jobMetadata.set(jobId, { ...existingMetadata, ...metadata });
        }
        // Update job in BullMQ
        if (status === 'progress' && progress !== undefined) {
            await job.updateProgress(progress);
        }
        else if (status === 'completed' && result !== undefined) {
            await job.moveToCompleted(result, job.token);
        }
        else if (status === 'failed' && error !== undefined) {
            await job.moveToFailed(new Error(error), job.token);
        }
        logger_1.default.info(`Job ${jobId} updated: ${status}`, { progress, result, error });
        // Trigger webhooks
        await this.triggerWebhook(jobId, status, { progress, result, error });
    }
    // Get job status with all details
    async getJobStatus(jobId) {
        let bullJob = null;
        let queueName = null;
        for (const [name, queue] of this.queues) {
            const job = await queue.getJob(jobId);
            if (job) {
                bullJob = job;
                queueName = name;
                break;
            }
        }
        if (!bullJob)
            return null;
        const state = await bullJob.getState();
        const metadata = this.jobMetadata.get(jobId) || {};
        const webhooks = this.jobWebhooks.get(jobId) || {};
        return {
            id: jobId,
            queue: queueName,
            status: state,
            data: bullJob.data,
            metadata,
            result: bullJob.returnvalue,
            error: bullJob.failedReason,
            progress: bullJob.progress,
            webhooks: Object.keys(webhooks).length > 0 ? webhooks : undefined,
            timestamps: {
                submitted: bullJob.data._submittedAt,
                started: bullJob.processedOn ? new Date(bullJob.processedOn).toISOString() : undefined,
                completed: bullJob.finishedOn && state === 'completed' ? new Date(bullJob.finishedOn).toISOString() : undefined,
                failed: bullJob.finishedOn && state === 'failed' ? new Date(bullJob.finishedOn).toISOString() : undefined,
            },
        };
    }
    // List jobs with advanced filtering
    async listJobs(applicationId, filters = {}) {
        const { queue, status, metadata, limit = 100, offset = 0 } = filters;
        const results = [];
        // Determine which queues to search
        const queuesToSearch = queue
            ? [this.queues.get(queue)].filter(Boolean)
            : Array.from(this.queues.values());
        for (const queueInstance of queuesToSearch) {
            if (!queueInstance)
                continue;
            let jobs = [];
            // Get jobs based on status filter
            if (!status || status === 'all') {
                const [waiting, active, completed, failed] = await Promise.all([
                    queueInstance.getWaiting(0, limit * 2),
                    queueInstance.getActive(0, limit * 2),
                    queueInstance.getCompleted(0, limit * 2),
                    queueInstance.getFailed(0, limit * 2),
                ]);
                jobs = [...waiting, ...active, ...completed, ...failed];
            }
            else {
                switch (status) {
                    case 'waiting':
                        jobs = await queueInstance.getWaiting(0, limit * 2);
                        break;
                    case 'active':
                        jobs = await queueInstance.getActive(0, limit * 2);
                        break;
                    case 'completed':
                        jobs = await queueInstance.getCompleted(0, limit * 2);
                        break;
                    case 'failed':
                        jobs = await queueInstance.getFailed(0, limit * 2);
                        break;
                }
            }
            // Filter jobs
            for (const job of jobs) {
                // Check application access
                if (job.data._applicationId !== applicationId && applicationId !== 'master') {
                    continue;
                }
                // Filter by metadata if specified
                if (metadata && Object.keys(metadata).length > 0) {
                    const jobMetadata = this.jobMetadata.get(job.id) || job.data._metadata || {};
                    let matches = true;
                    for (const [key, value] of Object.entries(metadata)) {
                        if (jobMetadata[key] !== value) {
                            matches = false;
                            break;
                        }
                    }
                    if (!matches)
                        continue;
                }
                const jobState = await job.getState();
                results.push({
                    id: job.id,
                    queue: queueInstance.name,
                    status: jobState,
                    submittedAt: job.data._submittedAt,
                    data: job.data,
                    metadata: this.jobMetadata.get(job.id) || job.data._metadata || {},
                    progress: job.progress,
                    result: job.returnvalue,
                    error: job.failedReason,
                });
            }
        }
        // Apply pagination
        return results.slice(offset, offset + limit);
    }
    // Update or set webhooks for a job
    async setJobWebhooks(jobId, webhooks) {
        const existing = this.jobWebhooks.get(jobId) || {};
        this.jobWebhooks.set(jobId, { ...existing, ...webhooks });
        logger_1.default.info(`Updated webhooks for job ${jobId}`, webhooks);
    }
    // Trigger webhook for status change
    async triggerWebhook(jobId, status, data) {
        const webhooks = this.jobWebhooks.get(jobId);
        if (!webhooks)
            return;
        // Check for status-specific webhook
        const webhookUrl = webhooks[`on${status.charAt(0).toUpperCase() + status.slice(1)}`] ||
            webhooks[status] ||
            webhooks['*']; // Wildcard webhook for all statuses
        if (!webhookUrl)
            return;
        try {
            await axios_1.default.post(webhookUrl, {
                jobId,
                status,
                timestamp: new Date().toISOString(),
                ...data,
            }, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Job-Id': jobId,
                    'X-Job-Status': status,
                },
            });
            logger_1.default.info(`Webhook triggered for job ${jobId} status ${status}`, { url: webhookUrl });
        }
        catch (error) {
            logger_1.default.error(`Failed to trigger webhook for job ${jobId}`, error);
        }
    }
    // Search jobs by metadata
    async searchJobsByMetadata(applicationId, metadataQuery, options = {}) {
        return this.listJobs(applicationId, {
            metadata: metadataQuery,
            queue: options.queue,
            limit: options.limit || 100,
        });
    }
    // Get queue statistics with metadata breakdown
    async getQueueStats(queueName, groupByMetadata) {
        const queue = this.queues.get(queueName);
        if (!queue)
            return null;
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
        ]);
        const stats = {
            queue: queueName,
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed,
        };
        // Group by metadata if requested
        if (groupByMetadata) {
            stats.byMetadata = {};
            // Get sample of jobs to analyze metadata
            const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed'], 0, 1000);
            for (const job of jobs) {
                const metadata = this.jobMetadata.get(job.id) || job.data._metadata || {};
                const groupValue = metadata[groupByMetadata] || 'undefined';
                if (!stats.byMetadata[groupValue]) {
                    stats.byMetadata[groupValue] = { count: 0, statuses: {} };
                }
                stats.byMetadata[groupValue].count++;
                const jobState = await job.getState();
                stats.byMetadata[groupValue].statuses[jobState] =
                    (stats.byMetadata[groupValue].statuses[jobState] || 0) + 1;
            }
        }
        return stats;
    }
    getOrCreateQueue(queueName) {
        let queue = this.queues.get(queueName);
        if (!queue) {
            queue = new bullmq_1.Queue(queueName, {
                connection: this.redis,
                defaultJobOptions: {
                    removeOnComplete: {
                        age: 3600,
                        count: 100,
                    },
                    removeOnFail: {
                        age: 86400,
                        count: 500,
                    },
                },
            });
            const queueEvents = new bullmq_1.QueueEvents(queueName, {
                connection: this.redis,
            });
            // Set up event listeners
            queueEvents.on('active', async ({ jobId }) => {
                await this.triggerWebhook(jobId, 'started', {});
            });
            queueEvents.on('progress', async ({ jobId, data }) => {
                await this.triggerWebhook(jobId, 'progress', { progress: data });
            });
            queueEvents.on('completed', async ({ jobId, returnvalue }) => {
                await this.triggerWebhook(jobId, 'completed', { result: returnvalue });
            });
            queueEvents.on('failed', async ({ jobId, failedReason }) => {
                await this.triggerWebhook(jobId, 'failed', { error: failedReason });
            });
            this.queues.set(queueName, queue);
            this.queueEvents.set(queueName, queueEvents);
            logger_1.default.info(`Created queue: ${queueName}`);
        }
        return queue;
    }
    async shutdown() {
        for (const [name, queue] of this.queues) {
            await queue.close();
        }
        for (const [name, events] of this.queueEvents) {
            await events.close();
        }
        await this.redis.quit();
    }
}
exports.EnhancedJobTracker = EnhancedJobTracker;
//# sourceMappingURL=enhanced-job-tracker.js.map