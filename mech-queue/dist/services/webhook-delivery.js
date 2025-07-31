"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookDeliveryService = void 0;
const axios_1 = __importStar(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const metrics_1 = require("../monitoring/metrics");
class WebhookDeliveryService {
    static async deliverWebhook(webhook, payload, attempt = 1) {
        try {
            const signature = this.generateSignature(payload, webhook.secret);
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'QueueService-Webhooks/1.0',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': payload.event,
                'X-Webhook-Timestamp': payload.timestamp,
                'X-Webhook-Attempt': attempt.toString(),
                ...webhook.headers,
            };
            logger_1.default.info(`Delivering webhook ${webhook._id} (attempt ${attempt}):`, {
                url: webhook.url,
                event: payload.event,
                jobId: payload.data.jobId,
            });
            const response = await axios_1.default.post(webhook.url, payload, {
                headers,
                timeout: 30000,
                validateStatus: (status) => status >= 200 && status < 300,
            });
            // Mark as successful
            webhook.lastTriggeredAt = new Date();
            webhook.failureCount = 0;
            await webhook.save();
            metrics_1.jobsDelivered.inc({
                application: payload.data.application.id,
                event: payload.event,
                status: 'success',
            });
            logger_1.default.info(`Webhook delivered successfully:`, {
                webhookId: webhook._id,
                status: response.status,
                event: payload.event,
            });
            return true;
        }
        catch (error) {
            const isAxiosError = error instanceof axios_1.AxiosError;
            const statusCode = isAxiosError ? error.response?.status : 0;
            const responseData = isAxiosError ? error.response?.data : null;
            logger_1.default.error(`Webhook delivery failed (attempt ${attempt}):`, {
                webhookId: webhook._id,
                url: webhook.url,
                error: error instanceof Error ? error.message : String(error),
                statusCode,
                responseData,
            });
            metrics_1.webhookAttempts.inc({
                application: payload.data.application.id,
                event: payload.event,
                status: 'failed',
                attempt: attempt.toString(),
            });
            // Update failure count
            webhook.failureCount += 1;
            await webhook.save();
            // Don't retry on client errors (4xx)
            if (statusCode && statusCode >= 400 && statusCode < 500) {
                logger_1.default.warn(`Webhook delivery aborted due to client error (${statusCode}):`, {
                    webhookId: webhook._id,
                    url: webhook.url,
                });
                return false;
            }
            // Retry if within limits
            if (attempt < webhook.retryConfig.maxAttempts) {
                const delay = this.calculateBackoffDelay(attempt, webhook.retryConfig.initialDelay, webhook.retryConfig.backoffMultiplier);
                logger_1.default.info(`Scheduling webhook retry in ${delay}ms:`, {
                    webhookId: webhook._id,
                    attempt: attempt + 1,
                    maxAttempts: webhook.retryConfig.maxAttempts,
                });
                setTimeout(() => {
                    this.deliverWebhook(webhook, payload, attempt + 1);
                }, delay);
                return false;
            }
            // Disable webhook after too many failures
            if (webhook.failureCount >= 10) {
                webhook.active = false;
                await webhook.save();
                logger_1.default.warn(`Webhook disabled due to excessive failures:`, {
                    webhookId: webhook._id,
                    url: webhook.url,
                    failureCount: webhook.failureCount,
                });
            }
            return false;
        }
    }
    static generateSignature(payload, secret) {
        const payloadString = JSON.stringify(payload);
        return crypto_1.default
            .createHmac('sha256', secret)
            .update(payloadString)
            .digest('hex');
    }
    static verifySignature(payload, signature, secret) {
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    static calculateBackoffDelay(attempt, initialDelay, multiplier) {
        // Exponential backoff with jitter
        const baseDelay = initialDelay * Math.pow(multiplier, attempt - 1);
        const jitter = Math.random() * 0.1 * baseDelay;
        return Math.min(baseDelay + jitter, 60000); // Max 1 minute
    }
    static async testWebhook(webhook) {
        const testPayload = {
            event: 'webhook.test',
            timestamp: new Date().toISOString(),
            data: {
                application: {
                    id: webhook.applicationId,
                    name: 'Test',
                },
                message: 'This is a test webhook delivery',
                testId: crypto_1.default.randomUUID(),
            },
        };
        const startTime = Date.now();
        try {
            await this.deliverWebhook(webhook, testPayload);
            return {
                success: true,
                responseTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                responseTime: Date.now() - startTime,
            };
        }
    }
}
exports.WebhookDeliveryService = WebhookDeliveryService;
//# sourceMappingURL=webhook-delivery.js.map