import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '../utils/logger';

interface JobSubmission {
  queue: string;
  data: any;
  metadata?: Record<string, any>;
  webhooks?: {
    onStarted?: string;
    onProgress?: string;
    onCompleted?: string;
    onFailed?: string;
    [key: string]: string | undefined; // Allow custom status webhooks
  };
}

interface JobUpdate {
  jobId: string;
  status: string; // More flexible to allow custom statuses
  progress?: number;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

interface JobFilter {
  queue?: string;
  status?: string;
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export class EnhancedJobTracker {
  private static instance: EnhancedJobTracker;
  private queues: Map<string, Queue> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private redis: Redis;
  private jobWebhooks: Map<string, Record<string, string>> = new Map();
  private jobMetadata: Map<string, Record<string, any>> = new Map();

  private constructor(redisConfig: any) {
    this.redis = new Redis(redisConfig);
  }

  static getInstance(config?: any): EnhancedJobTracker {
    if (!EnhancedJobTracker.instance) {
      if (!config) throw new Error('Config required for initialization');
      EnhancedJobTracker.instance = new EnhancedJobTracker(config);
    }
    return EnhancedJobTracker.instance;
  }

  // Submit a job with optional metadata and webhooks
  async submitJob({
    queue,
    data,
    metadata = {},
    webhooks = {},
  }: JobSubmission): Promise<string> {
    const queueInstance = this.getOrCreateQueue(queue);
    const jobId = uuidv4();
    
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
      const cleanWebhooks: Record<string, string> = {};
      for (const [key, value] of Object.entries(webhooks)) {
        if (value !== undefined) {
          cleanWebhooks[key] = value;
        }
      }
      this.jobWebhooks.set(jobId, cleanWebhooks);
    }
    
    logger.info(`Job ${jobId} submitted to queue ${queue}`, { metadata });
    return jobId;
  }

  // Update job and trigger webhooks
  async updateJob(update: JobUpdate): Promise<void> {
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
    } else if (status === 'completed' && result !== undefined) {
      await job.moveToCompleted(result, job.token!);
    } else if (status === 'failed' && error !== undefined) {
      await job.moveToFailed(new Error(error), job.token!);
    }
    
    logger.info(`Job ${jobId} updated: ${status}`, { progress, result, error });
    
    // Trigger webhooks
    await this.triggerWebhook(jobId, status, { progress, result, error });
  }

  // Get job status with all details
  async getJobStatus(jobId: string): Promise<any> {
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
    
    if (!bullJob) return null;
    
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
      progress: bullJob.progress as number,
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
  async listJobs(applicationId: string, filters: JobFilter = {}): Promise<any[]> {
    const { queue, status, metadata, limit = 100, offset = 0 } = filters;
    const results = [];
    
    // Determine which queues to search
    const queuesToSearch = queue 
      ? [this.queues.get(queue)].filter(Boolean)
      : Array.from(this.queues.values());
    
    for (const queueInstance of queuesToSearch) {
      if (!queueInstance) continue;
      
      let jobs: any[] = [];
      
      // Get jobs based on status filter
      if (!status || status === 'all') {
        const [waiting, active, completed, failed] = await Promise.all([
          queueInstance.getWaiting(0, limit * 2),
          queueInstance.getActive(0, limit * 2),
          queueInstance.getCompleted(0, limit * 2),
          queueInstance.getFailed(0, limit * 2),
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed];
      } else {
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
          const jobMetadata = this.jobMetadata.get(job.id!) || job.data._metadata || {};
          let matches = true;
          
          for (const [key, value] of Object.entries(metadata)) {
            if (jobMetadata[key] !== value) {
              matches = false;
              break;
            }
          }
          
          if (!matches) continue;
        }
        
        const jobState = await job.getState();
        results.push({
          id: job.id!,
          queue: queueInstance.name,
          status: jobState,
          submittedAt: job.data._submittedAt,
          data: job.data,
          metadata: this.jobMetadata.get(job.id!) || job.data._metadata || {},
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
  async setJobWebhooks(jobId: string, webhooks: Record<string, string>): Promise<void> {
    const existing = this.jobWebhooks.get(jobId) || {};
    this.jobWebhooks.set(jobId, { ...existing, ...webhooks });
    logger.info(`Updated webhooks for job ${jobId}`, webhooks);
  }

  // Trigger webhook for status change
  private async triggerWebhook(jobId: string, status: string, data: any): Promise<void> {
    const webhooks = this.jobWebhooks.get(jobId);
    if (!webhooks) return;
    
    // Check for status-specific webhook
    const webhookUrl = webhooks[`on${status.charAt(0).toUpperCase() + status.slice(1)}`] || 
                      webhooks[status] ||
                      webhooks['*']; // Wildcard webhook for all statuses
    
    if (!webhookUrl) return;
    
    try {
      await axios.post(webhookUrl, {
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
      
      logger.info(`Webhook triggered for job ${jobId} status ${status}`, { url: webhookUrl });
    } catch (error) {
      logger.error(`Failed to trigger webhook for job ${jobId}`, error);
    }
  }

  // Search jobs by metadata
  async searchJobsByMetadata(
    applicationId: string, 
    metadataQuery: Record<string, any>,
    options: { queue?: string; limit?: number } = {}
  ): Promise<any[]> {
    return this.listJobs(applicationId, {
      metadata: metadataQuery,
      queue: options.queue,
      limit: options.limit || 100,
    });
  }

  // Get queue statistics with metadata breakdown
  async getQueueStats(queueName: string, groupByMetadata?: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    
    const stats: any = {
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
        const metadata = this.jobMetadata.get(job.id!) || job.data._metadata || {};
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

  private getOrCreateQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);
    
    if (!queue) {
      queue = new Queue(queueName, {
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
      
      const queueEvents = new QueueEvents(queueName, {
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
      logger.info(`Created queue: ${queueName}`);
    }
    
    return queue;
  }

  async shutdown(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.close();
    }
    for (const [name, events] of this.queueEvents) {
      await events.close();
    }
    await this.redis.quit();
  }
}