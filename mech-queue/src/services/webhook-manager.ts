import { QueueEvents } from 'bullmq';
import Webhook, { IWebhook } from '../models/webhook';
import { WebhookDeliveryService, WebhookPayload } from './webhook-delivery';
import { QueueManager } from './queue-manager';
import logger from '../utils/logger';
import { getApplicationById } from './application';

export class WebhookManager {
  private static instance: WebhookManager;
  private queueEvents: Map<string, QueueEvents> = new Map();
  private initialized = false;

  static getInstance(): WebhookManager {
    if (!WebhookManager.instance) {
      WebhookManager.instance = new WebhookManager();
    }
    return WebhookManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const queueManager = QueueManager.getInstance();
    const queueNames = queueManager.getRegisteredQueues();

    // Set up event listeners for each queue
    for (const queueName of queueNames) {
      await this.setupQueueEventListeners(queueName);
    }

    this.initialized = true;
    logger.info('Webhook manager initialized for queues:', queueNames);
  }

  private async setupQueueEventListeners(queueName: string): Promise<void> {
    const queueEvents = new QueueEvents(queueName, {
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
    logger.info(`Set up webhook listeners for queue: ${queueName}`);
  }

  private async triggerWebhooks(
    event: string,
    queueName: string,
    jobId: string,
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get job details
      const queueManager = QueueManager.getInstance();
      const job = await queueManager.getJob(queueName, jobId);
      
      if (!job) {
        logger.warn(`Job ${jobId} not found for webhook trigger`);
        return;
      }

      const applicationId = job.data._metadata?.applicationId;
      if (!applicationId) {
        logger.warn(`No application ID found for job ${jobId}`);
        return;
      }

      // Get application info
      const application = await getApplicationById(applicationId);
      if (!application) {
        logger.warn(`Application ${applicationId} not found for webhook`);
        return;
      }

      // Find matching webhooks
      const webhooks = await this.findMatchingWebhooks(
        applicationId,
        event,
        queueName
      );

      if (webhooks.length === 0) {
        logger.debug(`No webhooks found for event ${event} in queue ${queueName}`);
        return;
      }

      // Create webhook payload
      const payload: WebhookPayload = {
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
      const deliveryPromises = webhooks.map(webhook =>
        WebhookDeliveryService.deliverWebhook(webhook, payload)
      );

      await Promise.allSettled(deliveryPromises);

      logger.info(`Triggered ${webhooks.length} webhooks for event ${event}:`, {
        jobId,
        queue: queueName,
        application: applicationId,
      });

    } catch (error) {
      logger.error('Error triggering webhooks:', {
        event,
        queueName,
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async findMatchingWebhooks(
    applicationId: string,
    event: string,
    queueName: string
  ): Promise<IWebhook[]> {
    return await Webhook.find({
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

  async registerWebhook(webhookData: Partial<IWebhook>): Promise<IWebhook> {
    const webhook = new Webhook(webhookData);
    await webhook.save();
    
    logger.info(`Webhook registered:`, {
      id: webhook._id,
      url: webhook.url,
      events: webhook.events,
      application: webhook.applicationId,
    });

    return webhook;
  }

  async updateWebhook(
    webhookId: string,
    applicationId: string,
    updates: Partial<IWebhook>
  ): Promise<IWebhook | null> {
    const webhook = await Webhook.findOneAndUpdate(
      { _id: webhookId, applicationId },
      updates,
      { new: true }
    );

    if (webhook) {
      logger.info(`Webhook updated:`, {
        id: webhook._id,
        application: webhook.applicationId,
      });
    }

    return webhook;
  }

  async deleteWebhook(webhookId: string, applicationId: string): Promise<boolean> {
    const result = await Webhook.deleteOne({ _id: webhookId, applicationId });
    
    if (result.deletedCount > 0) {
      logger.info(`Webhook deleted:`, { id: webhookId, application: applicationId });
    }

    return result.deletedCount > 0;
  }

  async getWebhooks(applicationId: string): Promise<IWebhook[]> {
    return await Webhook.find({ applicationId }).sort({ createdAt: -1 });
  }

  async getWebhook(
    webhookId: string,
    applicationId: string
  ): Promise<IWebhook | null> {
    return await Webhook.findOne({ _id: webhookId, applicationId });
  }

  async testWebhook(webhookId: string, applicationId: string): Promise<{
    success: boolean;
    status?: number;
    error?: string;
    responseTime?: number;
  }> {
    const webhook = await this.getWebhook(webhookId, applicationId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return await WebhookDeliveryService.testWebhook(webhook);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down webhook manager...');

    // Close all queue event listeners
    for (const [queueName, queueEvents] of this.queueEvents) {
      await queueEvents.close();
      logger.info(`Closed webhook listeners for queue: ${queueName}`);
    }

    this.queueEvents.clear();
    this.initialized = false;
    logger.info('Webhook manager shutdown complete');
  }
}