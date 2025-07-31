import { Job } from 'bullmq';
interface EmailJobData {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
    from?: string;
    attachments?: Array<{
        filename: string;
        content: string | Buffer;
        contentType?: string;
    }>;
    _metadata?: any;
}
export declare function emailWorker(job: Job<EmailJobData>): Promise<{
    success: boolean;
    messageId: string;
    sentAt: string;
}>;
export {};
//# sourceMappingURL=email.d.ts.map