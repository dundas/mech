import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
}

interface JobSubmission {
  queueName: string;
  data: any;
  options?: {
    priority?: number;
    delay?: number;
    attempts?: number;
  };
}

export class GenericQueueManager {
  private static instance: GenericQueueManager;
  private queues: Map<string, Queue> = new Map();
  private redis: Redis;

  private constructor(config: QueueConfig) {
    this.redis = new Redis(config.redis);
  }

  static getInstance(config?: QueueConfig): GenericQueueManager {
    if (!GenericQueueManager.instance) {
      if (!config) throw new Error('Config required for first initialization');
      GenericQueueManager.instance = new GenericQueueManager(config);
    }
    return GenericQueueManager.instance;
  }

  // Submit a job to any queue (creates queue if doesn't exist)
  async submitJob({ queueName, data, options }: JobSubmission): Promise<string> {
    const queue = this.getOrCreateQueue(queueName);
    const jobId = uuidv4();
    
    const job = await queue.add(jobId, data, {
      jobId,
      ...options,
    });

    logger.info(`Job ${jobId} submitted to queue ${queueName}`);
    return job.id!;
  }

  // Get job status
  async getJobStatus(queueName: string, jobId: string): Promise<{
    id: string;
    status: string;
    data: any;
    result?: any;
    error?: string;
    progress?: number;
    timestamps: {
      created: number;
      processed?: number;
      completed?: number;
      failed?: number;
    };
  } | null> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    
    return {
      id: job.id!,
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
  async getJobs(queueName: string, status?: string, limit = 100): Promise<any[]> {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    let jobs: Job[] = [];
    
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
  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const job = await queue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    logger.info(`Job ${jobId} removed from queue ${queueName}`);
    return true;
  }

  // Queue statistics
  async getQueueStats(queueName: string): Promise<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  } | null> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

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
  async listQueues(): Promise<string[]> {
    return Array.from(this.queues.keys());
  }

  // Pause/resume queue
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) await queue.resume();
  }

  // Clean completed/failed jobs
  async cleanQueue(queueName: string, grace: number = 0, limit: number = 1000, status: 'completed' | 'failed' = 'completed'): Promise<string[]> {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    return await queue.clean(grace, limit, status);
  }

  private getOrCreateQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);
    
    if (!queue) {
      queue = new Queue(queueName, {
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
      logger.info(`Created queue: ${queueName}`);
    }
    
    return queue;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down queue manager...');
    
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Closed queue: ${name}`);
    }
    
    await this.redis.quit();
    this.queues.clear();
  }
}