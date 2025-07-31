import { Schema, model, Document } from 'mongoose';

export interface ISubscription extends Document {
  applicationId: string;
  name: string;
  description?: string;
  endpoint: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  filters: {
    queues?: string[];              // Filter by queue names
    statuses?: string[];           // Filter by job statuses
    metadata?: Record<string, any>; // Filter by metadata fields
  };
  events: string[];                // Events to subscribe to: 'created', 'started', 'progress', 'completed', 'failed'
  active: boolean;
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

const subscriptionSchema = new Schema<ISubscription>({
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
      of: Schema.Types.Mixed,
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

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);