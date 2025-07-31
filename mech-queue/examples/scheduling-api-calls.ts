/**
 * Scheduling API Endpoint Calls - Examples
 * 
 * This demonstrates how agents can schedule HTTP API calls to run at specific times
 * or on recurring schedules. The scheduler will make HTTP requests to the specified
 * endpoints with retry logic and error handling.
 */

const SCHEDULER_URL = 'http://localhost:3003/api'; // Internal scheduler service

// Helper function for scheduler API calls
async function schedulerCall(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${SCHEDULER_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API call failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

// Example 1: Schedule a daily API call to generate reports
async function scheduleDailyReportGeneration() {
  const schedule = await schedulerCall('POST', '/schedules', {
    name: 'daily-report-generation',
    description: 'Trigger daily report generation via API',
    endpoint: {
      url: 'https://api.myservice.com/reports/generate',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_TOKEN',
        'Content-Type': 'application/json'
      },
      body: {
        type: 'daily',
        format: 'pdf',
        recipients: ['team@example.com']
      },
      timeout: 60000 // 1 minute timeout
    },
    schedule: {
      cron: '0 9 * * *', // Every day at 9 AM
      timezone: 'America/New_York'
    },
    retryPolicy: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    },
    metadata: {
      category: 'reporting',
      importance: 'high'
    },
    createdBy: 'agent-reporting'
  });
  
  console.log('Created daily report schedule:', schedule);
  return schedule;
}

// Example 2: Schedule webhook notifications
async function scheduleWebhookNotification(eventTime: string, webhookUrl: string, payload: any) {
  const schedule = await schedulerCall('POST', '/schedules', {
    name: `webhook-notification-${Date.now()}`,
    description: 'One-time webhook notification',
    endpoint: {
      url: webhookUrl,
      method: 'POST',
      headers: {
        'X-Webhook-Source': 'mech-scheduler',
        'Content-Type': 'application/json'
      },
      body: payload,
      timeout: 30000
    },
    schedule: {
      at: eventTime // ISO 8601 datetime
    },
    retryPolicy: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    },
    createdBy: 'agent-notifications'
  });
  
  console.log('Created webhook notification schedule:', schedule);
  return schedule;
}

// Example 3: Schedule API health checks
async function scheduleHealthChecks() {
  const schedule = await schedulerCall('POST', '/schedules', {
    name: 'api-health-checks',
    description: 'Regular health checks for critical APIs',
    endpoint: {
      url: 'https://api.myservice.com/health',
      method: 'GET',
      headers: {
        'X-Health-Check': 'true'
      },
      timeout: 10000 // 10 second timeout
    },
    schedule: {
      cron: '*/5 * * * *', // Every 5 minutes
      timezone: 'UTC'
    },
    retryPolicy: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 1000
      }
    },
    metadata: {
      type: 'monitoring',
      alertOnFailure: true
    },
    createdBy: 'agent-monitoring'
  });
  
  console.log('Created health check schedule:', schedule);
  return schedule;
}

// Example 4: Schedule data synchronization
async function scheduleDataSync() {
  const schedule = await schedulerCall('POST', '/schedules', {
    name: 'nightly-data-sync',
    description: 'Sync data between systems every night',
    endpoint: {
      url: 'https://api.myservice.com/sync/trigger',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer SYNC_API_TOKEN',
        'X-Sync-Type': 'full'
      },
      body: {
        sources: ['database-a', 'database-b'],
        destination: 'data-warehouse',
        mode: 'incremental'
      },
      timeout: 300000 // 5 minute timeout for long-running sync
    },
    schedule: {
      cron: '0 2 * * *', // Every day at 2 AM
      timezone: 'UTC'
    },
    retryPolicy: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000 // Start with 1 minute delay
      }
    },
    createdBy: 'agent-data-sync'
  });
  
  console.log('Created data sync schedule:', schedule);
  return schedule;
}

// Example 5: Schedule cache warming
async function scheduleCacheWarming() {
  const schedule = await schedulerCall('POST', '/schedules', {
    name: 'cache-warming',
    description: 'Warm application caches before peak hours',
    endpoint: {
      url: 'https://api.myservice.com/cache/warm',
      method: 'POST',
      headers: {
        'X-Cache-Strategy': 'preload'
      },
      body: {
        caches: ['user-profiles', 'product-catalog', 'recommendations'],
        priority: 'high'
      }
    },
    schedule: {
      cron: '0 6,12,18 * * *', // 6 AM, 12 PM, 6 PM
      timezone: 'America/Los_Angeles'
    },
    retryPolicy: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000
      }
    },
    createdBy: 'agent-performance'
  });
  
  console.log('Created cache warming schedule:', schedule);
  return schedule;
}

// Example 6: Schedule with limited executions
async function scheduleLimitedCampaign() {
  const schedule = await schedulerCall('POST', '/schedules', {
    name: 'promotional-campaign',
    description: 'Send promotional notifications for 7 days',
    endpoint: {
      url: 'https://api.notifications.com/send-campaign',
      method: 'POST',
      headers: {
        'API-Key': 'NOTIFICATION_API_KEY'
      },
      body: {
        campaignId: 'summer-2024',
        segment: 'active-users'
      }
    },
    schedule: {
      cron: '0 10 * * *', // Daily at 10 AM
      timezone: 'America/New_York',
      limit: 7 // Only run 7 times
    },
    retryPolicy: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    },
    createdBy: 'agent-marketing'
  });
  
  console.log('Created limited campaign schedule:', schedule);
  return schedule;
}

// Example 7: Update an existing schedule
async function updateScheduleEndpoint(scheduleId: string) {
  const updated = await schedulerCall('PUT', `/schedules/${scheduleId}`, {
    endpoint: {
      url: 'https://api.myservice.com/v2/reports/generate', // Updated endpoint
      headers: {
        'Authorization': 'Bearer NEW_API_TOKEN' // Updated token
      }
    },
    metadata: {
      lastModified: new Date().toISOString(),
      modifiedBy: 'agent-maintenance'
    }
  });
  
  console.log('Updated schedule endpoint:', updated);
  return updated;
}

// Example 8: Get schedule execution status
async function getScheduleStatus(scheduleId: string) {
  const schedule = await schedulerCall('GET', `/schedules/${scheduleId}`);
  
  console.log(`Schedule: ${schedule.data.name}`);
  console.log(`Status: ${schedule.data.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`Last execution: ${schedule.data.lastExecutedAt || 'Never'}`);
  console.log(`Last status: ${schedule.data.lastExecutionStatus || 'N/A'}`);
  console.log(`Next execution: ${schedule.data.nextExecutionAt || 'N/A'}`);
  console.log(`Execution count: ${schedule.data.executionCount}`);
  
  if (schedule.data.lastExecutionError) {
    console.log(`Last error: ${schedule.data.lastExecutionError}`);
  }
  
  return schedule;
}

// Example 9: Schedule GraphQL API call
async function scheduleGraphQLQuery() {
  const schedule = await schedulerCall('POST', '/schedules', {
    name: 'graphql-analytics-query',
    description: 'Fetch daily analytics via GraphQL',
    endpoint: {
      url: 'https://api.myservice.com/graphql',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer GRAPHQL_TOKEN',
        'Content-Type': 'application/json'
      },
      body: {
        query: `
          query DailyAnalytics($date: Date!) {
            analytics(date: $date) {
              pageViews
              uniqueVisitors
              conversionRate
              revenue
            }
          }
        `,
        variables: {
          date: new Date().toISOString().split('T')[0] // Today's date
        }
      }
    },
    schedule: {
      cron: '0 1 * * *', // Daily at 1 AM
      timezone: 'UTC'
    },
    retryPolicy: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000
      }
    },
    createdBy: 'agent-analytics'
  });
  
  console.log('Created GraphQL query schedule:', schedule);
  return schedule;
}

// Main demo function
async function demonstrateScheduling() {
  try {
    console.log('=== Scheduling API Calls Demo ===\n');
    
    // Create various schedules
    const dailyReport = await scheduleDailyReportGeneration();
    const healthCheck = await scheduleHealthChecks();
    const dataSync = await scheduleDataSync();
    
    // Schedule a one-time webhook for 1 hour from now
    const oneHourFromNow = new Date(Date.now() + 3600000).toISOString();
    const webhook = await scheduleWebhookNotification(
      oneHourFromNow,
      'https://webhook.site/your-unique-url',
      { event: 'scheduled-test', timestamp: oneHourFromNow }
    );
    
    // List all schedules
    const schedules = await schedulerCall('GET', '/schedules?limit=10');
    console.log(`\nTotal schedules: ${schedules.pagination.total}`);
    
    // Check status of a schedule
    await getScheduleStatus(dailyReport.data.id);
    
    // Execute a schedule immediately (for testing)
    console.log('\nExecuting health check immediately...');
    await schedulerCall('POST', `/schedules/${healthCheck.data.id}/execute`);
    
    // Disable a schedule
    console.log('\nDisabling data sync schedule...');
    await schedulerCall('PATCH', `/schedules/${dataSync.data.id}/toggle`, {
      enabled: false
    });
    
  } catch (error) {
    console.error('Scheduling demo error:', error);
  }
}

// Export functions for use in other modules
export {
  scheduleDailyReportGeneration,
  scheduleWebhookNotification,
  scheduleHealthChecks,
  scheduleDataSync,
  scheduleCacheWarming,
  scheduleLimitedCampaign,
  updateScheduleEndpoint,
  getScheduleStatus,
  scheduleGraphQLQuery
};

// Run demo if called directly
if (require.main === module) {
  demonstrateScheduling();
}