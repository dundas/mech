import { Counter, Gauge, Histogram } from 'prom-client';
export declare const jobsSubmitted: Counter<"queue" | "application">;
export declare const jobsCompleted: Counter<"status" | "queue" | "application">;
export declare const jobDuration: Histogram<"queue" | "application">;
export declare const queueSize: Gauge<"queue" | "state">;
export declare const activeWorkers: Gauge<"queue">;
export declare const jobsDelivered: Counter<"status" | "application" | "event">;
export declare const webhookAttempts: Counter<"status" | "application" | "event" | "attempt">;
export declare function setupMetrics(): void;
//# sourceMappingURL=metrics.d.ts.map