"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQueues = registerQueues;
const queue_manager_1 = require("../services/queue-manager");
// Define available queues
const queueDefinitions = [
    {
        name: 'email',
        description: 'Email sending queue',
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        },
    },
    {
        name: 'webhook',
        description: 'Webhook delivery queue',
        defaultJobOptions: {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        },
    },
    {
        name: 'image-processing',
        description: 'Image resizing and optimization',
        defaultJobOptions: {
            attempts: 2,
            backoff: {
                type: 'fixed',
                delay: 1000,
            },
        },
    },
    {
        name: 'pdf-generation',
        description: 'PDF document generation',
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 3000,
            },
        },
    },
    {
        name: 'data-export',
        description: 'Large data export jobs',
        defaultJobOptions: {
            attempts: 2,
            backoff: {
                type: 'exponential',
                delay: 10000,
            },
        },
    },
    {
        name: 'ai-processing',
        description: 'AI/ML model processing',
        defaultJobOptions: {
            attempts: 2,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        },
    },
    {
        name: 'scheduled-tasks',
        description: 'Scheduled and recurring tasks',
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        },
    },
    {
        name: 'notifications',
        description: 'Push notifications and alerts',
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        },
    },
    {
        name: 'social-media',
        description: 'Social media posting and interactions',
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        },
    },
    {
        name: 'web-scraping',
        description: 'Web scraping and content extraction',
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        },
    },
    {
        name: 'indexing',
        description: 'Universal file indexing and processing',
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 3000,
            },
        },
    },
];
async function registerQueues() {
    const queueManager = queue_manager_1.QueueManager.getInstance();
    for (const definition of queueDefinitions) {
        queueManager.registerQueue(definition);
    }
}
//# sourceMappingURL=index.js.map