import mongoose, { Document } from 'mongoose';
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
export declare const Schedule: mongoose.Model<ISchedule, {}, {}, {}, mongoose.Document<unknown, {}, ISchedule, {}> & ISchedule & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=schedule.model.d.ts.map