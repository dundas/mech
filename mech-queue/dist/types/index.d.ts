export interface Application {
    id: string;
    name: string;
    apiKey: string;
    settings?: {
        maxConcurrentJobs?: number;
        allowedQueues?: string[];
        metadata?: Record<string, any>;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface JobData {
    applicationId: string;
    type: string;
    payload: any;
    metadata?: {
        userId?: string;
        source?: string;
        priority?: number;
        [key: string]: any;
    };
}
export interface QueueDefinition {
    name: string;
    description: string;
    defaultJobOptions?: {
        attempts?: number;
        backoff?: {
            type: 'exponential' | 'fixed';
            delay: number;
        };
        removeOnComplete?: boolean | number;
        removeOnFail?: boolean | number;
    };
}
export interface WorkerDefinition {
    queueName: string;
    concurrency: number;
    processor: (job: any) => Promise<any>;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    metadata?: {
        timestamp: string;
        requestId: string;
    };
}
export interface JobStatus {
    id: string;
    queue: string;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    progress?: number;
    result?: any;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
}
export interface QueueStats {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
}
//# sourceMappingURL=index.d.ts.map