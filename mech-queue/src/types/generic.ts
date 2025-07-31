// Generic, domain-agnostic types for queue service

export interface Queue {
  name: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  options?: QueueOptions;
}

export interface QueueOptions {
  defaultJobOptions?: JobOptions;
  maxConcurrentJobs?: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed' | 'linear';
    delay: number;
    maxDelay?: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  timeout?: number;
}

export interface Job {
  id: string;
  queueName: string;
  data: any; // Completely agnostic payload
  options?: JobOptions;
  status: JobStatus;
  applicationId: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  progress?: number;
  result?: any;
  error?: string;
  attemptNumber?: number;
}

export type JobStatus = 
  | 'waiting'
  | 'active' 
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

export interface Worker {
  id: string;
  queueName: string;
  status: 'active' | 'idle' | 'disconnected';
  lastHeartbeat: Date;
  processingJob?: string;
  metadata?: {
    host?: string;
    version?: string;
    capabilities?: string[];
  };
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  workers: number;
}