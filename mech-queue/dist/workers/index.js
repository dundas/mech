"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWorkers = registerWorkers;
const queue_manager_1 = require("../services/queue-manager");
const config_1 = require("../config");
const email_1 = require("./email");
const webhook_1 = require("./webhook");
const ai_processing_1 = require("./ai-processing");
const scheduler_worker_1 = require("./scheduler.worker");
// import { indexingWorker } from './indexing';
const stubs_1 = require("./stubs");
async function registerWorkers() {
    const queueManager = queue_manager_1.QueueManager.getInstance();
    const defaultConcurrency = config_1.config.workers.maxWorkersPerQueue;
    // Register workers for each queue
    queueManager.registerWorker({
        queueName: 'email',
        concurrency: defaultConcurrency,
        processor: email_1.emailWorker,
    });
    queueManager.registerWorker({
        queueName: 'webhook',
        concurrency: defaultConcurrency,
        processor: webhook_1.webhookWorker,
    });
    queueManager.registerWorker({
        queueName: 'image-processing',
        concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)), // Less concurrency for CPU-intensive work
        processor: stubs_1.imageProcessingWorker,
    });
    queueManager.registerWorker({
        queueName: 'pdf-generation',
        concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)),
        processor: stubs_1.pdfGenerationWorker,
    });
    queueManager.registerWorker({
        queueName: 'data-export',
        concurrency: Math.max(1, Math.floor(defaultConcurrency / 3)), // Even less for memory-intensive work
        processor: stubs_1.dataExportWorker,
    });
    queueManager.registerWorker({
        queueName: 'ai-processing',
        concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)),
        processor: ai_processing_1.aiProcessingWorker,
    });
    queueManager.registerWorker({
        queueName: 'scheduled-tasks',
        concurrency: defaultConcurrency,
        processor: stubs_1.scheduledTasksWorker,
    });
    queueManager.registerWorker({
        queueName: 'notifications',
        concurrency: defaultConcurrency,
        processor: stubs_1.notificationsWorker,
    });
    queueManager.registerWorker({
        queueName: 'social-media',
        concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)),
        processor: stubs_1.socialMediaWorker,
    });
    queueManager.registerWorker({
        queueName: 'web-scraping',
        concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)),
        processor: stubs_1.webScrapingWorker,
    });
    // queueManager.registerWorker({
    //   queueName: 'indexing',
    //   concurrency: Math.max(1, Math.floor(defaultConcurrency / 2)), // File processing can be CPU/IO intensive
    //   processor: indexingWorker,
    // });
    // Register the scheduler worker - this is separate from the queue manager
    const schedulerWorker = (0, scheduler_worker_1.createSchedulerWorker)(queueManager);
}
//# sourceMappingURL=index.js.map