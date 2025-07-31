import mongoose, { Document, Schema } from 'mongoose';

export interface ISchedule extends Document {
  name: string;
  description?: string;
  schedule: {
    cron?: string;
    at?: Date;
    timezone?: string;
    endDate?: Date;
    limit?: number;
  };
  endpoint: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  };
  retryPolicy?: {
    attempts?: number;
    backoff?: {
      type: string;
      delay: number;
    };
  };
  enabled: boolean;
  createdBy: string;
  metadata?: Record<string, any>;
  lastExecutedAt?: Date;
  lastExecutionStatus?: 'success' | 'failed';
  lastExecutionError?: string;
  nextExecutionAt?: Date;
  executionCount: number;
  bullJobKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleSchema = new Schema<ISchedule>({
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  schedule: {
    cron: String,
    at: Date,
    timezone: {
      type: String,
      default: 'UTC'
    },
    endDate: Date,
    limit: Number
  },
  endpoint: {
    url: {
      type: String,
      required: true
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      required: true
    },
    headers: {
      type: Map,
      of: String
    },
    body: Schema.Types.Mixed,
    timeout: {
      type: Number,
      default: 30000 // 30 seconds
    }
  },
  retryPolicy: {
    attempts: {
      type: Number,
      default: 3
    },
    backoff: {
      type: {
        type: String,
        enum: ['exponential', 'fixed'],
        default: 'exponential'
      },
      delay: {
        type: Number,
        default: 5000
      }
    }
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  lastExecutedAt: Date,
  lastExecutionStatus: {
    type: String,
    enum: ['success', 'failed']
  },
  lastExecutionError: String,
  nextExecutionAt: Date,
  executionCount: {
    type: Number,
    default: 0
  },
  bullJobKey: String
}, {
  timestamps: true
});

// Compound indexes for efficient queries
ScheduleSchema.index({ name: 1 }, { unique: true });
ScheduleSchema.index({ createdBy: 1, enabled: 1 });
ScheduleSchema.index({ nextExecutionAt: 1, enabled: 1 });

export const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);