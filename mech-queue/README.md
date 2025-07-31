# Queue Service - Domain-Agnostic Background Job Processing

A flexible, multi-application queue service built with BullMQ and Redis for reliable background job processing. This service provides a generic job queue infrastructure that can be used by multiple applications to handle any type of asynchronous task.

## Features

- 🔐 **Multi-application support** with API key authentication
- 🎯 **Domain-agnostic design** - Create queues for any purpose
- 📊 **Metadata filtering** - Filter and search jobs by custom metadata
- 🪝 **Webhook support** - Get notified on job status changes
- 📡 **Event subscriptions** - Subscribe to job events with metadata-based filtering
- 🚀 **High performance** with Redis-backed BullMQ
- 📈 **Prometheus metrics** for monitoring
- 🐳 **Docker ready** with deployment scripts
- 🔄 **Automatic retries** with exponential backoff
- 📝 **RESTful API** for job submission and management
- 🛡️ **Rate limiting** and security features

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd mech-queue

# Copy environment variables
cp .env.example .env

# Build and run with Docker
docker build -t queue-service .
docker run -d -p 3003:3003 --env-file .env queue-service
```

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start Redis (required)
docker run -d -p 6379:6379 redis:7-alpine

# Start the service
npm run dev
```

### Production Deployment

For production deployment with managed Redis/Valkey, Nginx reverse proxy, and proper TLS configuration, see our comprehensive [Hosted Services Configuration Guide](./docs/HOSTED_SERVICES_CONFIGURATION.md).

## API Documentation

### Authentication

All API endpoints require authentication via API key:

```bash
curl -H "x-api-key: your-api-key" http://localhost:3003/api/...
```

### Health Check

```bash
GET /health
```

Returns service health status.

### Job Management

#### Submit a Job

```bash
POST /api/jobs

Headers:
  x-api-key: your-api-key
  Content-Type: application/json

Body:
{
  "queue": "email-notifications",  // Any queue name - created automatically
  "data": {
    // Your job data
    "to": "user@example.com",
    "subject": "Welcome!"
  },
  "metadata": {                    // Optional: Custom metadata for filtering
    "priority": "high",
    "customerId": "cust-123",
    "type": "transactional"
  },
  "webhooks": {                    // Optional: Status change webhooks
    "completed": "https://myapp.com/webhooks/job-completed",
    "failed": "https://myapp.com/webhooks/job-failed",
    "progress": "https://myapp.com/webhooks/job-progress",
    "*": "https://myapp.com/webhooks/all-events"
  }
}

Response:
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Job submitted to email-notifications queue"
}
```

#### Update Job Status (For Workers)

```bash
PUT /api/jobs/{jobId}

Headers:
  x-api-key: your-api-key
  Content-Type: application/json

Body:
{
  "status": "progress",    // "started", "progress", "completed", "failed"
  "progress": 50,          // Optional: Progress percentage
  "result": { ... },       // Optional: Job result (for completed)
  "error": "Error message" // Optional: Error message (for failed)
}

Response:
{
  "success": true,
  "message": "Job {jobId} updated"
}
```

#### Get Job Status

```bash
GET /api/jobs/{jobId}

Response:
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "queue": "email-notifications",
    "status": "completed",
    "data": { ... },
    "metadata": {
      "priority": "high",
      "customerId": "cust-123"
    },
    "result": { ... },
    "progress": 100,
    "timestamps": {
      "submitted": "2024-01-20T10:00:00Z",
      "started": "2024-01-20T10:00:01Z",
      "completed": "2024-01-20T10:00:05Z"
    }
  }
}
```

#### List Jobs with Filtering

```bash
GET /api/jobs?queue=email&status=completed&metadata.priority=high&metadata.customerId=cust-123

Query Parameters:
  - queue: Filter by queue name
  - status: Filter by status (waiting, active, completed, failed)
  - metadata.*: Filter by metadata fields (e.g., metadata.priority=high)
  - limit: Max number of results (default: 100)

Response:
{
  "success": true,
  "jobs": [...],
  "count": 25
}
```

#### Register/Update Webhooks

```bash
POST /api/jobs/{jobId}/webhook

Headers:
  x-api-key: your-api-key
  Content-Type: application/json

Body:
{
  "webhooks": {
    "completed": "https://myapp.com/webhooks/email-sent",
    "failed": "https://myapp.com/webhooks/email-failed"
  }
}

Response:
{
  "success": true,
  "message": "Webhooks registered for job {jobId}",
  "webhooks": { ... }
}
```

### Application Management (Master API Key Required)

#### Create Application

```bash
POST /api/applications

Headers:
  x-api-key: master_key
  Content-Type: application/json

Body:
{
  "name": "My Application",
  "settings": {
    "maxConcurrentJobs": 100,
    "metadata": {
      "environment": "production"
    }
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "app-123",
    "name": "My Application",
    "apiKey": "sk_...",
    "settings": { ... }
  }
}
```

## Usage Examples

### Email Notification with Webhooks

```javascript
// Submit an email job with metadata and webhooks
const response = await fetch('http://localhost:3003/api/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    queue: 'email',
    data: {
      to: 'user@example.com',
      subject: 'Order Confirmation',
      body: 'Your order has been confirmed!'
    },
    metadata: {
      type: 'transactional',
      priority: 'high',
      customerId: 'cust-123',
      orderId: 'order-456'
    },
    webhooks: {
      'completed': 'https://myapp.com/webhooks/email-sent',
      'failed': 'https://myapp.com/webhooks/email-failed'
    }
  })
});

const { jobId } = await response.json();
```

### Batch Processing with Progress Updates

```javascript
// Worker updates job progress
async function processDataExport(jobId, apiKey) {
  // Mark job as started
  await updateJobStatus(jobId, 'started', { apiKey });
  
  // Process in batches with progress updates
  for (let i = 0; i <= 100; i += 25) {
    await processBatch(i);
    
    // Update progress
    await updateJobStatus(jobId, 'progress', { 
      progress: i,
      apiKey 
    });
  }
  
  // Mark as completed with result
  await updateJobStatus(jobId, 'completed', {
    result: {
      recordsProcessed: 10000,
      fileUrl: 's3://bucket/export.csv'
    },
    apiKey
  });
}
```

### Filtering Jobs by Metadata

```javascript
// Find all high-priority jobs for a customer
const response = await fetch(
  'http://localhost:3003/api/jobs?' + 
  'metadata.priority=high&' +
  'metadata.customerId=cust-123',
  {
    headers: {
      'x-api-key': 'your-api-key'
    }
  }
);

const { jobs } = await response.json();
```

### Webhook Receiver Example

```javascript
// Express webhook receiver
app.post('/webhooks/job-status', (req, res) => {
  const { jobId, status, result, error } = req.body;
  const jobIdHeader = req.headers['x-job-id'];
  const statusHeader = req.headers['x-job-status'];
  
  console.log(`Job ${jobId} is now ${status}`);
  
  if (status === 'completed') {
    // Handle successful job
    console.log('Result:', result);
  } else if (status === 'failed') {
    // Handle failed job
    console.error('Error:', error);
  }
  
  res.status(200).send('OK');
});
```

## Worker Implementation

External workers can process jobs from any queue:

```javascript
// Example worker implementation
const axios = require('axios');

const API_URL = 'http://localhost:3003/api/jobs';
const API_KEY = 'worker-api-key';

async function processJobs() {
  // Get pending jobs
  const response = await axios.get(`${API_URL}?queue=email&status=waiting`, {
    headers: { 'x-api-key': API_KEY }
  });
  
  for (const job of response.data.jobs) {
    try {
      // Update status to started
      await axios.put(`${API_URL}/${job.id}`, {
        status: 'started'
      }, {
        headers: { 'x-api-key': API_KEY }
      });
      
      // Process the job
      const result = await sendEmail(job.data);
      
      // Mark as completed
      await axios.put(`${API_URL}/${job.id}`, {
        status: 'completed',
        result: result
      }, {
        headers: { 'x-api-key': API_KEY }
      });
      
    } catch (error) {
      // Mark as failed
      await axios.put(`${API_URL}/${job.id}`, {
        status: 'failed',
        error: error.message
      }, {
        headers: { 'x-api-key': API_KEY }
      });
    }
  }
}

// Poll for jobs every 5 seconds
setInterval(processJobs, 5000);
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `MASTER_API_KEY` - Master key for application management
- `PORT` - Server port (default: 3003)
- `ENABLE_PROMETHEUS_METRICS` - Enable metrics endpoint

## Monitoring

### Prometheus Metrics

When enabled, metrics are available at `http://localhost:3004/metrics`

Key metrics:
- `queue_jobs_submitted_total` - Total jobs submitted by queue and application
- `queue_jobs_completed_total` - Total jobs completed
- `queue_job_duration_seconds` - Job processing duration
- `queue_size` - Current queue sizes by status
- `queue_webhook_calls_total` - Webhook delivery attempts

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/simple-job-tracker.test.ts
```

## Production Deployment

### Using Docker

```bash
# Build the image
docker build -t queue-service .

# Run with environment variables
docker run -d \
  -p 3003:3003 \
  -e REDIS_HOST=redis.example.com \
  -e MASTER_API_KEY=secure_key \
  --name queue-service \
  queue-service
```

### Security Considerations

1. **Change default keys**: Always change `MASTER_API_KEY` in production
2. **Use Redis AUTH**: Configure Redis password for production
3. **Enable TLS**: Use HTTPS/TLS for API endpoints and webhooks
4. **Network isolation**: Keep Redis in private network
5. **Rate limiting**: Adjust rate limits based on your needs
6. **Webhook verification**: Implement webhook signature verification

## Advanced Features

### Event Subscriptions

Create subscriptions to receive real-time notifications when jobs matching specific criteria change status:

```javascript
// Subscribe to high-priority email events
await fetch('http://localhost:3003/api/subscriptions', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'High Priority Email Monitor',
    endpoint: 'https://myapp.com/webhooks/priority-emails',
    filters: {
      queues: ['email'],
      metadata: {
        priority: 'high',
        type: 'transactional'
      }
    },
    events: ['created', 'completed', 'failed']
  })
});
```

Features:
- **Metadata-based filtering**: Subscribe to jobs with specific metadata values
- **Queue filtering**: Monitor specific queues or all queues
- **Custom headers**: Add authentication or routing headers
- **Retry logic**: Automatic retries with exponential backoff
- **Real-time updates**: Get notified as soon as job status changes

Use cases:
- Monitor critical jobs across your infrastructure
- Build real-time dashboards and monitoring tools
- Trigger downstream processes when jobs complete
- Alert on failures for specific job types
- Track customer-specific job activity

### Webhook Events

Webhooks are called with the following payload:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "timestamp": "2024-01-20T10:00:05Z",
  "result": { ... },      // For completed status
  "error": "...",         // For failed status
  "progress": 75          // For progress status
}
```

Headers included:
- `X-Job-Id`: The job ID
- `X-Job-Status`: The job status
- `Content-Type`: application/json

### Metadata Filtering

Metadata allows powerful filtering capabilities:

```bash
# Find all email jobs
GET /api/jobs?metadata.type=email

# Find high-priority jobs for a specific customer
GET /api/jobs?metadata.priority=high&metadata.customerId=cust-123

# Find failed payment processing jobs
GET /api/jobs?queue=payments&status=failed&metadata.retryCount=3
```

### Dynamic Queue Creation

Queues are created automatically when jobs are submitted. No pre-configuration needed:

```javascript
// These queues are created on first use
await submitJob({ queue: 'user-imports', ... });
await submitJob({ queue: 'report-generation', ... });
await submitJob({ queue: 'payment-processing', ... });
```

## License

MIT License - see LICENSE file for details

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Contact: support@example.com