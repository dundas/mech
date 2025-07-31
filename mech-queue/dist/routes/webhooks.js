"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_manager_1 = require("../services/webhook-manager");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const webhookManager = webhook_manager_1.WebhookManager.getInstance();
// Create a new webhook
router.post('/', async (req, res) => {
    try {
        const { url, events, queues, headers, retryConfig } = req.body;
        if (!url || !events || !Array.isArray(events)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'URL and events array are required',
                    hints: [
                        'Include "url" field with valid HTTP/HTTPS URL',
                        'Include "events" array with webhook events',
                        'Check /api/explain/webhooks for examples',
                    ],
                    possibleCauses: [
                        'Missing url field',
                        'Missing events array',
                        'Invalid URL format',
                    ],
                    suggestedFixes: [
                        'Example: {"url": "https://example.com/webhook", "events": ["job.completed"]}',
                        'Valid events: job.created, job.completed, job.failed, etc.',
                    ],
                },
            });
        }
        const webhookData = {
            applicationId: req.application.id,
            url,
            events,
            queues: queues || ['*'],
            headers: headers || {},
            retryConfig: retryConfig || {
                maxAttempts: 3,
                backoffMultiplier: 2,
                initialDelay: 1000,
            },
        };
        const webhook = await webhookManager.registerWebhook(webhookData);
        logger_1.default.info(`Webhook created by application ${req.application.id}:`, {
            webhookId: webhook._id,
            url: webhook.url,
            events: webhook.events,
        });
        res.status(201).json({
            success: true,
            data: {
                id: webhook._id,
                url: webhook.url,
                events: webhook.events,
                queues: webhook.queues,
                secret: webhook.secret,
                active: webhook.active,
                createdAt: webhook.createdAt,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error creating webhook:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_CREATE_ERROR',
                message: 'Failed to create webhook',
                hints: [
                    'Check webhook URL is accessible',
                    'Verify events are valid',
                    'Ensure proper JSON format',
                ],
            },
        });
    }
});
// List all webhooks for application
router.get('/', async (req, res) => {
    try {
        const webhooks = await webhookManager.getWebhooks(req.application.id);
        const sanitizedWebhooks = webhooks.map(webhook => ({
            id: webhook._id,
            url: webhook.url,
            events: webhook.events,
            queues: webhook.queues,
            active: webhook.active,
            failureCount: webhook.failureCount,
            lastTriggeredAt: webhook.lastTriggeredAt,
            createdAt: webhook.createdAt,
            updatedAt: webhook.updatedAt,
        }));
        res.json({
            success: true,
            data: sanitizedWebhooks,
        });
    }
    catch (error) {
        logger_1.default.error('Error listing webhooks:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_LIST_ERROR',
                message: 'Failed to list webhooks',
            },
        });
    }
});
// Get specific webhook
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const webhook = await webhookManager.getWebhook(id, req.application.id);
        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'WEBHOOK_NOT_FOUND',
                    message: `Webhook '${id}' not found`,
                    hints: [
                        'Check the webhook ID is correct',
                        'Verify the webhook belongs to your application',
                        'Use GET /api/webhooks to list your webhooks',
                    ],
                },
            });
        }
        res.json({
            success: true,
            data: {
                id: webhook._id,
                url: webhook.url,
                events: webhook.events,
                queues: webhook.queues,
                secret: webhook.secret,
                active: webhook.active,
                headers: webhook.headers,
                retryConfig: webhook.retryConfig,
                failureCount: webhook.failureCount,
                lastTriggeredAt: webhook.lastTriggeredAt,
                createdAt: webhook.createdAt,
                updatedAt: webhook.updatedAt,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error getting webhook:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_GET_ERROR',
                message: 'Failed to get webhook',
            },
        });
    }
});
// Update webhook
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { url, events, queues, active, headers, retryConfig } = req.body;
        const updates = {};
        if (url !== undefined)
            updates.url = url;
        if (events !== undefined)
            updates.events = events;
        if (queues !== undefined)
            updates.queues = queues;
        if (active !== undefined)
            updates.active = active;
        if (headers !== undefined)
            updates.headers = headers;
        if (retryConfig !== undefined)
            updates.retryConfig = retryConfig;
        const webhook = await webhookManager.updateWebhook(id, req.application.id, updates);
        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'WEBHOOK_NOT_FOUND',
                    message: `Webhook '${id}' not found`,
                },
            });
        }
        logger_1.default.info(`Webhook updated by application ${req.application.id}:`, {
            webhookId: webhook._id,
            updates: Object.keys(updates),
        });
        res.json({
            success: true,
            data: {
                id: webhook._id,
                url: webhook.url,
                events: webhook.events,
                queues: webhook.queues,
                active: webhook.active,
                updatedAt: webhook.updatedAt,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error updating webhook:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_UPDATE_ERROR',
                message: 'Failed to update webhook',
            },
        });
    }
});
// Delete webhook
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await webhookManager.deleteWebhook(id, req.application.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'WEBHOOK_NOT_FOUND',
                    message: `Webhook '${id}' not found`,
                },
            });
        }
        logger_1.default.info(`Webhook deleted by application ${req.application.id}:`, {
            webhookId: id,
        });
        res.json({
            success: true,
            data: {
                message: 'Webhook deleted successfully',
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error deleting webhook:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_DELETE_ERROR',
                message: 'Failed to delete webhook',
            },
        });
    }
});
// Test webhook
router.post('/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await webhookManager.testWebhook(id, req.application.id);
        logger_1.default.info(`Webhook test by application ${req.application.id}:`, {
            webhookId: id,
            success: result.success,
            responseTime: result.responseTime,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.default.error('Error testing webhook:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_TEST_ERROR',
                message: error instanceof Error ? error.message : 'Failed to test webhook',
                hints: [
                    'Check webhook URL is accessible',
                    'Verify webhook is not disabled',
                    'Ensure network connectivity',
                ],
            },
        });
    }
});
// Regenerate webhook secret
router.post('/:id/regenerate-secret', async (req, res) => {
    try {
        const { id } = req.params;
        const newSecret = `whsec_${Buffer.from(crypto_1.default.randomBytes(32)).toString('base64url')}`;
        const webhook = await webhookManager.updateWebhook(id, req.application.id, { secret: newSecret });
        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'WEBHOOK_NOT_FOUND',
                    message: `Webhook '${id}' not found`,
                },
            });
        }
        logger_1.default.info(`Webhook secret regenerated by application ${req.application.id}:`, {
            webhookId: id,
        });
        res.json({
            success: true,
            data: {
                secret: newSecret,
                message: 'Webhook secret regenerated successfully',
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error regenerating webhook secret:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_SECRET_ERROR',
                message: 'Failed to regenerate webhook secret',
            },
        });
    }
});
exports.default = router;
const crypto_1 = __importDefault(require("crypto"));
//# sourceMappingURL=webhooks.js.map