interface JobSubmission {
    queue: string;
    data: any;
    metadata?: Record<string, any>;
    webhooks?: {
        onStarted?: string;
        onProgress?: string;
        onCompleted?: string;
        onFailed?: string;
        [key: string]: string | undefined;
    };
}
interface JobUpdate {
    jobId: string;
    status: string;
    progress?: number;
    result?: any;
    error?: string;
    metadata?: Record<string, any>;
}
interface JobFilter {
    queue?: string;
    status?: string;
    metadata?: Record<string, any>;
    limit?: number;
    offset?: number;
}
export declare class EnhancedJobTracker {
    private static instance;
    private queues;
    private queueEvents;
    private redis;
    private jobWebhooks;
    private jobMetadata;
    private constructor();
    static getInstance(config?: any): EnhancedJobTracker;
    submitJob({ queue, data, metadata, webhooks, }: JobSubmission): Promise<string>;
    updateJob(update: JobUpdate): Promise<void>;
    getJobStatus(jobId: string): Promise<any>;
    listJobs(applicationId: string, filters?: JobFilter): Promise<any[]>;
    setJobWebhooks(jobId: string, webhooks: Record<string, string>): Promise<void>;
    private triggerWebhook;
    searchJobsByMetadata(applicationId: string, metadataQuery: Record<string, any>, options?: {
        queue?: string;
        limit?: number;
    }): Promise<any[]>;
    getQueueStats(queueName: string, groupByMetadata?: string): Promise<any>;
    private getOrCreateQueue;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=enhanced-job-tracker.d.ts.map