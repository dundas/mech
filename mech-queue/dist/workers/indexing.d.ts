import { Job } from 'bullmq';
interface IndexingJobData {
    fileId: string;
    applicationId: string;
    tenantId?: string;
    filePath: string;
    fileType: string;
    contentType: string;
    options: {
        forceReindex?: boolean;
        extractText?: boolean;
        generateEmbeddings?: boolean;
        analyzeStructure?: boolean;
        generateThumbnails?: boolean;
        embeddingModel?: string;
        chunkSize?: number;
        customOptions?: Record<string, any>;
    };
    priority: 'low' | 'medium' | 'high' | 'urgent';
    metadata?: Record<string, any>;
    _metadata?: any;
}
export declare function indexingWorker(job: Job<IndexingJobData>): Promise<{
    fileId: string;
    status: string;
    result: any;
    metrics: {
        processingTimeMs: number;
        fileSize: any;
        textLength: any;
        embeddingCount: any;
    };
}>;
export {};
//# sourceMappingURL=indexing.d.ts.map