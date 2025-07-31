import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<any, {}, {}, {}, any, any>;
export default _default;
//# sourceMappingURL=webhook.d.ts.map