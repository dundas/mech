import { IWebhook } from '../models/webhook';
export declare class WebhookManager {
    private static instance;
    private queueEvents;
    private initialized;
    static getInstance(): WebhookManager;
    initialize(): Promise<void>;
    private setupQueueEventListeners;
    private triggerWebhooks;
    private findMatchingWebhooks;
    registerWebhook(webhookData: Partial<IWebhook>): Promise<IWebhook>;
    updateWebhook(webhookId: string, applicationId: string, updates: Partial<IWebhook>): Promise<IWebhook | null>;
    deleteWebhook(webhookId: string, applicationId: string): Promise<boolean>;
    getWebhooks(applicationId: string): Promise<IWebhook[]>;
    getWebhook(webhookId: string, applicationId: string): Promise<IWebhook | null>;
    testWebhook(webhookId: string, applicationId: string): Promise<{
        success: boolean;
        status?: number;
        error?: string;
        responseTime?: number;
    }>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=webhook-manager.d.ts.map