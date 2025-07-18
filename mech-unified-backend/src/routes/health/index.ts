import { Router, Request, Response } from 'express';
import { database } from '../../config/database';
import { logger } from '../../utils/logger';
import os from 'os';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/', async (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mech-unified-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Detailed health check
healthRouter.get('/detailed', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    const dbHealth = await database.healthCheck();
    
    // System information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        heapUsed: process.memoryUsage().heapUsed,
      },
      cpu: {
        model: os.cpus()[0]?.model,
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
    };
    
    // Service status
    const services = {
      mongodb: dbHealth.connected ? 'connected' : 'disconnected',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    };
    
    const overallStatus = dbHealth.connected ? 'healthy' : 'degraded';
    
    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      database: {
        connected: dbHealth.connected,
        responseTime: dbHealth.responseTime,
        collections: dbHealth.collections,
        error: dbHealth.error,
      },
      system: systemInfo,
      features: {
        reasoningEmbeddings: process.env.ENABLE_REASONING_EMBEDDINGS === 'true',
        realTimeUpdates: process.env.ENABLE_REAL_TIME_UPDATES === 'true',
        sessionCheckpoints: process.env.ENABLE_SESSION_CHECKPOINTS === 'true',
      },
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Readiness check (for container orchestration)
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    const dbHealth = await database.healthCheck();
    
    if (dbHealth.connected) {
      res.json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        reason: 'Database not connected',
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      reason: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Liveness check (for container orchestration)
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
  });
});