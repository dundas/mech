import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    application?: {
        id: string;
        name: string;
        settings?: any;
    };
}
export declare function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
export declare function requireQueue(queueName: string): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map