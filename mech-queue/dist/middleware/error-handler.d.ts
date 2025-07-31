import { Request, Response, NextFunction } from 'express';
export interface ErrorWithHints extends Error {
    code?: string;
    statusCode?: number;
    hints?: string[];
    possibleCauses?: string[];
    suggestedFixes?: string[];
    relatedEndpoints?: string[];
}
export declare function enhanceError(error: Error | ErrorWithHints, code: string, statusCode: number, hints?: string[], possibleCauses?: string[], suggestedFixes?: string[], relatedEndpoints?: string[]): ErrorWithHints;
export declare function errorHandler(err: ErrorWithHints, req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=error-handler.d.ts.map