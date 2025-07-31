import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './utils/logger';
import { QueueManager } from './services/queue-manager';
import { initializeApplications } from './services/application';
import { setupRoutes } from './routes';
import { registerQueues } from './queues';
import { registerWorkers } from './workers';
import { setupMetrics } from './monitoring/metrics';
import { WebhookManager } from './services/webhook-manager';
import { SimpleJobTracker } from './services/simple-job-tracker';
import mongoose from 'mongoose';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check
app.get('/health', async (req, res) => {
  const queueManager = QueueManager.getInstance();
  const stats = await queueManager.getAllQueueStats();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    queues: stats,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// AI-friendly root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Queue Service API',
    version: '1.0.0',
    status: 'online',
    documentation: '/api/explain',
    quickstart: {
      '1': 'Get API documentation: GET /api/explain',
      '2': 'Create application (admin): POST /api/applications',
      '3': 'Submit job: POST /api/jobs/{queue}',
      '4': 'Check status: GET /api/jobs/{queue}/{jobId}',
    },
    hints: [
      'All endpoints except /api/explain require x-api-key header',
      'Use /api/explain/* endpoints for detailed documentation',
      'Every error includes hints for troubleshooting',
    ],
  });
});

// Setup routes
setupRoutes(app);

// Initialize services
async function startServer() {
  try {
    logger.info('Starting queue service...');

    // Connect to MongoDB if configured
    if (config.mongodb.uri) {
      await mongoose.connect(config.mongodb.uri);
      logger.info('Connected to MongoDB');
    }

    // Initialize applications
    initializeApplications();
    logger.info('Initialized applications');

    // Register queues
    await registerQueues();
    logger.info('Registered queues');

    // Register workers
    await registerWorkers();
    logger.info('Registered workers');

    // Initialize SimpleJobTracker
    SimpleJobTracker.getInstance({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
    });
    logger.info('Initialized SimpleJobTracker');

    // Initialize webhook manager
    if (config.mongodb.uri) {
      const webhookManager = WebhookManager.getInstance();
      await webhookManager.initialize();
      logger.info('Webhook manager initialized');
    } else {
      logger.warn('MongoDB not configured - webhooks disabled');
    }

    // Setup metrics if enabled
    if (config.monitoring.enablePrometheus) {
      setupMetrics();
      logger.info('Prometheus metrics enabled');
    }

    // Start server
    app.listen(config.port, () => {
      logger.info(`Queue service running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  const queueManager = QueueManager.getInstance();
  await queueManager.shutdown();
  
  if (config.mongodb.uri) {
    const webhookManager = WebhookManager.getInstance();
    await webhookManager.shutdown();
    await mongoose.disconnect();
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  const queueManager = QueueManager.getInstance();
  await queueManager.shutdown();
  
  if (config.mongodb.uri) {
    const webhookManager = WebhookManager.getInstance();
    await webhookManager.shutdown();
    await mongoose.disconnect();
  }
  
  process.exit(0);
});

// Start the server
startServer();