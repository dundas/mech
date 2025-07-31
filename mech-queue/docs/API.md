# Queue Service API Reference

## Base URL

```
http://localhost:3003/api
```

## Authentication

Most endpoints require API key authentication:

```http
x-api-key: your-api-key
```

## Endpoints

### Health Check

#### GET /health

Check service health and get queue statistics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00Z",
  "queues": [
    {
      "name": "email",
      "waiting": 10,
      "active": 2,
      "completed": 150,
      "failed": 3,
      "delayed": 5,
      "paused": false
    }
  ],
  "version": "1.0.0"
}
```

---

### Jobs API

#### POST /api/jobs/:queueName

Submit a new job to a queue.

**Parameters:**
- `queueName` (path) - Name of the queue

**Headers:**
- `x-api-key` - Your API key
- `Content-Type` - application/json

**Request Body:**
```json
{
  "name": "job-name",
  "data": {
    // Job-specific data
  },
  "options": {
    "delay": 5000,
    "priority": 1,
    "attempts": 3,
    "backoff": {
      "type": "exponential",
      "delay": 2000
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "123",
    "queue": "email",
    "status": "waiting"
  },
  "metadata": {
    "timestamp": "2024-01-20T10:00:00Z",
    "requestId": "req_123"
  }
}
```

#### GET /api/jobs/:queueName/:jobId

Get job status and details.

**Parameters:**
- `queueName` (path) - Name of the queue
- `jobId` (path) - Job ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "queue": "email",
    "status": "completed",
    "progress": 100,
    "result": {
      "messageId": "msg_123",
      "sentAt": "2024-01-20T10:00:05Z"
    },
    "createdAt": "2024-01-20T10:00:00Z",
    "processedAt": "2024-01-20T10:00:01Z",
    "completedAt": "2024-01-20T10:00:05Z"
  }
}
```

#### DELETE /api/jobs/:queueName/:jobId

Cancel/remove a job from the queue.

**Parameters:**
- `queueName` (path) - Name of the queue
- `jobId` (path) - Job ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Job cancelled successfully"
  }
}
```

---

### Queues API

#### GET /api/queues

List all available queues (filtered by tenant permissions).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "email",
      "description": "Email sending queue",
      "defaultJobOptions": {
        "attempts": 3,
        "backoff": {
          "type": "exponential",
          "delay": 2000
        }
      }
    }
  ]
}
```

#### GET /api/queues/stats

Get statistics for all accessible queues.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "email",
      "waiting": 10,
      "active": 2,
      "completed": 150,
      "failed": 3,
      "delayed": 5,
      "paused": false
    }
  ]
}
```

#### GET /api/queues/:queueName/stats

Get statistics for a specific queue.

**Parameters:**
- `queueName` (path) - Name of the queue

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "email",
    "waiting": 10,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 5,
    "paused": false
  }
}
```

#### POST /api/queues/:queueName/pause

Pause a queue (master tenant only).

**Parameters:**
- `queueName` (path) - Name of the queue

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Queue 'email' paused successfully"
  }
}
```

#### POST /api/queues/:queueName/resume

Resume a paused queue (master tenant only).

**Parameters:**
- `queueName` (path) - Name of the queue

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Queue 'email' resumed successfully"
  }
}
```

#### POST /api/queues/:queueName/clean

Clean completed/failed jobs from a queue (master tenant only).

**Parameters:**
- `queueName` (path) - Name of the queue

**Request Body:**
```json
{
  "grace": 5000  // Grace period in ms (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Queue 'email' cleaned successfully"
  }
}
```

---

### Tenants API (Master Key Required)

#### POST /api/tenants

Create a new tenant.

**Headers:**
- `x-api-key` - Master API key

**Request Body:**
```json
{
  "name": "My Application",
  "settings": {
    "allowedQueues": ["email", "webhook", "notifications"],
    "maxConcurrentJobs": 100,
    "metadata": {
      "contact": "admin@example.com"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Application",
    "apiKey": "sk_a1b2c3d4e5f6g7h8i9j0",
    "settings": {
      "allowedQueues": ["email", "webhook", "notifications"],
      "maxConcurrentJobs": 100
    },
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z"
  }
}
```

#### GET /api/tenants

List all tenants.

**Headers:**
- `x-api-key` - Master API key

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Application",
      "apiKey": "sk_a1b2c3d4e5f6g7h8i9j0",
      "settings": {},
      "createdAt": "2024-01-20T10:00:00Z",
      "updatedAt": "2024-01-20T10:00:00Z"
    }
  ]
}
```

#### GET /api/tenants/:id

Get tenant details.

**Parameters:**
- `id` (path) - Tenant ID

**Headers:**
- `x-api-key` - Master API key

#### PATCH /api/tenants/:id

Update tenant settings.

**Parameters:**
- `id` (path) - Tenant ID

**Headers:**
- `x-api-key` - Master API key

**Request Body:**
```json
{
  "name": "Updated Name",
  "settings": {
    "allowedQueues": ["*"]
  }
}
```

#### DELETE /api/tenants/:id

Delete a tenant.

**Parameters:**
- `id` (path) - Tenant ID

**Headers:**
- `x-api-key` - Master API key

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}  // Optional additional details
  }
}
```

### Common Error Codes

- `MISSING_API_KEY` - API key header missing
- `INVALID_API_KEY` - API key is invalid
- `UNAUTHORIZED` - Not authorized for this action
- `QUEUE_ACCESS_DENIED` - No access to specified queue
- `QUEUE_NOT_FOUND` - Queue doesn't exist
- `JOB_NOT_FOUND` - Job doesn't exist
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Rate Limiting

Default rate limits:
- 100 requests per minute per API key
- Configurable via environment variables

Rate limit headers:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp