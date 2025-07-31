import { Request } from 'express';
export interface AIContext {
    endpoint: string;
    method: string;
    error?: string;
    data?: any;
}
export declare class AIHelper {
    static generateSuggestion(context: AIContext): string[];
    static getErrorSuggestions(error: string): string[];
    static generateExample(queueName: string): any;
    static explainJobStatus(status: string): string;
    static generateCurlExample(method: string, endpoint: string, apiKey?: string, data?: any): string;
    static generateSDKExample(language: 'javascript' | 'python', method: string, endpoint: string, data?: any): string;
}
export declare function extractContextFromRequest(req: Request): AIContext;
//# sourceMappingURL=ai-helpers.d.ts.map