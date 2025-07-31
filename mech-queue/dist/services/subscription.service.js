"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const subscription_model_1 = require("../models/subscription.model");
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
class SubscriptionService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!SubscriptionService.instance) {
            SubscriptionService.instance = new SubscriptionService();
        }
        return SubscriptionService.instance;
    }
    // Create a new subscription
    async createSubscription(data) {
        const subscription = new subscription_model_1.Subscription(data);
        await subscription.save();
        logger_1.default.info(`Created subscription ${subscription.id} for application ${subscription.applicationId}`);
        return subscription;
    }
    // Update a subscription
    async updateSubscription(id, applicationId, updates) {
        const subscription = await subscription_model_1.Subscription.findOneAndUpdate({ _id: id, applicationId }, updates, { new: true });
        if (subscription) {
            logger_1.default.info(`Updated subscription ${id}`);
        }
        return subscription;
    }
    // Delete a subscription
    async deleteSubscription(id, applicationId) {
        const result = await subscription_model_1.Subscription.deleteOne({ _id: id, applicationId });
        const deleted = result.deletedCount > 0;
        if (deleted) {
            logger_1.default.info(`Deleted subscription ${id}`);
        }
        return deleted;
    }
    // Get subscription by ID
    async getSubscription(id, applicationId) {
        return subscription_model_1.Subscription.findOne({ _id: id, applicationId });
    }
    // List subscriptions for an application
    async listSubscriptions(applicationId, filters) {
        const query = { applicationId };
        if (filters?.active !== undefined) {
            query.active = filters.active;
        }
        if (filters?.queue) {
            query['filters.queues'] = filters.queue;
        }
        return subscription_model_1.Subscription.find(query).sort({ createdAt: -1 });
    }
    // Find matching subscriptions for a job event
    async findMatchingSubscriptions(event) {
        const query = {
            applicationId: event.applicationId,
            active: true,
            events: event.status,
        };
        // Find all active subscriptions for this application and event type
        const subscriptions = await subscription_model_1.Subscription.find(query);
        // Filter by additional criteria
        return subscriptions.filter(sub => {
            // Check queue filter
            if (sub.filters.queues && sub.filters.queues.length > 0) {
                if (!sub.filters.queues.includes(event.queue)) {
                    return false;
                }
            }
            // Check status filter
            if (sub.filters.statuses && sub.filters.statuses.length > 0) {
                if (!sub.filters.statuses.includes(event.status)) {
                    return false;
                }
            }
            // Check metadata filters
            if (sub.filters.metadata) {
                const metadataFilters = Object.entries(sub.filters.metadata);
                for (const [key, value] of metadataFilters) {
                    if (event.metadata?.[key] !== value) {
                        return false;
                    }
                }
            }
            return true;
        });
    }
    // Trigger subscriptions for a job event
    async triggerSubscriptions(event) {
        try {
            const subscriptions = await this.findMatchingSubscriptions(event);
            if (subscriptions.length === 0) {
                return;
            }
            logger_1.default.info(`Found ${subscriptions.length} matching subscriptions for job ${event.jobId}`);
            // Trigger all matching subscriptions in parallel
            await Promise.all(subscriptions.map(sub => this.triggerSubscription(sub, event)));
        }
        catch (error) {
            logger_1.default.error('Error triggering subscriptions:', error);
        }
    }
    // Trigger a single subscription
    async triggerSubscription(subscription, event) {
        const maxAttempts = subscription.retryConfig?.maxAttempts || 3;
        const backoffMs = subscription.retryConfig?.backoffMs || 1000;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Subscription-Id': subscription.id,
                    'X-Job-Id': event.jobId,
                    'X-Job-Status': event.status,
                    'X-Application-Id': event.applicationId,
                    ...subscription.headers,
                };
                const payload = {
                    subscription: {
                        id: subscription.id,
                        name: subscription.name,
                    },
                    event: {
                        type: event.status,
                        timestamp: event.timestamp,
                    },
                    job: {
                        id: event.jobId,
                        queue: event.queue,
                        status: event.status,
                        data: event.data,
                        metadata: event.metadata,
                        result: event.result,
                        error: event.error,
                        progress: event.progress,
                    },
                };
                const response = await (0, axios_1.default)({
                    method: subscription.method,
                    url: subscription.endpoint,
                    headers,
                    data: payload,
                    timeout: 30000, // 30 second timeout
                });
                // Update subscription stats
                await subscription_model_1.Subscription.updateOne({ _id: subscription.id }, {
                    $set: { lastTriggeredAt: new Date() },
                    $inc: { triggerCount: 1 },
                });
                logger_1.default.info(`Successfully triggered subscription ${subscription.id} for job ${event.jobId}`);
                break; // Success, exit retry loop
            }
            catch (error) {
                logger_1.default.error(`Failed to trigger subscription ${subscription.id} (attempt ${attempt}/${maxAttempts}):`, error.message);
                if (attempt < maxAttempts) {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
                }
                else {
                    // Final attempt failed, consider deactivating subscription after too many failures
                    // This could be enhanced with a failure count threshold
                    logger_1.default.error(`Subscription ${subscription.id} failed after ${maxAttempts} attempts`);
                }
            }
        }
    }
    // Helper to validate subscription data
    validateSubscription(data) {
        const errors = [];
        if (!data.name) {
            errors.push('Name is required');
        }
        if (!data.endpoint) {
            errors.push('Endpoint URL is required');
        }
        else {
            try {
                new URL(data.endpoint);
            }
            catch {
                errors.push('Invalid endpoint URL');
            }
        }
        if (!data.events || data.events.length === 0) {
            errors.push('At least one event type must be specified');
        }
        return errors;
    }
}
exports.SubscriptionService = SubscriptionService;
//# sourceMappingURL=subscription.service.js.map