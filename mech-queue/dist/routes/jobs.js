"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const queue_manager_1 = require("../services/queue-manager");
const auth_1 = require("../middleware/auth");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const queueManager = queue_manager_1.QueueManager.getInstance();
// Submit a job to a queue
router.post('/:queueName', (0, auth_1.requireQueue)(':queueName'), async (req, res) => {
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
            });
        }
        // Add application information to job data
        const jobData = {
            ...data,
            _metadata: {
                applicationId: req.application.id,
                applicationName: req.application.name,
                submittedAt: new Date().toISOString(),
                requestId: (0, uuid_1.v4)(),
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
            });
        }
        logger_1.default.info(`Job ${jobId} submitted to queue ${queueName} by application ${req.application.id}`);
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
        });
    }
    catch (error) {
        logger_1.default.error('Error submitting job:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'JOB_SUBMISSION_ERROR',
                message: 'Failed to submit job',
            },
        });
    }
});
// Get job status
router.get('/:queueName/:jobId', (0, auth_1.requireQueue)(':queueName'), async (req, res) => {
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
            });
        }
        // Verify application access
        const jobData = job.data;
        if (jobData._metadata?.applicationId !== req.application.id && req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'Access denied to this job',
                },
            });
        }
        const state = await job.getState();
        const status = {
            id: job.id,
            queue: queueName,
            status: state,
            progress: job.progress,
            createdAt: new Date(job.timestamp),
            processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            completedAt: job.finishedOn && state === 'completed' ? new Date(job.finishedOn) : undefined,
            failedAt: job.finishedOn && state === 'failed' ? new Date(job.finishedOn) : undefined,
        };
        if (state === 'completed') {
            status.result = job.returnvalue;
        }
        else if (state === 'failed') {
            status.error = job.failedReason;
        }
        res.json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        logger_1.default.error('Error getting job status:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'JOB_STATUS_ERROR',
                message: 'Failed to get job status',
            },
        });
    }
});
// Cancel a job
router.delete('/:queueName/:jobId', (0, auth_1.requireQueue)(':queueName'), async (req, res) => {
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
            });
        }
        // Verify application access
        const jobData = job.data;
        if (jobData._metadata?.applicationId !== req.application.id && req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'Access denied to this job',
                },
            });
        }
        await job.remove();
        logger_1.default.info(`Job ${jobId} removed from queue ${queueName} by application ${req.application.id}`);
        res.json({
            success: true,
            data: {
                message: 'Job cancelled successfully',
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error cancelling job:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'JOB_CANCEL_ERROR',
                message: 'Failed to cancel job',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=jobs.js.map