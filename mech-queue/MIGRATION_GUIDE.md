# Migration Guide

This guide helps you migrate from the previous multi-tenant queue service to the new domain-agnostic version.

## Key Changes

### 1. Terminology Update: Tenant → Application
- `tenantId` is now `applicationId`
- `/api/tenants` endpoints are now `/api/applications`
- All references to "tenant" in the codebase now use "application"

### 2. Domain-Agnostic Queues
- No more predefined queues (email, webhook, etc.)
- Queues are created dynamically when jobs are submitted
- Workers are now external services that poll for jobs

### 3. New Features
- **Metadata filtering**: Filter jobs by custom metadata fields
- **Webhook support**: Get notified on job status changes
- **Simplified API**: Single endpoint for all job submissions

## API Changes

### Old API (v1)
```bash
# Submit to specific queue
POST /api/jobs/email
{
  "name": "send-email",
  "data": { ... }
}

# List jobs by queue
GET /api/jobs/email

# Create tenant
POST /api/tenants
{
  "name": "My App",
  "settings": {
    "allowedQueues": ["email", "webhook"]
  }
}
```

### New API (v2)
```bash
# Submit to any queue (created dynamically)
POST /api/jobs
{
  "queue": "email",
  "data": { ... },
  "metadata": {
    "priority": "high",
    "customerId": "cust-123"
  },
  "webhooks": {
    "completed": "https://myapp.com/webhook/completed"
  }
}

# List jobs with filtering
GET /api/jobs?queue=email&metadata.priority=high

# Create application
POST /api/applications
{
  "name": "My App",
  "settings": {
    "maxConcurrentJobs": 100
  }
}
```

## Database Migration

If you have existing data, run the migration script:

```bash
# This updates all tenant references to application
node scripts/migrate-v1-to-v2.js
```

## Worker Migration

### Old Worker Pattern (Built-in)
Workers were part of the queue service:

```javascript
// src/workers/email.worker.ts (OLD)
export async function processEmailJob(job) {
  const { to, subject, body } = job.data;
  await sendEmail(to, subject, body);
  return { messageId: '...' };
}
```

### New Worker Pattern (External)
Workers are now separate services:

```javascript
// external-email-worker.js (NEW)
const axios = require('axios');

const QUEUE_API = 'http://localhost:3003/api/jobs';
const API_KEY = 'worker-api-key';

async function pollAndProcess() {
  // Get waiting email jobs
  const { data } = await axios.get(
    `${QUEUE_API}?queue=email&status=waiting`,
    { headers: { 'x-api-key': API_KEY } }
  );
  
  for (const job of data.jobs) {
    try {
      // Update to started
      await axios.put(`${QUEUE_API}/${job.id}`, {
        status: 'started'
      }, { headers: { 'x-api-key': API_KEY } });
      
      // Process the job
      const result = await sendEmail(job.data);
      
      // Update to completed
      await axios.put(`${QUEUE_API}/${job.id}`, {
        status: 'completed',
        result
      }, { headers: { 'x-api-key': API_KEY } });
      
    } catch (error) {
      // Update to failed
      await axios.put(`${QUEUE_API}/${job.id}`, {
        status: 'failed',
        error: error.message
      }, { headers: { 'x-api-key': API_KEY } });
    }
  }
}

// Poll every 5 seconds
setInterval(pollAndProcess, 5000);
```

## Code Update Examples

### Submitting Jobs

**Before:**
```javascript
// Old way - specific queue endpoint
await fetch('/api/jobs/email', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'send-welcome-email',
    data: {
      to: 'user@example.com',
      templateId: 'welcome'
    }
  })
});
```

**After:**
```javascript
// New way - generic endpoint with metadata and webhooks
await fetch('/api/jobs', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    queue: 'email',
    data: {
      to: 'user@example.com',
      templateId: 'welcome'
    },
    metadata: {
      type: 'transactional',
      userId: 'user-123'
    },
    webhooks: {
      completed: 'https://myapp.com/webhooks/email-sent'
    }
  })
});
```

### Querying Jobs

**Before:**
```javascript
// Old way - get all jobs from a queue
const response = await fetch('/api/jobs/email', {
  headers: { 'x-api-key': 'your-key' }
});
```

**After:**
```javascript
// New way - filter by metadata
const response = await fetch(
  '/api/jobs?queue=email&metadata.type=transactional&status=completed',
  { headers: { 'x-api-key': 'your-key' } }
);
```

## Environment Variable Changes

```bash
# Old
ALLOWED_QUEUES=email,webhook,ai-processing

# New (no longer needed - queues are dynamic)
# Just ensure these are set:
REDIS_HOST=localhost
REDIS_PORT=6379
MASTER_API_KEY=your_master_key
```

## Benefits of Migration

1. **Flexibility**: Create any queue on-demand without configuration
2. **Better Search**: Filter jobs by any metadata field
3. **Real-time Updates**: Webhook notifications for job status changes
4. **Simpler Architecture**: External workers can be scaled independently
5. **Domain Independence**: Use for any type of background job

## Rollback Plan

If you need to rollback:

1. Keep a backup of your Redis data before migration
2. The old queue definitions are still in the codebase (just unused)
3. You can run both versions side-by-side on different ports during transition

## Getting Help

- Check the updated [README.md](./README.md) for full documentation
- Review [examples/enhanced-usage.ts](./examples/enhanced-usage.ts) for code examples
- Open an issue on GitHub for migration problems