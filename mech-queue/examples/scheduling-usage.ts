/**
 * Scheduling Examples for Mech Queue Service
 * 
 * This demonstrates how agents can schedule jobs to run at specific times
 * or on recurring schedules using the enhanced queue service.
 */

const API_URL = 'http://localhost:3003'; // Internal service URL

// Helper function for API calls (no auth required for internal use)
async function apiCall(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Example 1: Schedule a daily summary report
async function scheduleDailySummary() {
  const schedule = await apiCall('POST', '/api/queues/agent-tasks/schedules', {
    name: 'daily-activity-summary',
    description: 'Generate and send daily activity summary to users',
    data: {
      agentId: 'agent-123',
      action: 'generate-summary',
      recipients: ['user@example.com'],
      includeMetrics: true
    },
    schedule: {
      cron: '0 18 * * *', // Every day at 6 PM
      timezone: 'America/Los_Angeles'
    },
    metadata: {
      purpose: 'user-requested-summary'
    },
    createdBy: 'agent-123'
  });
  
  console.log('Created daily summary schedule:', schedule);
  return schedule;
}

// Example 2: Schedule a one-time reminder
async function scheduleReminder(message: string, atTime: string) {
  const schedule = await apiCall('POST', '/api/queues/notifications/schedules', {
    name: `reminder-${Date.now()}`,
    description: 'One-time reminder notification',
    data: {
      type: 'reminder',
      message,
      priority: 'high'
    },
    schedule: {
      at: atTime // ISO 8601 datetime, e.g., '2024-12-25T09:00:00Z'
    },
    metadata: {
      temporary: true
    },
    createdBy: 'agent-123'
  });
  
  console.log('Created reminder schedule:', schedule);
  return schedule;
}

// Example 3: Schedule a workflow to run every Monday
async function scheduleWeeklyWorkflow() {
  const schedule = await apiCall('POST', '/api/queues/workflows/schedules', {
    name: 'weekly-data-sync',
    description: 'Sync external data sources every Monday morning',
    data: {
      sequenceId: 'sync-external-data',
      input: {
        sources: ['crm', 'analytics', 'support'],
        fullSync: true
      }
    },
    schedule: {
      cron: '0 9 * * 1', // Every Monday at 9 AM
      timezone: 'UTC'
    },
    options: {
      priority: 2,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 60000 // Start with 1 minute delay
      }
    }
  });
  
  console.log('Created weekly workflow schedule:', schedule);
  return schedule;
}

// Example 4: Schedule memory cleanup
async function scheduleMemoryCleanup() {
  const schedule = await apiCall('POST', '/api/queues/maintenance/schedules', {
    name: 'memory-archive',
    description: 'Archive old memories to cold storage',
    data: {
      action: 'archive-memories',
      agentId: 'agent-123',
      archiveOlderThan: 30, // days
      compressData: true
    },
    schedule: {
      cron: '0 2 * * 0', // Every Sunday at 2 AM
      timezone: 'UTC'
    },
    metadata: {
      maintenance: true,
      autoCreated: true
    }
  });
  
  console.log('Created memory cleanup schedule:', schedule);
  return schedule;
}

// Example 5: Schedule with end date and limit
async function scheduleLimitedCampaign() {
  const schedule = await apiCall('POST', '/api/queues/campaigns/schedules', {
    name: 'holiday-campaign-2024',
    description: 'Send holiday campaign emails',
    data: {
      campaignId: 'holiday-2024',
      segment: 'active-users'
    },
    schedule: {
      cron: '0 10 * * *', // Daily at 10 AM
      timezone: 'America/New_York',
      endDate: '2024-12-31T23:59:59Z', // Stop after Dec 31
      limit: 25 // Maximum 25 executions
    }
  });
  
  console.log('Created limited campaign schedule:', schedule);
  return schedule;
}

// Example 6: List all schedules
async function listSchedules() {
  const result = await apiCall('GET', '/api/schedules?enabled=true&page=1&limit=10');
  
  console.log(`Found ${result.data.length} schedules:`);
  result.data.forEach((schedule: any) => {
    console.log(`- ${schedule.name}: ${schedule.schedule.cron || 'One-time'} (${schedule.enabled ? 'Enabled' : 'Disabled'})`);
  });
  
  return result;
}

// Example 7: Update a schedule
async function updateSchedule(scheduleId: string, queueName: string) {
  const updated = await apiCall('PUT', `/api/queues/${queueName}/schedules/${scheduleId}`, {
    schedule: {
      cron: '0 20 * * *' // Change to 8 PM
    },
    metadata: {
      lastModified: new Date().toISOString(),
      modifiedBy: 'agent-123'
    }
  });
  
  console.log('Updated schedule:', updated);
  return updated;
}

// Example 8: Toggle schedule on/off
async function toggleSchedule(scheduleId: string, queueName: string, enabled: boolean) {
  const toggled = await apiCall('PATCH', `/api/queues/${queueName}/schedules/${scheduleId}/toggle`, {
    enabled
  });
  
  console.log(`Schedule ${enabled ? 'enabled' : 'disabled'}:`, toggled);
  return toggled;
}

// Example 9: Execute a schedule immediately
async function executeNow(scheduleId: string, queueName: string) {
  const result = await apiCall('POST', `/api/queues/${queueName}/schedules/${scheduleId}/execute`);
  
  console.log('Manual execution started:', result);
  return result;
}

// Example 10: Delete a schedule
async function deleteSchedule(scheduleId: string, queueName: string) {
  const result = await apiCall('DELETE', `/api/queues/${queueName}/schedules/${scheduleId}`);
  
  console.log('Schedule deleted:', result);
  return result;
}

// Main demo function
async function demonstrateScheduling() {
  try {
    // Create various schedules
    const dailySummary = await scheduleDailySummary();
    const reminder = await scheduleReminder('Team meeting in 1 hour', '2024-12-01T14:00:00Z');
    const weeklySync = await scheduleWeeklyWorkflow();
    
    // List all schedules
    await listSchedules();
    
    // Execute a schedule manually
    await executeNow(dailySummary.data.id, 'agent-tasks');
    
    // Disable a schedule
    await toggleSchedule(weeklySync.data.id, 'workflows', false);
    
  } catch (error) {
    console.error('Scheduling demo error:', error);
  }
}

// Run the demo
if (require.main === module) {
  demonstrateScheduling();
}

export {
  scheduleDailySummary,
  scheduleReminder,
  scheduleWeeklyWorkflow,
  scheduleMemoryCleanup,
  scheduleLimitedCampaign,
  listSchedules,
  updateSchedule,
  toggleSchedule,
  executeNow,
  deleteSchedule
};