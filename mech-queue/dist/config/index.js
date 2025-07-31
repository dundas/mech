"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    // Server Configuration
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('3003'),
    // Redis Configuration
    REDIS_HOST: zod_1.z.string().default('localhost'),
    REDIS_PORT: zod_1.z.string().default('6379'),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    REDIS_DB: zod_1.z.string().default('0'),
    // MongoDB Configuration (optional, for persistent storage)
    MONGODB_URI: zod_1.z.string().optional(),
    // Security
    API_KEY_HEADER: zod_1.z.string().default('x-api-key'),
    MASTER_API_KEY: zod_1.z.string().optional(),
    ENABLE_API_KEY_AUTH: zod_1.z.string().default('true'),
    // Worker Configuration
    MAX_WORKERS_PER_QUEUE: zod_1.z.string().default('5'),
    DEFAULT_JOB_ATTEMPTS: zod_1.z.string().default('3'),
    DEFAULT_JOB_BACKOFF_DELAY: zod_1.z.string().default('1000'),
    // Queue Configuration
    REMOVE_COMPLETED_JOBS_AFTER: zod_1.z.string().default('3600'), // 1 hour in seconds
    REMOVE_FAILED_JOBS_AFTER: zod_1.z.string().default('86400'), // 24 hours in seconds
    // Service Integrations
    OPENAI_API_KEY: zod_1.z.string().optional(),
    // Monitoring
    ENABLE_PROMETHEUS_METRICS: zod_1.z.string().default('false'),
    METRICS_PORT: zod_1.z.string().default('3004'),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug']).default('info'),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default('60000'), // 1 minute
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().default('100'),
});
// Parse and validate environment variables
const envParsed = envSchema.safeParse(process.env);
if (!envParsed.success) {
    console.error('❌ Invalid environment variables:', envParsed.error.format());
    throw new Error('Invalid environment variables');
}
const env = envParsed.data;
exports.config = {
    env: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    redis: {
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT, 10),
        password: env.REDIS_PASSWORD,
        db: parseInt(env.REDIS_DB, 10),
    },
    mongodb: {
        uri: env.MONGODB_URI,
    },
    security: {
        apiKeyHeader: env.API_KEY_HEADER,
        masterApiKey: env.MASTER_API_KEY,
        enableApiKeyAuth: env.ENABLE_API_KEY_AUTH === 'true',
    },
    workers: {
        maxWorkersPerQueue: parseInt(env.MAX_WORKERS_PER_QUEUE, 10),
        defaultJobAttempts: parseInt(env.DEFAULT_JOB_ATTEMPTS, 10),
        defaultJobBackoffDelay: parseInt(env.DEFAULT_JOB_BACKOFF_DELAY, 10),
    },
    queues: {
        removeCompletedJobsAfter: parseInt(env.REMOVE_COMPLETED_JOBS_AFTER, 10),
        removeFailedJobsAfter: parseInt(env.REMOVE_FAILED_JOBS_AFTER, 10),
    },
    services: {
        openaiApiKey: env.OPENAI_API_KEY,
    },
    monitoring: {
        enablePrometheus: env.ENABLE_PROMETHEUS_METRICS === 'true',
        metricsPort: parseInt(env.METRICS_PORT, 10),
    },
    logging: {
        level: env.LOG_LEVEL,
    },
    rateLimit: {
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
        maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
    },
};
//# sourceMappingURL=index.js.map