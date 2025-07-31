"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const simple_job_tracker_1 = require("../services/simple-job-tracker");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// 1. Submit a job - returns job ID
router.post('/', async (req, res) => {
    try {
        const { queue, data, metadata, webhooks } = req.body;
        if (!queue || !data) {
            return res.status(400).json({
                success: false,
                error: 'Queue name and data are required',
            });
        }
        const tracker = simple_job_tracker_1.SimpleJobTracker.getInstance();
        const jobId = await tracker.submitJob(queue, {
            ...data,
            _applicationId: req.application.id,
        }, {
            metadata,
            webhooks,
        });
        res.status(201).json({
            success: true,
            jobId,
            message: `Job submitted to ${queue} queue`,
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
// 2. Update a job (for workers/external services)
router.put('/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { status, progress, result, error, metadata } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required',
            });
        }
        const tracker = simple_job_tracker_1.SimpleJobTracker.getInstance();
        await tracker.updateJob({
            jobId,
            status,
            progress,
            result,
            error,
            metadata,
        });
        res.json({
            success: true,
            message: `Job ${jobId} updated`,
        });
    }
    catch (error) {
        logger_1.default.error('Error updating job:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update job',
        });
    }
});
// 3. Get job status
router.get('/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const tracker = simple_job_tracker_1.SimpleJobTracker.getInstance();
        const job = await tracker.getJobStatus(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }
        // Verify application access
        if (job.data._applicationId !== req.application.id && req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }
        res.json({
            success: true,
            job,
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
// 4. List jobs for application with metadata filtering
router.get('/', async (req, res) => {
    try {
        const { queue, status, limit = '100', ...metadataFilters } = req.query;
        // Parse metadata filters from query params
        const metadata = {};
        for (const [key, value] of Object.entries(metadataFilters)) {
            if (key.startsWith('metadata.')) {
                const metaKey = key.substring(9); // Remove 'metadata.' prefix
                metadata[metaKey] = value;
            }
        }
        const tracker = simple_job_tracker_1.SimpleJobTracker.getInstance();
        const jobs = await tracker.listJobs(req.application.id, {
            queue: queue,
            status: status,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            limit: parseInt(limit),
        });
        res.json({
            success: true,
            jobs,
            count: jobs.length,
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
// 5. Register webhook for job updates (optional)
router.post('/:jobId/webhook', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { webhooks } = req.body;
        if (!webhooks || typeof webhooks !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Webhooks object is required (e.g., { "completed": "https://...", "failed": "https://..." })',
            });
        }
        // Verify job ownership first
        const tracker = simple_job_tracker_1.SimpleJobTracker.getInstance();
        const job = await tracker.getJobStatus(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found',
            });
        }
        if (job.data._applicationId !== req.application.id && req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
            });
        }
        await tracker.registerWebhook(jobId, webhooks);
        res.json({
            success: true,
            message: `Webhooks registered for job ${jobId}`,
            webhooks,
        });
    }
    catch (error) {
        logger_1.default.error('Error registering webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register webhook',
        });
    }
});
exports.default = router;
//# sourceMappingURL=jobs-simple.js.map