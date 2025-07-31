"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
const mongoose_1 = require("mongoose");
const subscriptionSchema = new mongoose_1.Schema({
    applicationId: {
        type: String,
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    description: String,
    endpoint: {
        type: String,
        required: true,
    },
    method: {
        type: String,
        enum: ['POST', 'PUT'],
        default: 'POST',
    },
    headers: {
        type: Map,
        of: String,
    },
    filters: {
        queues: [String],
        statuses: [String],
        metadata: {
            type: Map,
            of: mongoose_1.Schema.Types.Mixed,
        },
    },
    events: [{
            type: String,
            enum: ['created', 'started', 'progress', 'completed', 'failed'],
        }],
    active: {
        type: Boolean,
        default: true,
    },
    retryConfig: {
        maxAttempts: {
            type: Number,
            default: 3,
        },
        backoffMs: {
            type: Number,
            default: 1000,
        },
    },
    lastTriggeredAt: Date,
    triggerCount: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
// Indexes for efficient queries
subscriptionSchema.index({ applicationId: 1, active: 1 });
subscriptionSchema.index({ 'filters.queues': 1 });
subscriptionSchema.index({ 'filters.statuses': 1 });
exports.Subscription = (0, mongoose_1.model)('Subscription', subscriptionSchema);
//# sourceMappingURL=subscription.model.js.map