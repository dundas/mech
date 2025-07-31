import { Router } from 'express';
import { QueueManager } from '../services/queue-manager';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, QueueStats } from '../types';
import logger from '../utils/logger';

const router = Router();
const queueManager = QueueManager.getInstance();

// Get all queue statistics
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await queueManager.getAllQueueStats();
    
    // Filter queues based on application permissions
    const allowedQueues = req.application!.settings?.allowedQueues || [];
    const filteredStats = stats.filter(
      (stat) => allowedQueues.includes('*') || allowedQueues.includes(stat.name)
    );

    res.json({
      success: true,
      data: filteredStats,
    } as ApiResponse<QueueStats[]>);

  } catch (error) {
    logger.error('Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to get queue statistics',
      },
    } as ApiResponse);
  }
});

// Get specific queue statistics
router.get('/:queueName/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    
    // Check if application has access to this queue
    const allowedQueues = req.application!.settings?.allowedQueues || [];
    if (!allowedQueues.includes('*') && !allowedQueues.includes(queueName)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'QUEUE_ACCESS_DENIED',
          message: `Access denied to queue: ${queueName}`,
        },
      } as ApiResponse);
    }

    const stats = await queueManager.getQueueStats(queueName);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QUEUE_NOT_FOUND',
          message: `Queue '${queueName}' not found`,
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: stats,
    } as ApiResponse<QueueStats>);

  } catch (error) {
    logger.error('Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to get queue statistics',
      },
    } as ApiResponse);
  }
});

// Pause a queue
router.post('/:queueName/pause', async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    
    // Only master application can pause queues
    if (req.application!.id !== 'master') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Only master application can pause queues',
        },
      } as ApiResponse);
    }

    const success = await queueManager.pauseQueue(queueName);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QUEUE_NOT_FOUND',
          message: `Queue '${queueName}' not found`,
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: {
        message: `Queue '${queueName}' paused successfully`,
      },
    } as ApiResponse);

  } catch (error) {
    logger.error('Error pausing queue:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PAUSE_ERROR',
        message: 'Failed to pause queue',
      },
    } as ApiResponse);
  }
});

// Resume a queue
router.post('/:queueName/resume', async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    
    // Only master application can resume queues
    if (req.application!.id !== 'master') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Only master application can resume queues',
        },
      } as ApiResponse);
    }

    const success = await queueManager.resumeQueue(queueName);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QUEUE_NOT_FOUND',
          message: `Queue '${queueName}' not found`,
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: {
        message: `Queue '${queueName}' resumed successfully`,
      },
    } as ApiResponse);

  } catch (error) {
    logger.error('Error resuming queue:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESUME_ERROR',
        message: 'Failed to resume queue',
      },
    } as ApiResponse);
  }
});

// Clean a queue
router.post('/:queueName/clean', async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    const { grace = 0 } = req.body;
    
    // Only master application can clean queues
    if (req.application!.id !== 'master') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Only master application can clean queues',
        },
      } as ApiResponse);
    }

    const success = await queueManager.cleanQueue(queueName, grace);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QUEUE_NOT_FOUND',
          message: `Queue '${queueName}' not found`,
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: {
        message: `Queue '${queueName}' cleaned successfully`,
      },
    } as ApiResponse);

  } catch (error) {
    logger.error('Error cleaning queue:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEAN_ERROR',
        message: 'Failed to clean queue',
      },
    } as ApiResponse);
  }
});

// List available queues
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const allQueues = queueManager.getRegisteredQueues();
    
    // Filter queues based on application permissions
    const allowedQueues = req.application!.settings?.allowedQueues || [];
    const filteredQueues = allQueues.filter(
      (queue) => allowedQueues.includes('*') || allowedQueues.includes(queue)
    );

    const queueDetails = filteredQueues.map((queueName) => {
      const definition = queueManager.getQueueDefinition(queueName);
      return {
        name: queueName,
        description: definition?.description || '',
        defaultJobOptions: definition?.defaultJobOptions,
      };
    });

    res.json({
      success: true,
      data: queueDetails,
    } as ApiResponse);

  } catch (error) {
    logger.error('Error listing queues:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to list queues',
      },
    } as ApiResponse);
  }
});

export default router;