import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { IWebhook } from '../models/webhook';
import logger from '../utils/logger';
import { jobsDelivered, webhookAttempts } from '../monitoring/metrics';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    jobId?: string;
    queue?: string;
    status?: string;
    result?: any;
    error?: string;
    progress?: number;
    application: {
      id: string;
      name: string;
    };
    [key: string]: any;
  };
}

export class WebhookDeliveryService {
  static async deliverWebhook(
    webhook: IWebhook,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<boolean> {
    try {
      const signature = this.generateSignature(payload, webhook.secret!);
      
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'QueueService-Webhooks/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        'X-Webhook-Attempt': attempt.toString(),
        ...webhook.headers,
      };

      logger.info(`Delivering webhook ${webhook._id} (attempt ${attempt}):`, {
        url: webhook.url,
        event: payload.event,
        jobId: payload.data.jobId,
      });

      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Mark as successful
      webhook.lastTriggeredAt = new Date();
      webhook.failureCount = 0;
      await webhook.save();

      jobsDelivered.inc({
        application: payload.data.application.id,
        event: payload.event,
        status: 'success',
      });

      logger.info(`Webhook delivered successfully:`, {
        webhookId: webhook._id,
        status: response.status,
        event: payload.event,
      });

      return true;

    } catch (error) {
      const isAxiosError = error instanceof AxiosError;
      const statusCode = isAxiosError ? error.response?.status : 0;
      const responseData = isAxiosError ? error.response?.data : null;

      logger.error(`Webhook delivery failed (attempt ${attempt}):`, {
        webhookId: webhook._id,
        url: webhook.url,
        error: error instanceof Error ? error.message : String(error),
        statusCode,
        responseData,
      });

      webhookAttempts.inc({
        application: payload.data.application.id,
        event: payload.event,
        status: 'failed',
        attempt: attempt.toString(),
      });

      // Update failure count
      webhook.failureCount += 1;
      await webhook.save();

      // Don't retry on client errors (4xx)
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        logger.warn(`Webhook delivery aborted due to client error (${statusCode}):`, {
          webhookId: webhook._id,
          url: webhook.url,
        });
        return false;
      }

      // Retry if within limits
      if (attempt < webhook.retryConfig!.maxAttempts) {
        const delay = this.calculateBackoffDelay(
          attempt,
          webhook.retryConfig!.initialDelay,
          webhook.retryConfig!.backoffMultiplier
        );

        logger.info(`Scheduling webhook retry in ${delay}ms:`, {
          webhookId: webhook._id,
          attempt: attempt + 1,
          maxAttempts: webhook.retryConfig!.maxAttempts,
        });

        setTimeout(() => {
          this.deliverWebhook(webhook, payload, attempt + 1);
        }, delay);

        return false;
      }

      // Disable webhook after too many failures
      if (webhook.failureCount >= 10) {
        webhook.active = false;
        await webhook.save();
        
        logger.warn(`Webhook disabled due to excessive failures:`, {
          webhookId: webhook._id,
          url: webhook.url,
          failureCount: webhook.failureCount,
        });
      }

      return false;
    }
  }

  static generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  static calculateBackoffDelay(
    attempt: number,
    initialDelay: number,
    multiplier: number
  ): number {
    // Exponential backoff with jitter
    const baseDelay = initialDelay * Math.pow(multiplier, attempt - 1);
    const jitter = Math.random() * 0.1 * baseDelay;
    return Math.min(baseDelay + jitter, 60000); // Max 1 minute
  }

  static async testWebhook(webhook: IWebhook): Promise<{
    success: boolean;
    status?: number;
    error?: string;
    responseTime?: number;
  }> {
    const testPayload: WebhookPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        application: {
          id: webhook.applicationId,
          name: 'Test',
        },
        message: 'This is a test webhook delivery',
        testId: crypto.randomUUID(),
      },
    };

    const startTime = Date.now();

    try {
      await this.deliverWebhook(webhook, testPayload);
      return {
        success: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      };
    }
  }
}