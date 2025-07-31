import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '../utils/logger';
import { SubscriptionService } from './subscription.service';

interface JobUpdate {
  jobId: string;
  status: 'started' | 'progress' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  metadata?: any;
  timestamp?: string;
}

export class SimpleJobTracker {
  private static instance: SimpleJobTracker;
  private queues: Map<string, Queue> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private redis: Redis;
  private jobUpdates: Map<string, JobUpdate[]> = new Map(); // In-memory for now
  private jobWebhooks: Map<string, Record<string, string>> = new Map();
  private jobMetadata: Map<string, Record<string, any>> = new Map();
  private subscriptionService: SubscriptionService;

  private constructor(redisConfig: any) {
    // DigitalOcean Valkey uses TLS on port 25061
    const useTLS = redisConfig.port === 25061;
    
    this.redis = new Redis({
      ...redisConfig,
      maxRetriesPerRequest: null,
      ...(useTLS && {
        tls: {
          rejectUnauthorized: false
        }
      })
    });
    this.subscriptionService = SubscriptionService.getInstance();
  }

  static getInstance(config?: any): SimpleJobTracker {
    if (!SimpleJobTracker.instance) {
      if (!config) throw new Error('Config required for initialization');
      SimpleJobTracker.instance = new SimpleJobTracker(config);
    }
    return SimpleJobTracker.instance;
  }

  // 1. Submit a job and get back a job ID
  async submitJob(queueName: string, data: any, options?: {
    metadata?: Record<string, any>;
    webhooks?: Record<string, string>;
  }): Promise<string> {
    const queue = this.getOrCreateQueue(queueName);
    const jobId = uuidv4();
    
    const jobData = {
      ...data,
      _jobId: jobId,
      _submittedAt: new Date().toISOString(),
    };
    
    // Store metadata separately for efficient filtering
    if (options?.metadata) {
      jobData._metadata = options.metadata;
      this.jobMetadata.set(jobId, options.metadata);
    }
    
    await queue.add(jobId, jobData, {
      jobId,
    });

    // Initialize job updates array
    this.jobUpdates.set(jobId, []);
    
    // Store webhooks if provided
    if (options?.webhooks) {
      this.jobWebhooks.set(jobId, options.webhooks);
    }
    
    logger.info(`Job ${jobId} submitted to queue ${queueName}`, { metadata: options?.metadata });
    
    // Trigger subscription for job creation
    this.triggerSubscriptionEvent(jobId, queueName, 'created', jobData);
    
    return jobId;
  }

  // 2. Receive updates about a job (called by workers)
  async updateJob(update: JobUpdate): Promise<void> {
    const { jobId, status, progress, result, error, metadata } = update;
    
    // Store update
    const updates = this.jobUpdates.get(jobId) || [];
    updates.push({
      ...update,
      timestamp: new Date().toISOString(),
    });
    this.jobUpdates.set(jobId, updates);
    
    logger.info(`Job ${jobId} updated: ${status}`, { progress, result, error });
    
    // If job is completed or failed, update the BullMQ job
    for (const [queueName, queue] of this.queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        if (status === 'progress' && progress !== undefined) {
          await job.updateProgress(progress);
        } else if (status === 'completed' && result !== undefined) {
          // Mark job as completed with result
          await job.moveToCompleted(result, job.token!);
        } else if (status === 'failed' && error !== undefined) {
          // Mark job as failed
          await job.moveToFailed(new Error(error), job.token!);
        }
        break;
      }
    }
  }

  // 3. Check the status of a job
  async getJobStatus(jobId: string): Promise<{
    id: string;
    queue?: string;
    status: string;
    data: any;
    metadata?: Record<string, any>;
    result?: any;
    error?: string;
    progress?: number;
    updates: JobUpdate[];
    webhooks?: Record<string, string>;
    timestamps: {
      submitted?: string;
      started?: string;
      completed?: string;
      failed?: string;
    };
  } | null> {
    // Find the job in any queue
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
    const updates = this.jobUpdates.get(jobId) || [];
    
    // Build timestamps from updates
    const timestamps: any = {
      submitted: bullJob.data._submittedAt,
    };
    
    updates.forEach(update => {
      if (update.status === 'started' && !timestamps.started) {
        timestamps.started = update.timestamp;
      } else if (update.status === 'completed' && !timestamps.completed) {
        timestamps.completed = update.timestamp;
      } else if (update.status === 'failed' && !timestamps.failed) {
        timestamps.failed = update.timestamp;
      }
    });
    
    const metadata = this.jobMetadata.get(jobId) || bullJob.data._metadata;
    const webhooks = this.jobWebhooks.get(jobId);
    
    return {
      id: jobId,
      queue: queueName || undefined,
      status: state,
      data: bullJob.data,
      metadata,
      result: bullJob.returnvalue,
      error: bullJob.failedReason,
      progress: bullJob.progress as number,
      updates,
      webhooks,
      timestamps,
    };
  }

  // 4. List all jobs for an application
  async listJobs(applicationId: string, options?: {
    queue?: string;
    status?: string;
    metadata?: Record<string, any>;
    limit?: number;
  }): Promise<Array<{
    id: string;
    queue: string;
    status: string;
    submittedAt: string;
    data: any;
    metadata?: Record<string, any>;
  }>> {
    const results = [];
    const limit = options?.limit || 100;
    
    // Search through all queues or specific queue
    const queuesToSearch = options?.queue 
      ? [this.queues.get(options.queue)].filter(Boolean)
      : Array.from(this.queues.values());
    
    for (const queue of queuesToSearch) {
      if (!queue) continue;
      
      let jobs: any[] = [];
      
      // Get jobs based on status filter
      if (!options?.status || options.status === 'all') {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(0, limit / 4),
          queue.getActive(0, limit / 4),
          queue.getCompleted(0, limit / 4),
          queue.getFailed(0, limit / 4),
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed];
      } else {
        switch (options.status) {
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
        }
      }
      
      // Filter by applicationId and format results
      for (const job of jobs) {
        if (job.data._applicationId === applicationId || applicationId === 'master') {
          // Filter by metadata if specified
          if (options?.metadata) {
            const jobMetadata = this.jobMetadata.get(job.id!) || job.data._metadata || {};
            let matches = true;
            
            for (const [key, value] of Object.entries(options.metadata)) {
              if (jobMetadata[key] !== value) {
                matches = false;
                break;
              }
            }
            
            if (!matches) continue;
          }
          
          results.push({
            id: job.id!,
            queue: queue.name,
            status: await job.getState(),
            submittedAt: job.data._submittedAt,
            data: job.data,
            metadata: this.jobMetadata.get(job.id!) || job.data._metadata,
          });
        }
      }
    }
    
    return results.slice(0, limit);
  }

  // Register webhooks for job status changes
  async registerWebhook(jobId: string, webhooks: Record<string, string>): Promise<void> {
    const existing = this.jobWebhooks.get(jobId) || {};
    this.jobWebhooks.set(jobId, { ...existing, ...webhooks });
    logger.info(`Registered webhooks for job ${jobId}`, webhooks);
  }
  
  // Trigger webhook for a specific status
  private async triggerWebhook(jobId: string, status: string, data: any): Promise<void> {
    const webhooks = this.jobWebhooks.get(jobId);
    if (!webhooks) return;
    
    // Check for status-specific webhook or wildcard
    const webhookUrl = webhooks[status] || webhooks['*'];
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
      
      logger.info(`Webhook triggered for job ${jobId} status ${status}`);
    } catch (error) {
      logger.error(`Failed to trigger webhook for job ${jobId}:`, error);
    }
  }

  private getOrCreateQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);
    
    if (!queue) {
      queue = new Queue(queueName, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: {
            age: 3600, // 1 hour
            count: 100,
          },
          removeOnFail: {
            age: 86400, // 24 hours
            count: 500,
          },
        },
      });
      
      // Set up event listener for this queue
      const queueEvents = new QueueEvents(queueName, {
        connection: this.redis,
      });
      
      // Listen for job events and trigger webhooks + subscriptions
      queueEvents.on('active', async ({ jobId }) => {
        logger.debug(`Job ${jobId} started processing`);
        this.triggerWebhook(jobId, 'started', {});
        
        // Get job data and trigger subscription
        if (queue) {
          const job = await queue.getJob(jobId);
          if (job) {
            await this.triggerSubscriptionEvent(jobId, queueName, 'started', job.data);
          }
        }
      });
      
      queueEvents.on('progress', async ({ jobId, data }) => {
        logger.debug(`Job ${jobId} progress: ${data}`);
        this.triggerWebhook(jobId, 'progress', { progress: data });
        
        // Get job data and trigger subscription
        if (queue) {
          const job = await queue.getJob(jobId);
          if (job) {
            await this.triggerSubscriptionEvent(jobId, queueName, 'progress', job.data, { progress: data });
          }
        }
      });
      
      queueEvents.on('completed', async ({ jobId, returnvalue }) => {
        logger.debug(`Job ${jobId} completed`, returnvalue);
        this.triggerWebhook(jobId, 'completed', { result: returnvalue });
        
        // Get job data and trigger subscription
        if (queue) {
          const job = await queue.getJob(jobId);
          if (job) {
            await this.triggerSubscriptionEvent(jobId, queueName, 'completed', job.data, { result: returnvalue });
          }
        }
      });
      
      queueEvents.on('failed', async ({ jobId, failedReason }) => {
        logger.debug(`Job ${jobId} failed: ${failedReason}`);
        this.triggerWebhook(jobId, 'failed', { error: failedReason });
        
        // Get job data and trigger subscription
        if (queue) {
          const job = await queue.getJob(jobId);
          if (job) {
            await this.triggerSubscriptionEvent(jobId, queueName, 'failed', job.data, { error: failedReason });
          }
        }
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

  // Trigger subscription events
  private async triggerSubscriptionEvent(
    jobId: string,
    queueName: string,
    status: string,
    jobData: any,
    additionalData?: any
  ): Promise<void> {
    try {
      // Get the full job data
      let job = null;
      const queue = this.queues.get(queueName);
      if (queue) {
        job = await queue.getJob(jobId);
      }
      
      const event = {
        jobId,
        queue: queueName,
        status,
        applicationId: jobData._applicationId || job?.data._applicationId,
        data: jobData,
        metadata: this.jobMetadata.get(jobId) || jobData._metadata || {},
        result: additionalData?.result,
        error: additionalData?.error,
        progress: additionalData?.progress,
        timestamp: new Date().toISOString(),
      };
      
      // Trigger matching subscriptions
      await this.subscriptionService.triggerSubscriptions(event);
    } catch (error) {
      logger.error(`Error triggering subscription event for job ${jobId}:`, error);
    }
  }
}