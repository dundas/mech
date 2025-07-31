import { Queue, Worker } from 'bullmq';
import { QueueDefinition, WorkerDefinition, QueueStats } from '../types';
export declare class QueueManager {
    private static instance;
    private redis;
    private queues;
    private workers;
    private queueEvents;
    private queueDefinitions;
    private constructor();
    static getInstance(): QueueManager;
    registerQueue(definition: QueueDefinition): Queue;
    registerWorker(definition: WorkerDefinition): Worker;
    getQueue(name: string): Queue | undefined;
    getQueueStats(queueName: string): Promise<QueueStats | null>;
    getAllQueueStats(): Promise<QueueStats[]>;
    addJob(queueName: string, jobName: string, data: any, options?: any): Promise<string | null>;
    getJob(queueName: string, jobId: string): Promise<any>;
    pauseQueue(queueName: string): Promise<boolean>;
    resumeQueue(queueName: string): Promise<boolean>;
    cleanQueue(queueName: string, grace?: number): Promise<boolean>;
    shutdown(): Promise<void>;
    getRegisteredQueues(): string[];
    getQueueDefinition(queueName: string): QueueDefinition | undefined;
}
//# sourceMappingURL=queue-manager.d.ts.map