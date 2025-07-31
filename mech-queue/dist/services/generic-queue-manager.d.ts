interface QueueConfig {
    redis: {
        host: string;
        port: number;
        password?: string;
    };
}
interface JobSubmission {
    queueName: string;
    data: any;
    options?: {
        priority?: number;
        delay?: number;
        attempts?: number;
    };
}
export declare class GenericQueueManager {
    private static instance;
    private queues;
    private redis;
    private constructor();
    static getInstance(config?: QueueConfig): GenericQueueManager;
    submitJob({ queueName, data, options }: JobSubmission): Promise<string>;
    getJobStatus(queueName: string, jobId: string): Promise<{
        id: string;
        status: string;
        data: any;
        result?: any;
        error?: string;
        progress?: number;
        timestamps: {
            created: number;
            processed?: number;
            completed?: number;
            failed?: number;
        };
    } | null>;
    getJobs(queueName: string, status?: string, limit?: number): Promise<any[]>;
    cancelJob(queueName: string, jobId: string): Promise<boolean>;
    getQueueStats(queueName: string): Promise<{
        name: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: boolean;
    } | null>;
    listQueues(): Promise<string[]>;
    pauseQueue(queueName: string): Promise<void>;
    resumeQueue(queueName: string): Promise<void>;
    cleanQueue(queueName: string, grace?: number, limit?: number, status?: 'completed' | 'failed'): Promise<string[]>;
    private getOrCreateQueue;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=generic-queue-manager.d.ts.map