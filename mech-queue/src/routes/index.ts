import { Express } from 'express';
import { authenticateApiKey } from '../middleware/auth';
import { errorHandler } from '../middleware/error-handler';
import jobRoutes from './jobs-simple';
import queueRoutes from './queues';
import applicationRoutes from './applications';
import webhookRoutes from './webhooks';
import explainRoutes from './explain';
import subscriptionRoutes from './subscriptions';
import { createScheduleRoutes } from './schedule.routes';
import { QueueManager } from '../services/queue-manager';

export function setupRoutes(app: Express) {
  // Public routes - AI-friendly documentation
  app.use('/api/explain', explainRoutes);
  
  // Application management (requires master key)
  app.use('/api/applications', applicationRoutes);
  
  // Protected routes
  app.use('/api/jobs', authenticateApiKey, jobRoutes);
  app.use('/api/queues', authenticateApiKey, queueRoutes);
  app.use('/api/webhooks', authenticateApiKey, webhookRoutes);
  app.use('/api/subscriptions', authenticateApiKey, subscriptionRoutes);
  
  // Schedule routes (no auth required for internal use)
  const queueManager = QueueManager.getInstance();
  const scheduleRoutes = createScheduleRoutes(queueManager);
  app.use('/api', scheduleRoutes);
  
  // Global error handler with AI-friendly hints
  app.use(errorHandler);
}