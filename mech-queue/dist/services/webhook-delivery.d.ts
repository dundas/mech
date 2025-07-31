import { IWebhook } from '../models/webhook';
export interface WebhookPayload {
    event: string;
    timestamp: string;
    data: {
        jobId?: string;
        queue?: string;
        status?: string;
        result?: any;
        error?: string;
        progress?: number;
        application: {
            id: string;
            name: string;
        };
        [key: string]: any;
    };
}
export declare class WebhookDeliveryService {
    static deliverWebhook(webhook: IWebhook, payload: WebhookPayload, attempt?: number): Promise<boolean>;
    static generateSignature(payload: WebhookPayload, secret: string): string;
    static verifySignature(payload: string, signature: string, secret: string): boolean;
    static calculateBackoffDelay(attempt: number, initialDelay: number, multiplier: number): number;
    static testWebhook(webhook: IWebhook): Promise<{
        success: boolean;
        status?: number;
        error?: string;
        responseTime?: number;
    }>;
}
//# sourceMappingURL=webhook-delivery.d.ts.map