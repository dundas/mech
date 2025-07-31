export declare class ApiError extends Error {
    statusCode: number;
    message: string;
    details?: any | undefined;
    constructor(statusCode: number, message: string, details?: any | undefined);
}
export declare class ValidationError extends ApiError {
    constructor(message: string, details?: any);
}
export declare class NotFoundError extends ApiError {
    constructor(message: string, details?: any);
}
export declare class UnauthorizedError extends ApiError {
    constructor(message: string, details?: any);
}
export declare class ConflictError extends ApiError {
    constructor(message: string, details?: any);
}
//# sourceMappingURL=errors.d.ts.map