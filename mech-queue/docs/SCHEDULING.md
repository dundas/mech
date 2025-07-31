# Scheduling API Calls in Mech Queue Service (Internal Use)

The Mech Queue Service provides a powerful scheduler that allows agents and services to schedule HTTP API calls to run at specific times or on recurring schedules. This feature is designed for internal use within the Mech ecosystem and does not require authentication.

## Overview

The scheduler executes HTTP requests to specified endpoints based on time-based triggers. It handles:
- Retry logic with exponential backoff
- Timeout management
- Error tracking and reporting
- Execution history
- Timezone-aware scheduling

## Features

- **HTTP API Calls**: Schedule GET, POST, PUT, DELETE, or PATCH requests
- **Cron-based Scheduling**: Use standard cron expressions for recurring calls
- **One-time Scheduling**: Schedule API calls to run once at a specific time
- **Timezone Support**: Schedule in any timezone with automatic DST handling
- **Retry Logic**: Configurable retry attempts with exponential or fixed backoff
- **Headers & Body**: Full control over request headers and body content
- **Execution Limits**: Set maximum execution counts or end dates
- **Manual Execution**: Trigger scheduled API calls on-demand

## API Endpoints

**Note**: These endpoints are for internal use only and do not require authentication.

### Create a Schedule

```http
POST /api/schedules
```

Create a new schedule to call an API endpoint.

**Request Body:**
```json
{
  "name": "daily-report",
  "description": "Generate daily activity report",
  "endpoint": {
    "url": "https://api.myservice.com/reports/generate",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN",
      "Content-Type": "application/json"
    },
    "body": {
      "type": "daily",
      "format": "pdf"
    },
    "timeout": 60000  // 60 seconds
  },
  "schedule": {
    "cron": "0 9 * * 1-5",    // Weekdays at 9 AM
    "timezone": "America/New_York",
    "endDate": "2025-12-31T23:59:59Z",  // Optional
    "limit": 100              // Optional max executions
  },
  "retryPolicy": {
    "attempts": 3,
    "backoff": {
      "type": "exponential",
      "delay": 5000
    }
  },
  "enabled": true,
  "metadata": {
    "purpose": "daily-reporting"
  },
  "createdBy": "agent-123"  // Optional, defaults to "system"
}
```

### List Schedules

```http
GET /api/schedules?enabled=true&page=1&limit=20
```

List all schedules with optional filtering.

### Get Schedule Details

```http
GET /api/schedules/{scheduleId}
```

Returns schedule configuration and execution status.

### Update a Schedule

```http
PUT /api/schedules/{scheduleId}
```

Update schedule configuration. All fields are optional.

### Toggle Schedule

```http
PATCH /api/schedules/{scheduleId}/toggle
```

Enable or disable a schedule without deleting it.

**Request Body:**
```json
{
  "enabled": true
}
```

### Execute Schedule Now

```http
POST /api/schedules/{scheduleId}/execute
```

Manually trigger the API call immediately.

### Delete Schedule

```http
DELETE /api/schedules/{scheduleId}
```

## Endpoint Configuration

The `endpoint` object defines the HTTP request that will be made:

```json
{
  "url": "https://api.example.com/endpoint",  // Required
  "method": "POST",                           // Required: GET, POST, PUT, DELETE, PATCH
  "headers": {                                // Optional
    "Authorization": "Bearer token",
    "Custom-Header": "value"
  },
  "body": {                                   // Optional (for POST, PUT, PATCH)
    "key": "value"
  },
  "timeout": 30000                            // Optional, default 30s, max 300s
}
```

## Schedule Types

### 1. Recurring Schedules

Use cron expressions for API calls that repeat on a regular schedule:

```javascript
{
  "schedule": {
    "cron": "0 9 * * 1-5",  // Weekdays at 9 AM
    "timezone": "America/New_York"
  }
}
```

### 2. One-time Schedules

Use the `at` field for API calls that run once:

```javascript
{
  "schedule": {
    "at": "2024-12-25T09:00:00Z"  // Christmas morning UTC
  }
}
```

### 3. Limited Schedules

Add constraints to recurring schedules:

```javascript
{
  "schedule": {
    "cron": "0 10 * * *",                    // Daily at 10 AM
    "endDate": "2025-01-31T23:59:59Z",      // Stop after this date
    "limit": 30                              // Maximum 30 executions
  }
}
```

## Cron Expression Format

Standard cron expressions are supported:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of the month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of the week (0 - 7) (0 or 7 is Sunday)
│ │ │ │ │
* * * * *
```

### Common Patterns

- `0 9 * * *` - Every day at 9 AM
- `*/15 * * * *` - Every 15 minutes
- `0 9 * * 1-5` - Weekdays at 9 AM
- `0 0 * * 0` - Every Sunday at midnight
- `0 */2 * * *` - Every 2 hours
- `0 9 1 * *` - First day of every month at 9 AM

## Retry Policy

Configure how failed API calls are retried:

```json
{
  "retryPolicy": {
    "attempts": 3,        // Number of retry attempts (max 10)
    "backoff": {
      "type": "exponential",  // or "fixed"
      "delay": 5000          // Initial delay in ms
    }
  }
}
```

- **Exponential backoff**: Delay doubles with each attempt (5s, 10s, 20s...)
- **Fixed backoff**: Same delay between attempts
- **4xx errors**: No retry (client errors)
- **5xx errors**: Automatic retry with backoff

## Use Cases

### 1. Trigger Report Generation
```javascript
{
  "name": "daily-analytics",
  "endpoint": {
    "url": "https://api.analytics.com/reports/generate",
    "method": "POST",
    "body": { "type": "daily", "date": "today" }
  },
  "schedule": { "cron": "0 6 * * *" }
}
```

### 2. Health Monitoring
```javascript
{
  "name": "api-health-check",
  "endpoint": {
    "url": "https://api.myservice.com/health",
    "method": "GET"
  },
  "schedule": { "cron": "*/5 * * * *" }  // Every 5 minutes
}
```

### 3. Webhook Notifications
```javascript
{
  "name": "event-webhook",
  "endpoint": {
    "url": "https://webhook.site/unique-url",
    "method": "POST",
    "body": { "event": "scheduled", "data": {} }
  },
  "schedule": { "at": "2024-12-01T14:00:00Z" }
}
```

### 4. Data Synchronization
```javascript
{
  "name": "nightly-sync",
  "endpoint": {
    "url": "https://api.data.com/sync",
    "method": "POST",
    "body": { "mode": "incremental" }
  },
  "schedule": { "cron": "0 2 * * *" }  // 2 AM daily
}
```

### 5. Cache Warming
```javascript
{
  "name": "cache-refresh",
  "endpoint": {
    "url": "https://api.cache.com/warm",
    "method": "POST"
  },
  "schedule": { "cron": "0 */4 * * *" }  // Every 4 hours
}
```

## Execution Status

Schedules track execution information:

- `lastExecutedAt`: Timestamp of last execution
- `lastExecutionStatus`: "success" or "failed"
- `lastExecutionError`: Error message if failed
- `nextExecutionAt`: Next scheduled execution
- `executionCount`: Total number of executions

## Best Practices

1. **Unique Names**: Use descriptive, unique names for schedules
2. **Timeouts**: Set appropriate timeouts for your API calls
3. **Retry Strategy**: Configure retries based on endpoint reliability
4. **Error Handling**: Monitor `lastExecutionError` for failures
5. **Security**: Store sensitive tokens securely, not in schedule metadata
6. **Timezone**: Always specify timezone for user-facing schedules
7. **Monitoring**: Use the execution status to track schedule health

## GraphQL Support

The scheduler supports GraphQL endpoints:

```json
{
  "endpoint": {
    "url": "https://api.graphql.com/graphql",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "query": "query { users { id name } }",
      "variables": {}
    }
  }
}
```

## Security Considerations

- This service is for internal use only - ensure it's not exposed publicly
- API credentials should be stored securely
- Use HTTPS for all endpoint URLs
- Consider implementing IP whitelisting for sensitive endpoints
- Monitor failed executions for potential security issues

## Troubleshooting

### Schedule Not Executing
- Check if schedule is enabled
- Verify cron expression is valid
- Confirm timezone is correct
- Check if end date or limit reached

### API Call Failing
- Verify endpoint URL is correct
- Check authentication headers
- Confirm request body format
- Review timeout settings
- Check `lastExecutionError` for details

### Wrong Execution Time
- Verify timezone setting
- Account for daylight saving time
- Check server time configuration

## Performance Considerations

- Schedules are checked every minute
- HTTP calls run with configured concurrency (default: 5)
- Large request/response bodies may impact performance
- Consider timeout settings for long-running endpoints