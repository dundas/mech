import { Job } from 'bullmq';
interface WebhookJobData {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    data?: any;
    timeout?: number;
    retryOnFailure?: boolean;
    _metadata?: any;
}
export declare function webhookWorker(job: Job<WebhookJobData>): Promise<any>;
export {};
//# sourceMappingURL=webhook.d.ts.map