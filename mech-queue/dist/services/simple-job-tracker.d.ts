interface JobUpdate {
    jobId: string;
    status: 'started' | 'progress' | 'completed' | 'failed';
    progress?: number;
    result?: any;
    error?: string;
    metadata?: any;
    timestamp?: string;
}
export declare class SimpleJobTracker {
    private static instance;
    private queues;
    private queueEvents;
    private redis;
    private jobUpdates;
    private jobWebhooks;
    private jobMetadata;
    private subscriptionService;
    private constructor();
    static getInstance(config?: any): SimpleJobTracker;
    submitJob(queueName: string, data: any, options?: {
        metadata?: Record<string, any>;
        webhooks?: Record<string, string>;
    }): Promise<string>;
    updateJob(update: JobUpdate): Promise<void>;
    getJobStatus(jobId: string): Promise<{
        id: string;
        queue?: string;
        status: string;
        data: any;
        metadata?: Record<string, any>;
        result?: any;
        error?: string;
        progress?: number;
        updates: JobUpdate[];
        webhooks?: Record<string, string>;
        timestamps: {
            submitted?: string;
            started?: string;
            completed?: string;
            failed?: string;
        };
    } | null>;
    listJobs(applicationId: string, options?: {
        queue?: string;
        status?: string;
        metadata?: Record<string, any>;
        limit?: number;
    }): Promise<Array<{
        id: string;
        queue: string;
        status: string;
        submittedAt: string;
        data: any;
        metadata?: Record<string, any>;
    }>>;
    registerWebhook(jobId: string, webhooks: Record<string, string>): Promise<void>;
    private triggerWebhook;
    private getOrCreateQueue;
    shutdown(): Promise<void>;
    private triggerSubscriptionEvent;
}
export {};
//# sourceMappingURL=simple-job-tracker.d.ts.map