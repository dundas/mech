import { SubscriptionService } from '../src/services/subscription.service';
import { Subscription } from '../src/models/subscription.model';
import axios from 'axios';

// Mock dependencies
jest.mock('../src/models/subscription.model');
jest.mock('axios');
jest.mock('../src/utils/logger');

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = SubscriptionService.getInstance();
  });
  
  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        applicationId: 'app-123',
        name: 'Test Subscription',
        endpoint: 'https://example.com/webhook',
        save: jest.fn().mockResolvedValue({}),
      };
      
      (Subscription as any).mockImplementation(() => mockSubscription);
      
      const result = await service.createSubscription({
        applicationId: 'app-123',
        name: 'Test Subscription',
        endpoint: 'https://example.com/webhook',
        events: ['completed'],
      });
      
      expect(result).toBe(mockSubscription);
      expect(mockSubscription.save).toHaveBeenCalled();
    });
  });
  
  describe('findMatchingSubscriptions', () => {
    it('should find subscriptions matching event criteria', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          applicationId: 'app-123',
          active: true,
          events: ['completed'],
          filters: {
            queues: ['email'],
            metadata: { priority: 'high' },
          },
        },
        {
          id: 'sub-2',
          applicationId: 'app-123',
          active: true,
          events: ['completed'],
          filters: {
            queues: ['payment'],
            metadata: { priority: 'high' },
          },
        },
        {
          id: 'sub-3',
          applicationId: 'app-123',
          active: true,
          events: ['completed'],
          filters: {
            queues: ['email'],
            metadata: { priority: 'low' },
          },
        },
      ];
      
      (Subscription.find as jest.Mock).mockResolvedValue(mockSubscriptions);
      
      const event = {
        jobId: 'job-123',
        queue: 'email',
        status: 'completed',
        applicationId: 'app-123',
        data: {},
        metadata: { priority: 'high' },
        timestamp: new Date().toISOString(),
      };
      
      const matches = await service.findMatchingSubscriptions(event);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('sub-1');
    });
    
    it('should match subscriptions with wildcard filters', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          applicationId: 'app-123',
          active: true,
          events: ['completed'],
          filters: {}, // No filters - matches all
        },
      ];
      
      (Subscription.find as jest.Mock).mockResolvedValue(mockSubscriptions);
      
      const event = {
        jobId: 'job-123',
        queue: 'any-queue',
        status: 'completed',
        applicationId: 'app-123',
        data: {},
        metadata: { any: 'data' },
        timestamp: new Date().toISOString(),
      };
      
      const matches = await service.findMatchingSubscriptions(event);
      
      expect(matches).toHaveLength(1);
    });
  });
  
  describe('triggerSubscriptions', () => {
    it('should trigger matching subscriptions', async () => {
      const mockSubscription = {
        id: 'sub-123',
        name: 'Test Sub',
        endpoint: 'https://example.com/webhook',
        method: 'POST',
        headers: { 'X-Custom': 'header' },
        retryConfig: { maxAttempts: 1, backoffMs: 0 },
      };
      
      const event = {
        jobId: 'job-123',
        queue: 'email',
        status: 'completed',
        applicationId: 'app-123',
        data: { to: 'user@example.com' },
        metadata: { priority: 'high' },
        result: { messageId: 'msg-123' },
        timestamp: new Date().toISOString(),
      };
      
      // Mock finding matching subscriptions
      jest.spyOn(service, 'findMatchingSubscriptions').mockResolvedValue([mockSubscription as any]);
      
      // Mock axios post
      (axios as any).mockResolvedValue({ status: 200 });
      
      // Mock Subscription.updateOne
      (Subscription.updateOne as jest.Mock).mockResolvedValue({});
      
      await service.triggerSubscriptions(event);
      
      expect(axios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://example.com/webhook',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Subscription-Id': 'sub-123',
          'X-Job-Id': 'job-123',
          'X-Job-Status': 'completed',
          'X-Application-Id': 'app-123',
          'X-Custom': 'header',
        }),
        data: expect.objectContaining({
          subscription: {
            id: 'sub-123',
            name: 'Test Sub',
          },
          event: {
            type: 'completed',
            timestamp: event.timestamp,
          },
          job: expect.objectContaining({
            id: 'job-123',
            queue: 'email',
            status: 'completed',
            result: { messageId: 'msg-123' },
          }),
        }),
        timeout: 30000,
      });
      
      expect(Subscription.updateOne).toHaveBeenCalledWith(
        { _id: 'sub-123' },
        expect.objectContaining({
          $set: { lastTriggeredAt: expect.any(Date) },
          $inc: { triggerCount: 1 },
        })
      );
    });
    
    it('should retry failed webhook calls', async () => {
      const mockSubscription = {
        id: 'sub-123',
        name: 'Test Sub',
        endpoint: 'https://example.com/webhook',
        method: 'POST',
        retryConfig: { maxAttempts: 3, backoffMs: 100 },
      };
      
      const event = {
        jobId: 'job-123',
        queue: 'email',
        status: 'failed',
        applicationId: 'app-123',
        data: {},
        error: 'Connection timeout',
        timestamp: new Date().toISOString(),
      };
      
      jest.spyOn(service, 'findMatchingSubscriptions').mockResolvedValue([mockSubscription as any]);
      
      // Mock axios to fail twice then succeed
      (axios as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ status: 200 });
      
      (Subscription.updateOne as jest.Mock).mockResolvedValue({});
      
      await service.triggerSubscriptions(event);
      
      // Should have been called 3 times (2 failures + 1 success)
      expect(axios).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('validateSubscription', () => {
    it('should validate subscription data', () => {
      const validData = {
        name: 'Valid Subscription',
        endpoint: 'https://example.com/webhook',
        events: ['completed'],
      };
      
      const errors = service.validateSubscription(validData);
      expect(errors).toHaveLength(0);
    });
    
    it('should return errors for invalid data', () => {
      const invalidData = {
        endpoint: 'not-a-url',
        events: [],
      };
      
      const errors = service.validateSubscription(invalidData);
      expect(errors).toContain('Name is required');
      expect(errors).toContain('Invalid endpoint URL');
      expect(errors).toContain('At least one event type must be specified');
    });
  });
});