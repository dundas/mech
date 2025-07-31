import { Subscription, ISubscription } from '../models/subscription.model';
import axios from 'axios';
import logger from '../utils/logger';

interface SubscriptionFilter {
  applicationId?: string;
  active?: boolean;
  queue?: string;
  status?: string;
  metadata?: Record<string, any>;
}

interface JobEvent {
  jobId: string;
  queue: string;
  status: string;
  applicationId: string;
  data: any;
  metadata?: Record<string, any>;
  result?: any;
  error?: string;
  progress?: number;
  timestamp: string;
}

export class SubscriptionService {
  private static instance: SubscriptionService;

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  // Create a new subscription
  async createSubscription(data: Partial<ISubscription>): Promise<ISubscription> {
    const subscription = new Subscription(data);
    await subscription.save();
    logger.info(`Created subscription ${subscription.id} for application ${subscription.applicationId}`);
    return subscription;
  }

  // Update a subscription
  async updateSubscription(
    id: string,
    applicationId: string,
    updates: Partial<ISubscription>
  ): Promise<ISubscription | null> {
    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, applicationId },
      updates,
      { new: true }
    );
    
    if (subscription) {
      logger.info(`Updated subscription ${id}`);
    }
    
    return subscription;
  }

  // Delete a subscription
  async deleteSubscription(id: string, applicationId: string): Promise<boolean> {
    const result = await Subscription.deleteOne({ _id: id, applicationId });
    const deleted = result.deletedCount > 0;
    
    if (deleted) {
      logger.info(`Deleted subscription ${id}`);
    }
    
    return deleted;
  }

  // Get subscription by ID
  async getSubscription(id: string, applicationId: string): Promise<ISubscription | null> {
    return Subscription.findOne({ _id: id, applicationId });
  }

  // List subscriptions for an application
  async listSubscriptions(
    applicationId: string,
    filters?: { active?: boolean; queue?: string }
  ): Promise<ISubscription[]> {
    const query: any = { applicationId };
    
    if (filters?.active !== undefined) {
      query.active = filters.active;
    }
    
    if (filters?.queue) {
      query['filters.queues'] = filters.queue;
    }
    
    return Subscription.find(query).sort({ createdAt: -1 });
  }

  // Find matching subscriptions for a job event
  async findMatchingSubscriptions(event: JobEvent): Promise<ISubscription[]> {
    const query: any = {
      applicationId: event.applicationId,
      active: true,
      events: event.status,
    };

    // Find all active subscriptions for this application and event type
    const subscriptions = await Subscription.find(query);
    
    // Filter by additional criteria
    return subscriptions.filter(sub => {
      // Check queue filter
      if (sub.filters.queues && sub.filters.queues.length > 0) {
        if (!sub.filters.queues.includes(event.queue)) {
          return false;
        }
      }
      
      // Check status filter
      if (sub.filters.statuses && sub.filters.statuses.length > 0) {
        if (!sub.filters.statuses.includes(event.status)) {
          return false;
        }
      }
      
      // Check metadata filters
      if (sub.filters.metadata) {
        const metadataFilters = Object.entries(sub.filters.metadata);
        for (const [key, value] of metadataFilters) {
          if (event.metadata?.[key] !== value) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  // Trigger subscriptions for a job event
  async triggerSubscriptions(event: JobEvent): Promise<void> {
    try {
      const subscriptions = await this.findMatchingSubscriptions(event);
      
      if (subscriptions.length === 0) {
        return;
      }
      
      logger.info(`Found ${subscriptions.length} matching subscriptions for job ${event.jobId}`);
      
      // Trigger all matching subscriptions in parallel
      await Promise.all(
        subscriptions.map(sub => this.triggerSubscription(sub, event))
      );
    } catch (error) {
      logger.error('Error triggering subscriptions:', error);
    }
  }

  // Trigger a single subscription
  private async triggerSubscription(
    subscription: ISubscription,
    event: JobEvent
  ): Promise<void> {
    const maxAttempts = subscription.retryConfig?.maxAttempts || 3;
    const backoffMs = subscription.retryConfig?.backoffMs || 1000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'X-Subscription-Id': subscription.id,
          'X-Job-Id': event.jobId,
          'X-Job-Status': event.status,
          'X-Application-Id': event.applicationId,
          ...subscription.headers,
        };
        
        const payload = {
          subscription: {
            id: subscription.id,
            name: subscription.name,
          },
          event: {
            type: event.status,
            timestamp: event.timestamp,
          },
          job: {
            id: event.jobId,
            queue: event.queue,
            status: event.status,
            data: event.data,
            metadata: event.metadata,
            result: event.result,
            error: event.error,
            progress: event.progress,
          },
        };
        
        const response = await axios({
          method: subscription.method,
          url: subscription.endpoint,
          headers,
          data: payload,
          timeout: 30000, // 30 second timeout
        });
        
        // Update subscription stats
        await Subscription.updateOne(
          { _id: subscription.id },
          {
            $set: { lastTriggeredAt: new Date() },
            $inc: { triggerCount: 1 },
          }
        );
        
        logger.info(`Successfully triggered subscription ${subscription.id} for job ${event.jobId}`);
        break; // Success, exit retry loop
        
      } catch (error: any) {
        logger.error(
          `Failed to trigger subscription ${subscription.id} (attempt ${attempt}/${maxAttempts}):`,
          error.message
        );
        
        if (attempt < maxAttempts) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
        } else {
          // Final attempt failed, consider deactivating subscription after too many failures
          // This could be enhanced with a failure count threshold
          logger.error(`Subscription ${subscription.id} failed after ${maxAttempts} attempts`);
        }
      }
    }
  }

  // Helper to validate subscription data
  validateSubscription(data: Partial<ISubscription>): string[] {
    const errors: string[] = [];
    
    if (!data.name) {
      errors.push('Name is required');
    }
    
    if (!data.endpoint) {
      errors.push('Endpoint URL is required');
    } else {
      try {
        new URL(data.endpoint);
      } catch {
        errors.push('Invalid endpoint URL');
      }
    }
    
    if (!data.events || data.events.length === 0) {
      errors.push('At least one event type must be specified');
    }
    
    return errors;
  }
}