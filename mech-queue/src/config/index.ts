import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3003'),
  
  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),
  
  // MongoDB Configuration (optional, for persistent storage)
  MONGODB_URI: z.string().optional(),
  
  // Security
  API_KEY_HEADER: z.string().default('x-api-key'),
  MASTER_API_KEY: z.string().optional(),
  ENABLE_API_KEY_AUTH: z.string().default('true'),
  
  // Worker Configuration
  MAX_WORKERS_PER_QUEUE: z.string().default('5'),
  DEFAULT_JOB_ATTEMPTS: z.string().default('3'),
  DEFAULT_JOB_BACKOFF_DELAY: z.string().default('1000'),
  
  // Queue Configuration
  REMOVE_COMPLETED_JOBS_AFTER: z.string().default('3600'), // 1 hour in seconds
  REMOVE_FAILED_JOBS_AFTER: z.string().default('86400'), // 24 hours in seconds
  
  // Service Integrations
  OPENAI_API_KEY: z.string().optional(),
  
  // Monitoring
  ENABLE_PROMETHEUS_METRICS: z.string().default('false'),
  METRICS_PORT: z.string().default('3004'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug']).default('info'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});

// Parse and validate environment variables
const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
  console.error('❌ Invalid environment variables:', envParsed.error.format());
  throw new Error('Invalid environment variables');
}

const env = envParsed.data;

export const config = {
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
} as const;

export type Config = typeof config;