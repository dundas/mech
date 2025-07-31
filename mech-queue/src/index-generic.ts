import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './utils/logger';
import { GenericQueueManager } from './services/generic-queue-manager';
import { initializeApplications } from './services/application';
import { authenticateApiKey } from './middleware/auth';
import genericQueueRoutes from './routes/generic-queue';
import applicationRoutes from './routes/applications';

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
  const queueManager = GenericQueueManager.getInstance();
  const queues = await queueManager.listQueues();
  
  const stats = await Promise.all(
    queues.map(name => queueManager.getQueueStats(name))
  );
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    queues: stats.filter(Boolean),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    service: 'Generic Queue Service',
    version: '2.0.0',
    description: 'Domain-agnostic job queue management',
    endpoints: {
      'POST /api/queues/:queueName/jobs': 'Submit a job to a queue',
      'GET /api/queues/:queueName/jobs/:jobId': 'Get job status',
      'GET /api/queues/:queueName/jobs': 'List jobs in queue',
      'DELETE /api/queues/:queueName/jobs/:jobId': 'Cancel a job',
      'GET /api/queues/:queueName/stats': 'Get queue statistics',
      'GET /api/queues': 'List all queues',
      'POST /api/applications': 'Create application (master key required)',
    },
    authentication: {
      header: 'x-api-key',
      description: 'Include API key in header for all requests',
    },
  });
});

// Routes
app.use('/api/applications', applicationRoutes);
app.use('/api/queues', authenticateApiKey, genericQueueRoutes);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Initialize services
async function startServer() {
  try {
    logger.info('Starting generic queue service...');

    // Initialize queue manager
    GenericQueueManager.getInstance({
      redis: {
        host: process.env.REDIS_HOST || config.redis.host,
        port: parseInt(process.env.REDIS_PORT || String(config.redis.port)),
        password: process.env.REDIS_PASSWORD || config.redis.password,
      },
    });

    // Initialize applications
    initializeApplications();
    logger.info('Initialized applications');

    // Start server
    app.listen(config.port, () => {
      logger.info(`Generic queue service running on port ${config.port}`);
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
  const queueManager = GenericQueueManager.getInstance();
  await queueManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  const queueManager = GenericQueueManager.getInstance();
  await queueManager.shutdown();
  process.exit(0);
});

// Start the server
startServer();