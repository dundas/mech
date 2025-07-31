export interface CreateScheduleDto {
    name: string;
    description?: string;
    schedule: {
        cron?: string;
        at?: string;
        timezone?: string;
        endDate?: string;
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
            type: 'exponential' | 'fixed';
            delay: number;
        };
    };
    enabled?: boolean;
    metadata?: Record<string, any>;
    createdBy?: string;
}
export interface UpdateScheduleDto {
    name?: string;
    description?: string;
    schedule?: {
        cron?: string;
        at?: string;
        timezone?: string;
        endDate?: string;
        limit?: number;
    };
    endpoint?: {
        url?: string;
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        headers?: Record<string, string>;
        body?: any;
        timeout?: number;
    };
    retryPolicy?: {
        attempts?: number;
        backoff?: {
            type: 'exponential' | 'fixed';
            delay: number;
        };
    };
    enabled?: boolean;
    metadata?: Record<string, any>;
    updatedBy?: string;
}
export interface ScheduleResponse {
    id: string;
    name: string;
    description?: string;
    schedule: {
        cron?: string;
        at?: string;
        timezone?: string;
        endDate?: string;
        limit?: number;
    };
    endpoint: {
        url: string;
        method: string;
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
    lastExecutedAt?: string;
    lastExecutionStatus?: string;
    lastExecutionError?: string;
    nextExecutionAt?: string;
    executionCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface ScheduleListQuery {
    queueName?: string;
    enabled?: boolean;
    createdBy?: string;
    page?: number;
    limit?: number;
}
export interface ScheduleExecutionHistory {
    scheduleId: string;
    executedAt: Date;
    jobId: string;
    status: 'completed' | 'failed' | 'active';
    result?: any;
    error?: any;
    duration?: number;
}
//# sourceMappingURL=schedule.types.d.ts.map