"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generic_queue_manager_1 = require("../services/generic-queue-manager");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Submit a job to any queue
router.post('/:queueName/jobs', async (req, res) => {
    try {
        const { queueName } = req.params;
        const { data, options } = req.body;
        if (!data) {
            return res.status(400).json({
                success: false,
                error: 'Job data is required',
            });
        }
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        const jobId = await queueManager.submitJob({
            queueName,
            data: {
                ...data,
                _metadata: {
                    applicationId: req.application.id,
                    submittedAt: new Date().toISOString(),
                },
            },
            options,
        });
        res.status(201).json({
            success: true,
            data: {
                jobId,
                queue: queueName,
                status: 'waiting',
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error submitting job:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit job',
        });
    }
});
// Get job status
router.get('/:queueName/jobs/:jobId', async (req, res) => {
    try {
        const { queueName, jobId } = req.params;
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        const job = await queueManager.getJobStatus(queueName, jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }
        // Verify application access
        if (job.data._metadata?.applicationId !== req.application.id && req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }
        res.json({
            success: true,
            data: job,
        });
    }
    catch (error) {
        logger_1.default.error('Error getting job:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get job status',
        });
    }
});
// List jobs in a queue
router.get('/:queueName/jobs', async (req, res) => {
    try {
        const { queueName } = req.params;
        const { status, limit = 100 } = req.query;
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        const jobs = await queueManager.getJobs(queueName, status, parseInt(limit));
        // Filter jobs by application (unless master)
        const filteredJobs = req.application.id === 'master'
            ? jobs
            : jobs.filter(job => job.data._metadata?.applicationId === req.application.id);
        res.json({
            success: true,
            data: filteredJobs,
        });
    }
    catch (error) {
        logger_1.default.error('Error listing jobs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list jobs',
        });
    }
});
// Cancel a job
router.delete('/:queueName/jobs/:jobId', async (req, res) => {
    try {
        const { queueName, jobId } = req.params;
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        // Verify ownership first
        const job = await queueManager.getJobStatus(queueName, jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }
        if (job.data._metadata?.applicationId !== req.application.id && req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }
        const success = await queueManager.cancelJob(queueName, jobId);
        res.json({
            success,
            message: success ? 'Job cancelled' : 'Failed to cancel job',
        });
    }
    catch (error) {
        logger_1.default.error('Error cancelling job:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel job',
        });
    }
});
// Get queue statistics
router.get('/:queueName/stats', async (req, res) => {
    try {
        const { queueName } = req.params;
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        const stats = await queueManager.getQueueStats(queueName);
        if (!stats) {
            return res.status(404).json({
                success: false,
                error: 'Queue not found',
            });
        }
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        logger_1.default.error('Error getting queue stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue statistics',
        });
    }
});
// List all queues
router.get('/', async (req, res) => {
    try {
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        const queues = await queueManager.listQueues();
        res.json({
            success: true,
            data: queues,
        });
    }
    catch (error) {
        logger_1.default.error('Error listing queues:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list queues',
        });
    }
});
// Queue control (master only)
router.post('/:queueName/pause', async (req, res) => {
    if (req.application.id !== 'master') {
        return res.status(403).json({
            success: false,
            error: 'Only master can control queues',
        });
    }
    try {
        const { queueName } = req.params;
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        await queueManager.pauseQueue(queueName);
        res.json({
            success: true,
            message: `Queue ${queueName} paused`,
        });
    }
    catch (error) {
        logger_1.default.error('Error pausing queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to pause queue',
        });
    }
});
router.post('/:queueName/resume', async (req, res) => {
    if (req.application.id !== 'master') {
        return res.status(403).json({
            success: false,
            error: 'Only master can control queues',
        });
    }
    try {
        const { queueName } = req.params;
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        await queueManager.resumeQueue(queueName);
        res.json({
            success: true,
            message: `Queue ${queueName} resumed`,
        });
    }
    catch (error) {
        logger_1.default.error('Error resuming queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resume queue',
        });
    }
});
// Clean queue (master only)
router.post('/:queueName/clean', async (req, res) => {
    if (req.application.id !== 'master') {
        return res.status(403).json({
            success: false,
            error: 'Only master can clean queues',
        });
    }
    try {
        const { queueName } = req.params;
        const { grace = 0, limit = 1000, status = 'completed' } = req.body;
        const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
        const cleaned = await queueManager.cleanQueue(queueName, grace, limit, status);
        res.json({
            success: true,
            data: {
                cleaned: cleaned.length,
                jobIds: cleaned,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error cleaning queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clean queue',
        });
    }
});
exports.default = router;
//# sourceMappingURL=generic-queue.js.map