"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookManager = void 0;
const bullmq_1 = require("bullmq");
const webhook_1 = __importDefault(require("../models/webhook"));
const webhook_delivery_1 = require("./webhook-delivery");
const queue_manager_1 = require("./queue-manager");
const logger_1 = __importDefault(require("../utils/logger"));
const application_1 = require("./application");
class WebhookManager {
    static instance;
    queueEvents = new Map();
    initialized = false;
    static getInstance() {
        if (!WebhookManager.instance) {
            WebhookManager.instance = new WebhookManager();
        }
        return WebhookManager.instance;
    }
    async initialize() {
        if (this.initialized)
            return;
        const queueManager = queue_manager_1.QueueManager.getInstance();
        const queueNames = queueManager.getRegisteredQueues();
        // Set up event listeners for each queue
        for (const queueName of queueNames) {
            await this.setupQueueEventListeners(queueName);
        }
        this.initialized = true;
        logger_1.default.info('Webhook manager initialized for queues:', queueNames);
    }
    async setupQueueEventListeners(queueName) {
        const queueEvents = new bullmq_1.QueueEvents(queueName, {
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0'),
            },
        });
        // Job created/added
        queueEvents.on('added', async ({ jobId }) => {
            await this.triggerWebhooks('job.created', queueName, jobId);
        });
        // Job started processing
        queueEvents.on('active', async ({ jobId }) => {
            await this.triggerWebhooks('job.started', queueName, jobId);
        });
        // Job completed successfully
        queueEvents.on('completed', async ({ jobId, returnvalue }) => {
            await this.triggerWebhooks('job.completed', queueName, jobId, {
                result: returnvalue,
            });
        });
        // Job failed
        queueEvents.on('failed', async ({ jobId, failedReason }) => {
            await this.triggerWebhooks('job.failed', queueName, jobId, {
                error: failedReason,
            });
        });
        // Job progress update
        queueEvents.on('progress', async ({ jobId, data }) => {
            await this.triggerWebhooks('job.progress', queueName, jobId, {
                progress: data,
            });
        });
        // Job stalled
        queueEvents.on('stalled', async ({ jobId }) => {
            await this.triggerWebhooks('job.stalled', queueName, jobId);
        });
        this.queueEvents.set(queueName, queueEvents);
        logger_1.default.info(`Set up webhook listeners for queue: ${queueName}`);
    }
    async triggerWebhooks(event, queueName, jobId, additionalData = {}) {
        try {
            // Get job details
            const queueManager = queue_manager_1.QueueManager.getInstance();
            const job = await queueManager.getJob(queueName, jobId);
            if (!job) {
                logger_1.default.warn(`Job ${jobId} not found for webhook trigger`);
                return;
            }
            const applicationId = job.data._metadata?.applicationId;
            if (!applicationId) {
                logger_1.default.warn(`No application ID found for job ${jobId}`);
                return;
            }
            // Get application info
            const application = await (0, application_1.getApplicationById)(applicationId);
            if (!application) {
                logger_1.default.warn(`Application ${applicationId} not found for webhook`);
                return;
            }
            // Find matching webhooks
            const webhooks = await this.findMatchingWebhooks(applicationId, event, queueName);
            if (webhooks.length === 0) {
                logger_1.default.debug(`No webhooks found for event ${event} in queue ${queueName}`);
                return;
            }
            // Create webhook payload
            const payload = {
                event,
                timestamp: new Date().toISOString(),
                data: {
                    jobId,
                    queue: queueName,
                    status: await job.getState(),
                    application: {
                        id: application.id,
                        name: application.name,
                    },
                    createdAt: new Date(job.timestamp).toISOString(),
                    ...additionalData,
                },
            };
            // Deliver to all matching webhooks
            const deliveryPromises = webhooks.map(webhook => webhook_delivery_1.WebhookDeliveryService.deliverWebhook(webhook, payload));
            await Promise.allSettled(deliveryPromises);
            logger_1.default.info(`Triggered ${webhooks.length} webhooks for event ${event}:`, {
                jobId,
                queue: queueName,
                application: applicationId,
            });
        }
        catch (error) {
            logger_1.default.error('Error triggering webhooks:', {
                event,
                queueName,
                jobId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async findMatchingWebhooks(applicationId, event, queueName) {
        return await webhook_1.default.find({
            applicationId,
            active: true,
            events: event,
            $or: [
                { queues: '*' },
                { queues: queueName },
                { queues: { $in: ['*'] } },
                { queues: { $in: [queueName] } },
            ],
        });
    }
    async registerWebhook(webhookData) {
        const webhook = new webhook_1.default(webhookData);
        await webhook.save();
        logger_1.default.info(`Webhook registered:`, {
            id: webhook._id,
            url: webhook.url,
            events: webhook.events,
            application: webhook.applicationId,
        });
        return webhook;
    }
    async updateWebhook(webhookId, applicationId, updates) {
        const webhook = await webhook_1.default.findOneAndUpdate({ _id: webhookId, applicationId }, updates, { new: true });
        if (webhook) {
            logger_1.default.info(`Webhook updated:`, {
                id: webhook._id,
                application: webhook.applicationId,
            });
        }
        return webhook;
    }
    async deleteWebhook(webhookId, applicationId) {
        const result = await webhook_1.default.deleteOne({ _id: webhookId, applicationId });
        if (result.deletedCount > 0) {
            logger_1.default.info(`Webhook deleted:`, { id: webhookId, application: applicationId });
        }
        return result.deletedCount > 0;
    }
    async getWebhooks(applicationId) {
        return await webhook_1.default.find({ applicationId }).sort({ createdAt: -1 });
    }
    async getWebhook(webhookId, applicationId) {
        return await webhook_1.default.findOne({ _id: webhookId, applicationId });
    }
    async testWebhook(webhookId, applicationId) {
        const webhook = await this.getWebhook(webhookId, applicationId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        return await webhook_delivery_1.WebhookDeliveryService.testWebhook(webhook);
    }
    async shutdown() {
        logger_1.default.info('Shutting down webhook manager...');
        // Close all queue event listeners
        for (const [queueName, queueEvents] of this.queueEvents) {
            await queueEvents.close();
            logger_1.default.info(`Closed webhook listeners for queue: ${queueName}`);
        }
        this.queueEvents.clear();
        this.initialized = false;
        logger_1.default.info('Webhook manager shutdown complete');
    }
}
exports.WebhookManager = WebhookManager;
//# sourceMappingURL=webhook-manager.js.map