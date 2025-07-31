import { Job } from 'bullmq';
import { OpenAI } from 'openai';
interface AIProcessingJobData {
    type: 'completion' | 'embedding' | 'moderation' | 'image-generation';
    model?: string;
    prompt?: string;
    input?: string | string[];
    options?: any;
    _metadata?: any;
}
export declare function aiProcessingWorker(job: Job<AIProcessingJobData>): Promise<{
    content: string | null;
    usage: OpenAI.Completions.CompletionUsage | undefined;
    model: string;
} | {
    embeddings: number[][];
    usage: OpenAI.Embeddings.CreateEmbeddingResponse.Usage;
    model: string;
} | {
    results: OpenAI.Moderations.Moderation[];
    model: string;
} | {
    images: OpenAI.Images.Image[] | undefined;
    created: number;
}>;
export {};
//# sourceMappingURL=ai-processing.d.ts.map