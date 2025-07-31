import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { QueueDefinition, WorkerDefinition, QueueStats } from '../types';
import logger from '../utils/logger';

export class QueueManager {
  private static instance: QueueManager;
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker[]> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private queueDefinitions: Map<string, QueueDefinition> = new Map();

  private constructor() {
    // DigitalOcean Valkey uses TLS on port 25061
    const useTLS = config.redis.port === 25061;
    
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      maxRetriesPerRequest: null,
      ...(useTLS && {
        tls: {
          rejectUnauthorized: false
        }
      })
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  registerQueue(definition: QueueDefinition): Queue {
    if (this.queues.has(definition.name)) {
      return this.queues.get(definition.name)!;
    }

    const queue = new Queue(definition.name, {
      connection: this.redis,
      defaultJobOptions: definition.defaultJobOptions || {
        attempts: config.workers.defaultJobAttempts,
        backoff: {
          type: 'exponential',
          delay: config.workers.defaultJobBackoffDelay,
        },
        removeOnComplete: {
          age: config.queues.removeCompletedJobsAfter,
        },
        removeOnFail: {
          age: config.queues.removeFailedJobsAfter,
        },
      },
    });

    const queueEvents = new QueueEvents(definition.name, {
      connection: this.redis,
    });

    this.queues.set(definition.name, queue);
    this.queueEvents.set(definition.name, queueEvents);
    this.queueDefinitions.set(definition.name, definition);

    logger.info(`Registered queue: ${definition.name}`);
    return queue;
  }

  registerWorker(definition: WorkerDefinition): Worker {
    const workers = this.workers.get(definition.queueName) || [];
    
    const worker = new Worker(
      definition.queueName,
      definition.processor,
      {
        connection: this.redis,
        concurrency: definition.concurrency,
      }
    );

    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed in queue ${definition.queueName}`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed in queue ${definition.queueName}:`, error);
    });

    workers.push(worker);
    this.workers.set(definition.queueName, workers);

    logger.info(`Registered worker for queue: ${definition.queueName}`);
    return worker;
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async getQueueStats(queueName: string): Promise<QueueStats | null> {
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

  async getAllQueueStats(): Promise<QueueStats[]> {
    const stats = await Promise.all(
      Array.from(this.queues.keys()).map((name) => this.getQueueStats(name))
    );
    return stats.filter((stat): stat is QueueStats => stat !== null);
  }

  async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options?: any
  ): Promise<string | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      logger.error(`Queue not found: ${queueName}`);
      return null;
    }

    const job = await queue.add(jobName, data, options);
    logger.info(`Added job ${job.id} to queue ${queueName}`);
    return job.id ?? null;
  }

  async getJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    return queue.getJob(jobId);
  }

  async pauseQueue(queueName: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    await queue.pause();
    logger.info(`Paused queue: ${queueName}`);
    return true;
  }

  async resumeQueue(queueName: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    await queue.resume();
    logger.info(`Resumed queue: ${queueName}`);
    return true;
  }

  async cleanQueue(queueName: string, grace: number = 0): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    await queue.clean(grace, 1000);
    logger.info(`Cleaned queue: ${queueName}`);
    return true;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down queue manager...');

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

    logger.info('Queue manager shutdown complete');
  }

  getRegisteredQueues(): string[] {
    return Array.from(this.queues.keys());
  }

  getQueueDefinition(queueName: string): QueueDefinition | undefined {
    return this.queueDefinitions.get(queueName);
  }
}