import { Job } from 'bullmq';
import axios from 'axios';
import logger from '../utils/logger';

interface WebhookJobData {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  retryOnFailure?: boolean;
  _metadata?: any;
}

export async function webhookWorker(job: Job<WebhookJobData>): Promise<any> {
  const { url, method = 'POST', headers = {}, data, timeout = 30000 } = job.data;
  const applicationId = job.data._metadata?.applicationId;

  logger.info(`Processing webhook job ${job.id} for application ${applicationId}: ${method} ${url}`);

  try {
    const response = await axios({
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QueueService/1.0',
        ...headers,
      },
      data,
      timeout,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    const result = {
      success: response.status < 400,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      timestamp: new Date().toISOString(),
    };

    if (response.status >= 400) {
      logger.warn(`Webhook returned ${response.status} for job ${job.id}`);
    } else {
      logger.info(`Webhook job ${job.id} completed successfully`);
    }

    return result;

  } catch (error: any) {
    logger.error(`Webhook job ${job.id} failed:`, error);

    // Differentiate between network errors and other errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Network error: ${error.message}`);
    }

    throw error;
  }
}