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
const mongoose_1 = __importStar(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const WebhookSchema = new mongoose_1.Schema({
    applicationId: {
        type: String,
        required: true,
        index: true,
    },
    url: {
        type: String,
        required: true,
        validate: {
            validator: (v) => {
                try {
                    new URL(v);
                    return true;
                }
                catch {
                    return false;
                }
            },
            message: 'Invalid webhook URL',
        },
    },
    events: {
        type: [String],
        required: true,
        enum: [
            'job.created',
            'job.started',
            'job.completed',
            'job.failed',
            'job.retrying',
            'job.progress',
            'job.stalled',
            'queue.paused',
            'queue.resumed',
        ],
    },
    queues: {
        type: [String],
        default: ['*'], // All queues by default
    },
    secret: {
        type: String,
        default: () => generateWebhookSecret(),
    },
    active: {
        type: Boolean,
        default: true,
    },
    headers: {
        type: Map,
        of: String,
        default: {},
    },
    retryConfig: {
        maxAttempts: {
            type: Number,
            default: 3,
        },
        backoffMultiplier: {
            type: Number,
            default: 2,
        },
        initialDelay: {
            type: Number,
            default: 1000,
        },
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    lastTriggeredAt: Date,
    failureCount: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
// Indexes for efficient querying
WebhookSchema.index({ applicationId: 1, active: 1 });
WebhookSchema.index({ events: 1, queues: 1 });
function generateWebhookSecret() {
    return `whsec_${Buffer.from(crypto_1.default.randomBytes(32)).toString('base64url')}`;
}
// Only create model if not already created (for hot reloading)
exports.default = mongoose_1.default.models.Webhook || mongoose_1.default.model('Webhook', WebhookSchema);
//# sourceMappingURL=webhook.js.map