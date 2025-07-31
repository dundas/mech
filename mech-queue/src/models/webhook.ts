import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IWebhook extends Document {
  applicationId: string;
  url: string;
  events: string[];
  queues?: string[];
  secret?: string;
  active: boolean;
  headers?: Record<string, string>;
  retryConfig?: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

const WebhookSchema = new Schema({
  applicationId: {
    type: String,
    required: true,
    index: true,
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => {
        try {
          new URL(v);
          return true;
        } catch {
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
    type: Schema.Types.Mixed,
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

function generateWebhookSecret(): string {
  return `whsec_${Buffer.from(crypto.randomBytes(32)).toString('base64url')}`;
}

// Only create model if not already created (for hot reloading)
export default mongoose.models.Webhook || mongoose.model<IWebhook>('Webhook', WebhookSchema);

