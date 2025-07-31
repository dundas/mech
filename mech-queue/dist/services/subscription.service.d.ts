import { ISubscription } from '../models/subscription.model';
interface JobEvent {
    jobId: string;
    queue: string;
    status: string;
    applicationId: string;
    data: any;
    metadata?: Record<string, any>;
    result?: any;
    error?: string;
    progress?: number;
    timestamp: string;
}
export declare class SubscriptionService {
    private static instance;
    private constructor();
    static getInstance(): SubscriptionService;
    createSubscription(data: Partial<ISubscription>): Promise<ISubscription>;
    updateSubscription(id: string, applicationId: string, updates: Partial<ISubscription>): Promise<ISubscription | null>;
    deleteSubscription(id: string, applicationId: string): Promise<boolean>;
    getSubscription(id: string, applicationId: string): Promise<ISubscription | null>;
    listSubscriptions(applicationId: string, filters?: {
        active?: boolean;
        queue?: string;
    }): Promise<ISubscription[]>;
    findMatchingSubscriptions(event: JobEvent): Promise<ISubscription[]>;
    triggerSubscriptions(event: JobEvent): Promise<void>;
    private triggerSubscription;
    validateSubscription(data: Partial<ISubscription>): string[];
}
export {};
//# sourceMappingURL=subscription.service.d.ts.map