import { Worker } from 'bullmq';
import { ScheduleService } from '../services/schedule.service';
import { QueueManager } from '../services/queue-manager';
import logger from '../utils/logger';

export function createSchedulerWorker(queueManager: QueueManager): Worker {
  const scheduleService = new ScheduleService(queueManager);

  const worker = new Worker(
    'scheduler',
    async (job) => {
      const { scheduleId } = job.data;
      
      logger.info(`Processing scheduled job: ${scheduleId}`);
      
      try {
        await scheduleService.executeScheduledJob(scheduleId);
        logger.info(`Successfully executed scheduled job: ${scheduleId}`);
        return { success: true, scheduleId };
      } catch (error) {
        logger.error(`Failed to execute scheduled job ${scheduleId}:`, error);
        throw error;
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      concurrency: 5,
      removeOnComplete: {
        count: 100,
        age: 3600, // 1 hour
      },
      removeOnFail: {
        count: 1000,
        age: 86400, // 24 hours
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Scheduler job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Scheduler job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    logger.error('Scheduler worker error:', err);
  });

  return worker;
}