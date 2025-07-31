"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queue_manager_1 = require("../services/queue-manager");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const queueManager = queue_manager_1.QueueManager.getInstance();
// Get all queue statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await queueManager.getAllQueueStats();
        // Filter queues based on application permissions
        const allowedQueues = req.application.settings?.allowedQueues || [];
        const filteredStats = stats.filter((stat) => allowedQueues.includes('*') || allowedQueues.includes(stat.name));
        res.json({
            success: true,
            data: filteredStats,
        });
    }
    catch (error) {
        logger_1.default.error('Error getting queue stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'STATS_ERROR',
                message: 'Failed to get queue statistics',
            },
        });
    }
});
// Get specific queue statistics
router.get('/:queueName/stats', async (req, res) => {
    try {
        const { queueName } = req.params;
        // Check if application has access to this queue
        const allowedQueues = req.application.settings?.allowedQueues || [];
        if (!allowedQueues.includes('*') && !allowedQueues.includes(queueName)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'QUEUE_ACCESS_DENIED',
                    message: `Access denied to queue: ${queueName}`,
                },
            });
        }
        const stats = await queueManager.getQueueStats(queueName);
        if (!stats) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'QUEUE_NOT_FOUND',
                    message: `Queue '${queueName}' not found`,
                },
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
            error: {
                code: 'STATS_ERROR',
                message: 'Failed to get queue statistics',
            },
        });
    }
});
// Pause a queue
router.post('/:queueName/pause', async (req, res) => {
    try {
        const { queueName } = req.params;
        // Only master application can pause queues
        if (req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'PERMISSION_DENIED',
                    message: 'Only master application can pause queues',
                },
            });
        }
        const success = await queueManager.pauseQueue(queueName);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'QUEUE_NOT_FOUND',
                    message: `Queue '${queueName}' not found`,
                },
            });
        }
        res.json({
            success: true,
            data: {
                message: `Queue '${queueName}' paused successfully`,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error pausing queue:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'PAUSE_ERROR',
                message: 'Failed to pause queue',
            },
        });
    }
});
// Resume a queue
router.post('/:queueName/resume', async (req, res) => {
    try {
        const { queueName } = req.params;
        // Only master application can resume queues
        if (req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'PERMISSION_DENIED',
                    message: 'Only master application can resume queues',
                },
            });
        }
        const success = await queueManager.resumeQueue(queueName);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'QUEUE_NOT_FOUND',
                    message: `Queue '${queueName}' not found`,
                },
            });
        }
        res.json({
            success: true,
            data: {
                message: `Queue '${queueName}' resumed successfully`,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error resuming queue:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'RESUME_ERROR',
                message: 'Failed to resume queue',
            },
        });
    }
});
// Clean a queue
router.post('/:queueName/clean', async (req, res) => {
    try {
        const { queueName } = req.params;
        const { grace = 0 } = req.body;
        // Only master application can clean queues
        if (req.application.id !== 'master') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'PERMISSION_DENIED',
                    message: 'Only master application can clean queues',
                },
            });
        }
        const success = await queueManager.cleanQueue(queueName, grace);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'QUEUE_NOT_FOUND',
                    message: `Queue '${queueName}' not found`,
                },
            });
        }
        res.json({
            success: true,
            data: {
                message: `Queue '${queueName}' cleaned successfully`,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error cleaning queue:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CLEAN_ERROR',
                message: 'Failed to clean queue',
            },
        });
    }
});
// List available queues
router.get('/', async (req, res) => {
    try {
        const allQueues = queueManager.getRegisteredQueues();
        // Filter queues based on application permissions
        const allowedQueues = req.application.settings?.allowedQueues || [];
        const filteredQueues = allQueues.filter((queue) => allowedQueues.includes('*') || allowedQueues.includes(queue));
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
        });
    }
    catch (error) {
        logger_1.default.error('Error listing queues:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'LIST_ERROR',
                message: 'Failed to list queues',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=queues.js.map