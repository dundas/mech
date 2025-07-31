import * as dotenv from 'dotenv';
dotenv.config();

// Override Redis to use localhost for local testing
process.env.REDIS_HOST = 'localhost';
process.env.NODE_ENV = 'development';

import express from 'express';
import mongoose from 'mongoose';
import { QueueManager } from './src/services/queue-manager';
import { createScheduleRoutes } from './src/routes/schedule.routes';
import logger from './src/utils/logger';

const app = express();
app.use(express.json());

async function startTestServer() {
  try {
    logger.info('Starting scheduler test server...');

    // Connect to MongoDB
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    }

    // Initialize queue manager
    const queueManager = QueueManager.getInstance();
    
    // Set up scheduler routes
    const scheduleRoutes = createScheduleRoutes(queueManager);
    app.use('/api', scheduleRoutes);

    // Start server
    const port = 3005; // Use different port for testing
    app.listen(port, () => {
      logger.info(`Test scheduler server running on port ${port}`);
      console.log(`\n✅ Scheduler test server is ready!`);
      console.log(`\nYou can now test the scheduler endpoints at http://localhost:${port}/api/schedules`);
      console.log(`\nExample test commands:`);
      console.log(`\n1. Create a test schedule:`);
      console.log(`curl -X POST http://localhost:${port}/api/schedules \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "test-webhook",
    "description": "Test webhook call",
    "endpoint": {
      "url": "https://webhook.site/YOUR-UNIQUE-ID",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "message": "Hello from Mech Scheduler!",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }
    },
    "schedule": {
      "cron": "*/1 * * * *"
    },
    "createdBy": "test-agent"
  }'`);
      console.log(`\n2. List schedules:`);
      console.log(`curl http://localhost:${port}/api/schedules`);
      console.log(`\n3. Execute immediately:`);
      console.log(`curl -X POST http://localhost:${port}/api/schedules/SCHEDULE_ID/execute`);
    });

    // Error handling
    app.use((err: any, req: any, res: any, next: any) => {
      logger.error('Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal server error'
      });
    });

  } catch (error) {
    logger.error('Failed to start test server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down test server...');
  await mongoose.disconnect();
  process.exit(0);
});

startTestServer();