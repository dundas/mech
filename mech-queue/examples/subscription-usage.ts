// Event Subscription Examples

import axios from 'axios';

const API_URL = 'http://localhost:3003/api';
const API_KEY = 'your-api-key';

async function subscriptionExamples() {
  // 1. Create a subscription for high-priority email jobs
  console.log('=== Create Subscription for High Priority Emails ===');
  
  const emailSubscription = await axios.post(
    `${API_URL}/subscriptions`,
    {
      name: 'High Priority Email Notifications',
      description: 'Get notified when high-priority emails are sent',
      endpoint: 'https://myapp.com/webhooks/email-events',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer webhook-secret-123',
      },
      filters: {
        queues: ['email'],
        metadata: {
          priority: 'high',
          type: 'transactional',
        },
      },
      events: ['created', 'completed', 'failed'],
      retryConfig: {
        maxAttempts: 3,
        backoffMs: 2000,
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  console.log('Email subscription created:', emailSubscription.data.subscription.id);

  // 2. Create a subscription for failed payment jobs
  const paymentSubscription = await axios.post(
    `${API_URL}/subscriptions`,
    {
      name: 'Failed Payment Alerts',
      description: 'Alert when payment processing fails',
      endpoint: 'https://myapp.com/webhooks/payment-failures',
      filters: {
        queues: ['payments'],
        statuses: ['failed'],
        metadata: {
          retryable: true,
        },
      },
      events: ['failed'],
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  // 3. Create a subscription for all jobs from a specific customer
  const customerSubscription = await axios.post(
    `${API_URL}/subscriptions`,
    {
      name: 'Customer Activity Monitor',
      description: 'Track all job activity for customer-123',
      endpoint: 'https://myapp.com/webhooks/customer-activity',
      filters: {
        metadata: {
          customerId: 'cust-123',
        },
      },
      events: ['created', 'started', 'progress', 'completed', 'failed'],
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  // 4. Create a catch-all subscription for monitoring
  const monitoringSubscription = await axios.post(
    `${API_URL}/subscriptions`,
    {
      name: 'Operations Dashboard Feed',
      description: 'Real-time feed for operations dashboard',
      endpoint: 'wss://dashboard.myapp.com/events', // Could be WebSocket
      filters: {
        // No filters - receive all events
      },
      events: ['created', 'started', 'completed', 'failed'],
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  // 5. List all active subscriptions
  console.log('\n=== List Active Subscriptions ===');
  
  const subscriptions = await axios.get(
    `${API_URL}/subscriptions?active=true`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );
  
  console.log('Active subscriptions:', subscriptions.data.subscriptions);

  // 6. Test a subscription
  console.log('\n=== Test Subscription ===');
  
  await axios.post(
    `${API_URL}/subscriptions/${emailSubscription.data.subscription.id}/test`,
    {},
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );
  
  console.log('Test event sent to subscription');

  // 7. Submit a job that will trigger subscriptions
  console.log('\n=== Submit Job that Triggers Subscriptions ===');
  
  const jobResponse = await axios.post(
    `${API_URL}/jobs`,
    {
      queue: 'email',
      data: {
        to: 'customer@example.com',
        subject: 'Order Confirmation',
        body: 'Your order has been confirmed!',
      },
      metadata: {
        priority: 'high',
        type: 'transactional',
        customerId: 'cust-123',
        orderId: 'order-789',
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  console.log('Job submitted:', jobResponse.data.jobId);
  console.log('This job will trigger the email and customer subscriptions');

  // 8. Update a subscription
  console.log('\n=== Update Subscription ===');
  
  await axios.put(
    `${API_URL}/subscriptions/${emailSubscription.data.subscription.id}`,
    {
      active: false, // Disable the subscription
      filters: {
        queues: ['email', 'notifications'], // Add another queue
        metadata: {
          priority: 'high',
          type: 'transactional',
        },
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  console.log('Subscription updated and disabled');
}

// Example webhook receiver that handles subscription events
function webhookReceiver() {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  // Endpoint for high-priority email events
  app.post('/webhooks/email-events', (req, res) => {
    console.log('Email event received:', {
      subscription: req.body.subscription,
      event: req.body.event,
      job: req.body.job,
    });
    
    // Process based on event type
    switch (req.body.event.type) {
      case 'created':
        console.log('New high-priority email job created');
        break;
      case 'completed':
        console.log('High-priority email sent successfully');
        // Update CRM, analytics, etc.
        break;
      case 'failed':
        console.log('High-priority email failed!');
        // Alert operations team
        break;
    }
    
    res.status(200).send('OK');
  });
  
  // Endpoint for customer activity
  app.post('/webhooks/customer-activity', (req, res) => {
    const { job, event } = req.body;
    console.log(`Customer ${job.metadata.customerId} activity:`, {
      queue: job.queue,
      status: event.type,
      jobId: job.id,
    });
    
    // Could update customer activity dashboard, send to analytics, etc.
    res.status(200).send('OK');
  });
  
  app.listen(3005, () => {
    console.log('Webhook receiver listening on port 3005');
  });
}

// Advanced example: Dynamic subscription management
async function dynamicSubscriptionExample() {
  // Create subscriptions based on business rules
  const customers = ['cust-123', 'cust-456', 'cust-789'];
  
  for (const customerId of customers) {
    // Create a subscription for each VIP customer
    await axios.post(
      `${API_URL}/subscriptions`,
      {
        name: `VIP Customer Monitor - ${customerId}`,
        description: `Monitor all activity for VIP customer ${customerId}`,
        endpoint: `https://crm.myapp.com/webhooks/vip-activity`,
        filters: {
          metadata: {
            customerId,
            vip: true,
          },
        },
        events: ['created', 'completed', 'failed'],
        headers: {
          'X-Customer-Id': customerId,
        },
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Example: Using subscriptions for real-time monitoring
async function realtimeMonitoring() {
  // Create subscriptions for different alert levels
  const alertLevels = [
    {
      name: 'Critical Failures',
      filters: {
        statuses: ['failed'],
        metadata: {
          severity: 'critical',
        },
      },
      endpoint: 'https://alerts.myapp.com/critical',
    },
    {
      name: 'Long Running Jobs',
      filters: {
        metadata: {
          estimatedDuration: { $gt: 300000 }, // Jobs expected to take > 5 minutes
        },
      },
      events: ['started', 'progress'],
      endpoint: 'https://monitoring.myapp.com/long-running',
    },
  ];
  
  for (const alert of alertLevels) {
    await axios.post(
      `${API_URL}/subscriptions`,
      {
        ...alert,
        events: alert.events || ['failed'],
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Run examples
subscriptionExamples().catch(console.error);