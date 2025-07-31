import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { QueueManager } from '../services/queue-manager';
import { AuthenticatedRequest } from '../middleware/auth';
import { requireQueue } from '../middleware/auth';
import { ApiResponse, JobStatus } from '../types';
import logger from '../utils/logger';

const router = Router();
const queueManager = QueueManager.getInstance();

// Submit a job to a queue
router.post('/:queueName', requireQueue(':queueName'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    const { name = 'job', data, options = {} } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Job data is required',
          hints: [
            'Include "data" field in request body',
            `Check example: GET /api/explain/jobs/${queueName}`,
            'Data can be any valid JSON object',
          ],
          possibleCauses: [
            'Missing "data" field in request body',
            'Typo in field name',
            'Sending empty request body',
          ],
          suggestedFixes: [
            'Add data field: { "name": "job", "data": { ... } }',
            `curl example: ${require('../utils/ai-helpers').AIHelper.generateCurlExample('POST', `/api/jobs/${queueName}`, 'your-key', { name: 'job', data: {} })}`,
          ],
        },
      } as ApiResponse);
    }

    // Add application information to job data
    const jobData = {
      ...data,
      _metadata: {
        applicationId: req.application!.id,
        applicationName: req.application!.name,
        submittedAt: new Date().toISOString(),
        requestId: uuidv4(),
      },
    };

    const jobId = await queueManager.addJob(queueName, name, jobData, options);

    if (!jobId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'QUEUE_NOT_FOUND',
          message: `Queue '${queueName}' not found`,
        },
      } as ApiResponse);
    }

    logger.info(`Job ${jobId} submitted to queue ${queueName} by application ${req.application!.id}`);

    res.status(201).json({
      success: true,
      data: {
        jobId,
        queue: queueName,
        status: 'waiting',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: jobData._metadata.requestId,
      },
    } as ApiResponse);

  } catch (error) {
    logger.error('Error submitting job:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'JOB_SUBMISSION_ERROR',
        message: 'Failed to submit job',
      },
    } as ApiResponse);
  }
});

// Get job status
router.get('/:queueName/:jobId', requireQueue(':queueName'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName, jobId } = req.params;
    
    const job = await queueManager.getJob(queueName, jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Job '${jobId}' not found in queue '${queueName}'`,
        },
      } as ApiResponse);
    }

    // Verify application access
    const jobData = job.data;
    if (jobData._metadata?.applicationId !== req.application!.id && req.application!.id !== 'master') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this job',
        },
      } as ApiResponse);
    }

    const state = await job.getState();
    const status: JobStatus = {
      id: job.id!,
      queue: queueName,
      status: state as any,
      progress: job.progress,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn && state === 'completed' ? new Date(job.finishedOn) : undefined,
      failedAt: job.finishedOn && state === 'failed' ? new Date(job.finishedOn) : undefined,
    };

    if (state === 'completed') {
      status.result = job.returnvalue;
    } else if (state === 'failed') {
      status.error = job.failedReason;
    }

    res.json({
      success: true,
      data: status,
    } as ApiResponse<JobStatus>);

  } catch (error) {
    logger.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'JOB_STATUS_ERROR',
        message: 'Failed to get job status',
      },
    } as ApiResponse);
  }
});

// Cancel a job
router.delete('/:queueName/:jobId', requireQueue(':queueName'), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName, jobId } = req.params;
    
    const job = await queueManager.getJob(queueName, jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Job '${jobId}' not found in queue '${queueName}'`,
        },
      } as ApiResponse);
    }

    // Verify application access
    const jobData = job.data;
    if (jobData._metadata?.applicationId !== req.application!.id && req.application!.id !== 'master') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this job',
        },
      } as ApiResponse);
    }

    await job.remove();
    logger.info(`Job ${jobId} removed from queue ${queueName} by application ${req.application!.id}`);

    res.json({
      success: true,
      data: {
        message: 'Job cancelled successfully',
      },
    } as ApiResponse);

  } catch (error) {
    logger.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'JOB_CANCEL_ERROR',
        message: 'Failed to cancel job',
      },
    } as ApiResponse);
  }
});

export default router;