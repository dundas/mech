import { Job } from 'bullmq';
export declare function imageProcessingWorker(job: Job): Promise<{
    success: boolean;
    message: string;
}>;
export declare function pdfGenerationWorker(job: Job): Promise<{
    success: boolean;
    message: string;
}>;
export declare function dataExportWorker(job: Job): Promise<{
    success: boolean;
    message: string;
}>;
export declare function scheduledTasksWorker(job: Job): Promise<{
    success: boolean;
    message: string;
}>;
export declare function notificationsWorker(job: Job): Promise<{
    success: boolean;
    message: string;
}>;
export declare function socialMediaWorker(job: Job): Promise<{
    success: boolean;
    message: string;
}>;
export declare function webScrapingWorker(job: Job): Promise<{
    success: boolean;
    message: string;
}>;
//# sourceMappingURL=stubs.d.ts.map