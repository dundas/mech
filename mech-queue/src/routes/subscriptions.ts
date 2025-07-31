import { Router } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();
const subscriptionService = SubscriptionService.getInstance();

// Create a subscription
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const subscriptionData = {
      ...req.body,
      applicationId: req.application!.id,
    };
    
    // Validate subscription data
    const errors = subscriptionService.validateSubscription(subscriptionData);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }
    
    const subscription = await subscriptionService.createSubscription(subscriptionData);
    
    res.status(201).json({
      success: true,
      subscription: {
        id: subscription.id,
        name: subscription.name,
        endpoint: subscription.endpoint,
        filters: subscription.filters,
        events: subscription.events,
        active: subscription.active,
      },
    });
  } catch (error) {
    logger.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
    });
  }
});

// List subscriptions
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { active, queue } = req.query;
    
    const subscriptions = await subscriptionService.listSubscriptions(
      req.application!.id,
      {
        active: active === 'true' ? true : active === 'false' ? false : undefined,
        queue: queue as string,
      }
    );
    
    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        endpoint: sub.endpoint,
        filters: sub.filters,
        events: sub.events,
        active: sub.active,
        lastTriggeredAt: sub.lastTriggeredAt,
        triggerCount: sub.triggerCount,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
      count: subscriptions.length,
    });
  } catch (error) {
    logger.error('Error listing subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list subscriptions',
    });
  }
});

// Get a specific subscription
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const subscription = await subscriptionService.getSubscription(
      req.params.id,
      req.application!.id
    );
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }
    
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        name: subscription.name,
        description: subscription.description,
        endpoint: subscription.endpoint,
        method: subscription.method,
        headers: subscription.headers,
        filters: subscription.filters,
        events: subscription.events,
        active: subscription.active,
        retryConfig: subscription.retryConfig,
        lastTriggeredAt: subscription.lastTriggeredAt,
        triggerCount: subscription.triggerCount,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error getting subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription',
    });
  }
});

// Update a subscription
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const updates = req.body;
    delete updates.applicationId; // Prevent changing application
    delete updates.triggerCount; // Prevent manual trigger count updates
    
    const subscription = await subscriptionService.updateSubscription(
      req.params.id,
      req.application!.id,
      updates
    );
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }
    
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        name: subscription.name,
        endpoint: subscription.endpoint,
        filters: subscription.filters,
        events: subscription.events,
        active: subscription.active,
      },
    });
  } catch (error) {
    logger.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription',
    });
  }
});

// Delete a subscription
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const deleted = await subscriptionService.deleteSubscription(
      req.params.id,
      req.application!.id
    );
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Subscription deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subscription',
    });
  }
});

// Test a subscription (send a test event)
router.post('/:id/test', async (req: AuthenticatedRequest, res) => {
  try {
    const subscription = await subscriptionService.getSubscription(
      req.params.id,
      req.application!.id
    );
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }
    
    // Create a test event
    const testEvent = {
      jobId: 'test-job-' + Date.now(),
      queue: 'test-queue',
      status: subscription.events[0] || 'completed',
      applicationId: req.application!.id,
      data: { test: true, message: 'This is a test event' },
      metadata: { testEvent: true },
      timestamp: new Date().toISOString(),
    };
    
    // Trigger the subscription with test event
    await subscriptionService.triggerSubscriptions(testEvent);
    
    res.json({
      success: true,
      message: 'Test event sent',
      testEvent,
    });
  } catch (error) {
    logger.error('Error testing subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test subscription',
    });
  }
});

export default router;