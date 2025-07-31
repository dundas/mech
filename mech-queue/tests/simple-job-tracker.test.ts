import { SimpleJobTracker } from '../src/services/simple-job-tracker';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import axios from 'axios';

// Mock dependencies
jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      quit: jest.fn(),
    })),
    Redis: jest.fn().mockImplementation(() => ({
      quit: jest.fn(),
    })),
  };
});
jest.mock('bullmq');
jest.mock('axios');
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SimpleJobTracker', () => {
  let tracker: SimpleJobTracker;
  let mockRedis: any;
  let mockQueue: jest.Mocked<Queue>;
  let mockQueueEvents: jest.Mocked<QueueEvents>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (SimpleJobTracker as any).instance = undefined;
    
    // Setup mocks
    mockRedis = {
      quit: jest.fn(),
    };
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
      getJob: jest.fn(),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      name: 'test-queue',
    } as any;
    
    mockQueueEvents = {
      on: jest.fn(),
    } as any;
    
    (Queue as jest.MockedClass<typeof Queue>).mockImplementation(() => mockQueue);
    (QueueEvents as jest.MockedClass<typeof QueueEvents>).mockImplementation(() => mockQueueEvents);
    
    tracker = SimpleJobTracker.getInstance({ host: 'localhost', port: 6379 });
  });

  describe('submitJob', () => {
    it('should submit a job with basic data', async () => {
      const jobId = await tracker.submitJob('test-queue', {
        task: 'send-email',
        to: 'user@example.com',
      });

      expect(jobId).toBeDefined();
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          task: 'send-email',
          to: 'user@example.com',
          _jobId: expect.any(String),
          _submittedAt: expect.any(String),
        }),
        { jobId: expect.any(String) }
      );
    });

    it('should submit a job with metadata', async () => {
      const jobId = await tracker.submitJob(
        'test-queue',
        { task: 'process-order' },
        {
          metadata: {
            priority: 'high',
            customerId: 'cust-123',
            orderId: 'order-456',
          },
        }
      );

      expect(jobId).toBeDefined();
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          task: 'process-order',
          _metadata: {
            priority: 'high',
            customerId: 'cust-123',
            orderId: 'order-456',
          },
        }),
        expect.any(Object)
      );
    });

    it('should submit a job with webhooks', async () => {
      const webhooks = {
        completed: 'https://example.com/webhook/completed',
        failed: 'https://example.com/webhook/failed',
      };

      const jobId = await tracker.submitJob(
        'test-queue',
        { task: 'generate-report' },
        { webhooks }
      );

      expect(jobId).toBeDefined();
      // Verify webhooks are stored (internal state)
      const storedWebhooks = (tracker as any).jobWebhooks.get(jobId);
      expect(storedWebhooks).toEqual(webhooks);
    });
  });

  describe('updateJob', () => {
    it('should update job progress', async () => {
      const mockJob = {
        updateProgress: jest.fn(),
        token: 'test-token',
      };
      mockQueue.getJob.mockResolvedValueOnce(mockJob as any);
      
      // Make sure the queue is registered in the tracker
      (tracker as any).queues.set('test-queue', mockQueue);

      await tracker.updateJob({
        jobId: 'test-job-id',
        status: 'progress',
        progress: 50,
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
    });

    it('should mark job as completed', async () => {
      const mockJob = {
        moveToCompleted: jest.fn(),
        token: 'test-token',
      };
      mockQueue.getJob.mockResolvedValueOnce(mockJob as any);
      
      // Make sure the queue is registered in the tracker
      (tracker as any).queues.set('test-queue', mockQueue);

      const result = { success: true, data: 'test' };
      await tracker.updateJob({
        jobId: 'test-job-id',
        status: 'completed',
        result,
      });

      expect(mockJob.moveToCompleted).toHaveBeenCalledWith(result, 'test-token');
    });

    it('should mark job as failed', async () => {
      const mockJob = {
        moveToFailed: jest.fn(),
        token: 'test-token',
      };
      mockQueue.getJob.mockResolvedValueOnce(mockJob as any);
      
      // Make sure the queue is registered in the tracker
      (tracker as any).queues.set('test-queue', mockQueue);

      await tracker.updateJob({
        jobId: 'test-job-id',
        status: 'failed',
        error: 'Something went wrong',
      });

      expect(mockJob.moveToFailed).toHaveBeenCalledWith(
        new Error('Something went wrong'),
        'test-token'
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return job status with all details', async () => {
      const mockJob = {
        id: 'test-job-id',
        data: {
          task: 'send-email',
          _submittedAt: '2024-01-01T00:00:00Z',
          _metadata: { priority: 'high' },
        },
        returnvalue: { messageId: 'msg-123' },
        failedReason: null,
        progress: 100,
        getState: jest.fn().mockResolvedValue('completed'),
      };

      mockQueue.getJob.mockResolvedValueOnce(mockJob as any);
      
      // Make sure the queue is registered in the tracker
      (tracker as any).queues.set('test-queue', mockQueue);

      const status = await tracker.getJobStatus('test-job-id');

      expect(status).toEqual({
        id: 'test-job-id',
        queue: 'test-queue',
        status: 'completed',
        data: mockJob.data,
        metadata: { priority: 'high' },
        result: { messageId: 'msg-123' },
        error: null,
        progress: 100,
        updates: [],
        webhooks: undefined,
        timestamps: {
          submitted: '2024-01-01T00:00:00Z',
        },
      });
    });

    it('should return null for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);

      const status = await tracker.getJobStatus('non-existent');

      expect(status).toBeNull();
    });
  });

  describe('listJobs with metadata filtering', () => {
    it('should filter jobs by metadata', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          data: {
            _applicationId: 'app-123',
            _metadata: { priority: 'high', type: 'email' },
            _submittedAt: '2024-01-01T00:00:00Z',
          },
          getState: jest.fn().mockResolvedValue('completed'),
        },
        {
          id: 'job-2',
          data: {
            _applicationId: 'app-123',
            _metadata: { priority: 'low', type: 'email' },
            _submittedAt: '2024-01-01T00:01:00Z',
          },
          getState: jest.fn().mockResolvedValue('completed'),
        },
        {
          id: 'job-3',
          data: {
            _applicationId: 'app-123',
            _metadata: { priority: 'high', type: 'report' },
            _submittedAt: '2024-01-01T00:02:00Z',
          },
          getState: jest.fn().mockResolvedValue('completed'),
        },
      ];

      mockQueue.getCompleted.mockResolvedValueOnce(mockJobs as any);
      
      // Make sure the queue is registered in the tracker
      (tracker as any).queues.set('test-queue', mockQueue);

      // Filter by priority=high
      const highPriorityJobs = await tracker.listJobs('app-123', {
        status: 'completed',
        metadata: { priority: 'high' },
      });

      expect(highPriorityJobs).toHaveLength(2);
      expect(highPriorityJobs.map(j => j.id)).toEqual(['job-1', 'job-3']);

      // Mock getCompleted again for the second call
      mockQueue.getCompleted.mockResolvedValueOnce(mockJobs as any);

      // Filter by type=email
      const emailJobs = await tracker.listJobs('app-123', {
        status: 'completed',
        metadata: { type: 'email' },
      });

      expect(emailJobs).toHaveLength(2);
      expect(emailJobs.map(j => j.id)).toEqual(['job-1', 'job-2']);
    });

    it('should filter by multiple metadata fields', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          data: {
            _applicationId: 'app-123',
            _metadata: { priority: 'high', type: 'email', customerId: 'cust-1' },
            _submittedAt: '2024-01-01T00:00:00Z',
          },
          getState: jest.fn().mockResolvedValue('completed'),
        },
        {
          id: 'job-2',
          data: {
            _applicationId: 'app-123',
            _metadata: { priority: 'high', type: 'report', customerId: 'cust-1' },
            _submittedAt: '2024-01-01T00:01:00Z',
          },
          getState: jest.fn().mockResolvedValue('completed'),
        },
      ];

      mockQueue.getCompleted.mockResolvedValueOnce(mockJobs as any);
      
      // Make sure the queue is registered in the tracker
      (tracker as any).queues.set('test-queue', mockQueue);

      const filteredJobs = await tracker.listJobs('app-123', {
        status: 'completed',
        metadata: { priority: 'high', type: 'email' },
      });

      expect(filteredJobs).toHaveLength(1);
      expect(filteredJobs[0].id).toBe('job-1');
    });
  });

  describe('webhook functionality', () => {
    beforeEach(() => {
      (axios.post as jest.Mock).mockResolvedValue({ data: 'ok' });
    });

    it('should trigger webhook on job started', async () => {
      // Submit job with webhooks
      const jobId = await tracker.submitJob(
        'test-queue',
        { task: 'test' },
        {
          webhooks: {
            started: 'https://example.com/webhook/started',
          },
        }
      );

      // Simulate job started event
      const startedHandler = mockQueueEvents.on.mock.calls.find(
        call => call[0] === 'active'
      )?.[1] as any;
      
      if (startedHandler) {
        await startedHandler({ jobId }, 'test-job-id');
      }

      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook/started',
        expect.objectContaining({
          jobId,
          status: 'started',
          timestamp: expect.any(String),
        }),
        expect.objectContaining({
          timeout: 5000,
          headers: expect.objectContaining({
            'X-Job-Id': jobId,
            'X-Job-Status': 'started',
          }),
        })
      );
    });

    it('should trigger webhook on job progress', async () => {
      const jobId = await tracker.submitJob(
        'test-queue',
        { task: 'test' },
        {
          webhooks: {
            progress: 'https://example.com/webhook/progress',
          },
        }
      );

      // Simulate progress event
      const progressHandler = mockQueueEvents.on.mock.calls.find(
        call => call[0] === 'progress'
      )?.[1] as any;
      
      if (progressHandler) {
        await progressHandler({ jobId, data: 50 }, 'test-job-id');
      }

      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook/progress',
        expect.objectContaining({
          jobId,
          status: 'progress',
          progress: 50,
        }),
        expect.any(Object)
      );
    });

    it('should trigger wildcard webhook for any status', async () => {
      const jobId = await tracker.submitJob(
        'test-queue',
        { task: 'test' },
        {
          webhooks: {
            '*': 'https://example.com/webhook/all',
          },
        }
      );

      // Simulate completed event
      const completedHandler = mockQueueEvents.on.mock.calls.find(
        call => call[0] === 'completed'
      )?.[1] as any;
      
      if (completedHandler) {
        await completedHandler({ jobId, returnvalue: { success: true } }, 'test-job-id');
      }

      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook/all',
        expect.objectContaining({
          jobId,
          status: 'completed',
          result: { success: true },
        }),
        expect.any(Object)
      );
    });

    it('should handle webhook failures gracefully', async () => {
      (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const jobId = await tracker.submitJob(
        'test-queue',
        { task: 'test' },
        {
          webhooks: {
            completed: 'https://example.com/webhook/completed',
          },
        }
      );

      // Simulate completed event
      const completedHandler = mockQueueEvents.on.mock.calls.find(
        call => call[0] === 'completed'
      )?.[1] as any;
      
      // Should not throw even if webhook fails
      if (completedHandler) {
        // Call should not throw even with failure
        await completedHandler({ jobId, returnvalue: { success: true } }, 'test-job-id');
        // Test passed if we reach here without throwing
      }
    });
  });

  describe('registerWebhook', () => {
    it('should add new webhooks to existing job', async () => {
      const jobId = await tracker.submitJob(
        'test-queue',
        { task: 'test' },
        {
          webhooks: {
            completed: 'https://example.com/webhook/completed',
          },
        }
      );

      await tracker.registerWebhook(jobId, {
        failed: 'https://example.com/webhook/failed',
        progress: 'https://example.com/webhook/progress',
      });

      const webhooks = (tracker as any).jobWebhooks.get(jobId);
      expect(webhooks).toEqual({
        completed: 'https://example.com/webhook/completed',
        failed: 'https://example.com/webhook/failed',
        progress: 'https://example.com/webhook/progress',
      });
    });
  });
});