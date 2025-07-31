import express from 'express';
import { register, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';
import { config } from '../config';
import logger from '../utils/logger';

// Metrics
export const jobsSubmitted = new Counter({
  name: 'queue_jobs_submitted_total',
  help: 'Total number of jobs submitted',
  labelNames: ['queue', 'application'],
});

export const jobsCompleted = new Counter({
  name: 'queue_jobs_completed_total',
  help: 'Total number of jobs completed',
  labelNames: ['queue', 'application', 'status'],
});

export const jobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue', 'application'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
});

export const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Current queue size',
  labelNames: ['queue', 'state'],
});

export const activeWorkers = new Gauge({
  name: 'queue_active_workers',
  help: 'Number of active workers',
  labelNames: ['queue'],
});

export const jobsDelivered = new Counter({
  name: 'webhook_deliveries_total',
  help: 'Total number of webhook deliveries',
  labelNames: ['application', 'event', 'status'],
});

export const webhookAttempts = new Counter({
  name: 'webhook_attempts_total',
  help: 'Total number of webhook delivery attempts',
  labelNames: ['application', 'event', 'status', 'attempt'],
});

export function setupMetrics() {
  // Collect default metrics (CPU, memory, etc.)
  collectDefaultMetrics({ prefix: 'queue_service_' });

  // Create metrics server
  const metricsApp = express();

  metricsApp.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  metricsApp.listen(config.monitoring.metricsPort, () => {
    logger.info(`Metrics server running on port ${config.monitoring.metricsPort}`);
  });
}