import { Document } from 'mongoose';
export interface ISubscription extends Document {
    applicationId: string;
    name: string;
    description?: string;
    endpoint: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    filters: {
        queues?: string[];
        statuses?: string[];
        metadata?: Record<string, any>;
    };
    events: string[];
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
export declare const Subscription: import("mongoose").Model<ISubscription, {}, {}, {}, Document<unknown, {}, ISubscription, {}> & ISubscription & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=subscription.model.d.ts.map