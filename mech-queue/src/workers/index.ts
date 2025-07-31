import { QueueManager } from '../services/queue-manager';
import { config } from '../config';
import { emailWorker } from './email';
import { webhookWorker } from './webhook';
import { aiProcessingWorker } from './ai-processing';
import { createSchedulerWorker } from './scheduler.worker';
// import { indexingWorker } from './indexing';
import {
  imageProcessingWorker,
  pdfGenerationWorker,
  dataExportWorker,
  scheduledTasksWorker,
  notificationsWorker,
  socialMediaWorker,
  webScrapingWorker,
} from './stubs';

export async function registerWorkers() {
  const queueManager = QueueManager.getInstance();
  const defaultConcurrency = config.workers.maxWorkersPerQueue;

  // Register workers for each queue
  queueManager.registerWorker({
    queueName: 'email',
    concurrency: defaultConcurrency,
    processor: emailWorker,
  });

  queueManager.registerWorker({
    queueName: 'webhook',
    concurrency: defaultConcurrency,
    processor: webhookWorker,
  });

  queueManager.registerWorker({
    queueName: 'image-processing',
    concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)), // Less concurrency for CPU-intensive work
    processor: imageProcessingWorker,
  });

  queueManager.registerWorker({
    queueName: 'pdf-generation',
    concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)),
    processor: pdfGenerationWorker,
  });

  queueManager.registerWorker({
    queueName: 'data-export',
    concurrency: Math.max(1, Math.floor(defaultConcurrency / 3)), // Even less for memory-intensive work
    processor: dataExportWorker,
  });

  queueManager.registerWorker({
    queueName: 'ai-processing',
    concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)),
    processor: aiProcessingWorker,
  });

  queueManager.registerWorker({
    queueName: 'scheduled-tasks',
    concurrency: defaultConcurrency,
    processor: scheduledTasksWorker,
  });

  queueManager.registerWorker({
    queueName: 'notifications',
    concurrency: defaultConcurrency,
    processor: notificationsWorker,
  });

  queueManager.registerWorker({
    queueName: 'social-media',
    concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)),
    processor: socialMediaWorker,
  });

  queueManager.registerWorker({
    queueName: 'web-scraping',
    concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)),
    processor: webScrapingWorker,
  });

  // queueManager.registerWorker({
  //   queueName: 'indexing',
  //   concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)), // File processing can be CPU/IO intensive
  //   processor: indexingWorker,
  // });

  // Register the scheduler worker - this is separate from the queue manager
  const schedulerWorker = createSchedulerWorker(queueManager);
}