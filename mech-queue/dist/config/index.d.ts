export declare const config: {
    readonly env: "development" | "production" | "test";
    readonly port: number;
    readonly redis: {
        readonly host: string;
        readonly port: number;
        readonly password: string | undefined;
        readonly db: number;
    };
    readonly mongodb: {
        readonly uri: string | undefined;
    };
    readonly security: {
        readonly apiKeyHeader: string;
        readonly masterApiKey: string | undefined;
        readonly enableApiKeyAuth: boolean;
    };
    readonly workers: {
        readonly maxWorkersPerQueue: number;
        readonly defaultJobAttempts: number;
        readonly defaultJobBackoffDelay: number;
    };
    readonly queues: {
        readonly removeCompletedJobsAfter: number;
        readonly removeFailedJobsAfter: number;
    };
    readonly services: {
        readonly openaiApiKey: string | undefined;
    };
    readonly monitoring: {
        readonly enablePrometheus: boolean;
        readonly metricsPort: number;
    };
    readonly logging: {
        readonly level: "error" | "warn" | "info" | "http" | "verbose" | "debug";
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly maxRequests: number;
    };
};
export type Config = typeof config;
//# sourceMappingURL=index.d.ts.map