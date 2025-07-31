# API Reference

## Base URL
```
http://localhost:3003
```

## Authentication
All endpoints except `/health` require an API key header:
```
x-api-key: your-api-key
```

## Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 12345,
  "redis": "connected"
}
```

---

### Submit Job
```http
POST /api/jobs
```

**Headers:**
- `x-api-key`: Your API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "queue": "string",              // Required: Queue name (created if doesn't exist)
  "data": {},                     // Required: Job payload
  "metadata": {                   // Optional: Custom metadata for filtering
    "key": "value"
  },
  "webhooks": {                   // Optional: Status change webhooks
    "started": "https://...",     // Called when job starts
    "progress": "https://...",    // Called on progress updates
    "completed": "https://...",   // Called when job completes
    "failed": "https://...",      // Called when job fails
    "*": "https://..."            // Called on any status change
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Job submitted to {queue} queue"
}
```

---

### Update Job Status
```http
PUT /api/jobs/{jobId}
```

**Headers:**
- `x-api-key`: Your API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "status": "started|progress|completed|failed",  // Required
  "progress": 50,                                 // Optional: For progress status
  "result": {},                                   // Optional: For completed status
  "error": "Error message",                       // Optional: For failed status
  "metadata": {}                                  // Optional: Update job metadata
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job {jobId} updated"
}
```

---

### Get Job Status
```http
GET /api/jobs/{jobId}
```

**Headers:**
- `x-api-key`: Your API key

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "queue": "email",
    "status": "completed",
    "data": {
      "_applicationId": "app-123",
      "_submittedAt": "2024-01-20T10:00:00Z",
      "_metadata": {},
      "to": "user@example.com",
      "subject": "Welcome"
    },
    "metadata": {
      "priority": "high",
      "customerId": "cust-123"
    },
    "result": {
      "messageId": "msg-123"
    },
    "error": null,
    "progress": 100,
    "updates": [],
    "webhooks": {
      "completed": "https://..."
    },
    "timestamps": {
      "submitted": "2024-01-20T10:00:00Z",
      "started": "2024-01-20T10:00:01Z",
      "completed": "2024-01-20T10:00:05Z"
    }
  }
}
```

---

### List Jobs
```http
GET /api/jobs
```

**Headers:**
- `x-api-key`: Your API key

**Query Parameters:**
- `queue`: Filter by queue name
- `status`: Filter by status (waiting, active, completed, failed)
- `metadata.{key}`: Filter by metadata field (e.g., `metadata.priority=high`)
- `limit`: Maximum results (default: 100)

**Examples:**
```
GET /api/jobs?queue=email
GET /api/jobs?status=completed
GET /api/jobs?metadata.priority=high&metadata.customerId=cust-123
GET /api/jobs?queue=payments&status=failed&limit=50
```

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job-1",
      "queue": "email",
      "status": "completed",
      "submittedAt": "2024-01-20T10:00:00Z",
      "data": {},
      "metadata": {}
    }
  ],
  "count": 25
}
```

---

### Register/Update Webhooks
```http
POST /api/jobs/{jobId}/webhook
```

**Headers:**
- `x-api-key`: Your API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "webhooks": {
    "completed": "https://myapp.com/webhooks/job-completed",
    "failed": "https://myapp.com/webhooks/job-failed",
    "*": "https://myapp.com/webhooks/all-events"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhooks registered for job {jobId}",
  "webhooks": {
    "completed": "https://myapp.com/webhooks/job-completed",
    "failed": "https://myapp.com/webhooks/job-failed",
    "*": "https://myapp.com/webhooks/all-events"
  }
}
```

---

### Create Application (Master Key Required)
```http
POST /api/applications
```

**Headers:**
- `x-api-key`: Master API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "name": "My Application",
  "settings": {
    "maxConcurrentJobs": 100,
    "metadata": {
      "environment": "production",
      "team": "backend"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "app-123",
    "name": "My Application",
    "apiKey": "sk_live_...",
    "settings": {
      "maxConcurrentJobs": 100,
      "metadata": {}
    },
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z"
  }
}
```

---

### List Applications (Master Key Required)
```http
GET /api/applications
```

**Headers:**
- `x-api-key`: Master API key

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "app-123",
      "name": "My Application",
      "apiKey": "sk_live_...",
      "settings": {},
      "createdAt": "2024-01-20T10:00:00Z",
      "updatedAt": "2024-01-20T10:00:00Z"
    }
  ]
}
```

---

### Create Subscription
```http
POST /api/subscriptions
```

**Headers:**
- `x-api-key`: Your API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "name": "string",                    // Required: Subscription name
  "description": "string",             // Optional: Description
  "endpoint": "https://...",           // Required: Webhook endpoint URL
  "method": "POST|PUT",                // Optional: HTTP method (default: POST)
  "headers": {                         // Optional: Custom headers
    "Authorization": "Bearer ...",
    "X-Custom": "value"
  },
  "filters": {                         // Optional: Event filters
    "queues": ["email", "payments"],   // Filter by queue names
    "statuses": ["completed"],         // Filter by job statuses
    "metadata": {                      // Filter by metadata fields
      "priority": "high",
      "customerId": "cust-123"
    }
  },
  "events": ["created", "started", "progress", "completed", "failed"], // Required
  "retryConfig": {                     // Optional: Retry configuration
    "maxAttempts": 3,
    "backoffMs": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-123",
    "name": "string",
    "endpoint": "https://...",
    "filters": {},
    "events": ["completed"],
    "active": true
  }
}
```

---

### List Subscriptions
```http
GET /api/subscriptions
```

**Headers:**
- `x-api-key`: Your API key

**Query Parameters:**
- `active`: Filter by active status (true/false)
- `queue`: Filter by queue name

**Response:**
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": "sub-123",
      "name": "High Priority Emails",
      "description": "...",
      "endpoint": "https://...",
      "filters": {},
      "events": ["completed"],
      "active": true,
      "lastTriggeredAt": "2024-01-20T10:00:00Z",
      "triggerCount": 42,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-20T10:00:00Z"
    }
  ],
  "count": 5
}
```

---

### Get Subscription
```http
GET /api/subscriptions/{subscriptionId}
```

**Headers:**
- `x-api-key`: Your API key

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-123",
    "name": "string",
    "description": "string",
    "endpoint": "https://...",
    "method": "POST",
    "headers": {},
    "filters": {},
    "events": ["completed"],
    "active": true,
    "retryConfig": {
      "maxAttempts": 3,
      "backoffMs": 1000
    },
    "lastTriggeredAt": "2024-01-20T10:00:00Z",
    "triggerCount": 42,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z"
  }
}
```

---

### Update Subscription
```http
PUT /api/subscriptions/{subscriptionId}
```

**Headers:**
- `x-api-key`: Your API key
- `Content-Type`: application/json

**Request Body:** (Any fields to update)
```json
{
  "active": false,
  "filters": {
    "queues": ["email", "notifications"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-123",
    "name": "string",
    "endpoint": "https://...",
    "filters": {},
    "events": ["completed"],
    "active": false
  }
}
```

---

### Delete Subscription
```http
DELETE /api/subscriptions/{subscriptionId}
```

**Headers:**
- `x-api-key`: Your API key

**Response:**
```json
{
  "success": true,
  "message": "Subscription deleted successfully"
}
```

---

### Test Subscription
```http
POST /api/subscriptions/{subscriptionId}/test
```

**Headers:**
- `x-api-key`: Your API key

**Response:**
```json
{
  "success": true,
  "message": "Test event sent",
  "testEvent": {
    "jobId": "test-job-123",
    "queue": "test-queue",
    "status": "completed",
    "applicationId": "app-123",
    "data": {
      "test": true,
      "message": "This is a test event"
    },
    "metadata": {
      "testEvent": true
    },
    "timestamp": "2024-01-20T10:00:00Z"
  }
}
```

---

## Subscription Event Payload

When a subscription is triggered, it sends the following payload to the configured endpoint:

**Request:**
```json
{
  "subscription": {
    "id": "sub-123",
    "name": "High Priority Emails"
  },
  "event": {
    "type": "completed",
    "timestamp": "2024-01-20T10:00:05Z"
  },
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "queue": "email",
    "status": "completed",
    "data": {
      "to": "user@example.com",
      "subject": "Welcome"
    },
    "metadata": {
      "priority": "high",
      "customerId": "cust-123"
    },
    "result": {          // Only for completed status
      "messageId": "msg-123"
    },
    "error": "...",      // Only for failed status
    "progress": 75       // Only for progress status
  }
}
```

**Headers:**
- `Content-Type`: application/json
- `X-Subscription-Id`: The subscription ID
- `X-Job-Id`: The job ID
- `X-Job-Status`: The job status
- `X-Application-Id`: The application ID
- Plus any custom headers configured in the subscription

---

## Webhook Payload

When webhooks are triggered, they receive the following payload:

**Request:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "timestamp": "2024-01-20T10:00:05Z",
  "result": {},      // Only for completed status
  "error": "...",    // Only for failed status  
  "progress": 75     // Only for progress status
}
```

**Headers:**
- `X-Job-Id`: The job ID
- `X-Job-Status`: The job status
- `Content-Type`: application/json

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {}  // Optional additional error details
}
```

**Common HTTP Status Codes:**
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid API key
- `403`: Forbidden - Access denied
- `404`: Not Found - Job or resource not found
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error

---

## Rate Limiting

Default limits:
- 100 requests per minute per API key
- 1000 jobs per hour per application

Headers returned:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp