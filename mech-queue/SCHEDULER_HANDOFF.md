# Mech Queue Scheduler Implementation - Handoff Document

## Overview

This document outlines the implementation of a scheduler feature for the Mech Queue service that allows agents to schedule HTTP API calls to run at specific times or on recurring schedules.

## Current Implementation Status

### ✅ Completed

1. **Data Models**
   - Created `Schedule` model (`src/models/schedule.model.ts`)
   - Stores endpoint configuration, schedule timing, retry policy
   - Tracks execution history and status

2. **Type Definitions**
   - Created schedule types (`src/types/schedule.types.ts`)
   - DTOs for create, update, list operations
   - Response formatting

3. **Service Layer**
   - Created `ScheduleService` (`src/services/schedule.service.ts`)
   - Handles CRUD operations for schedules
   - Integrates with BullMQ for job scheduling
   - Executes HTTP calls with retry logic

4. **API Routes**
   - Created REST endpoints (`src/routes/schedule.routes.ts`)
   - No authentication required (internal use)
   - Full validation using express-validator

5. **Worker**
   - Created scheduler worker (`src/workers/scheduler.worker.ts`)
   - Processes scheduled jobs from the queue
   - Executes HTTP calls

6. **Documentation**
   - API documentation (`docs/SCHEDULING.md`)
   - Example usage (`examples/scheduling-api-calls.ts`)

### ❌ Pending

1. **Service Startup**
   - MongoDB dependency issues preventing service startup
   - Need to resolve optional dependency loading

2. **Testing**
   - Service needs to be started and tested end-to-end
   - Verify HTTP calls are executed correctly
   - Test retry logic and error handling

## Architecture

### How It Works

1. **Schedule Creation**
   - Agent calls `POST /api/schedules` with endpoint config and timing
   - Schedule is saved to MongoDB
   - If enabled, a BullMQ job is created with cron pattern or delay

2. **Job Execution**
   - BullMQ triggers jobs based on schedule
   - Scheduler worker picks up the job
   - Worker loads schedule from MongoDB
   - Makes HTTP call with configured method, headers, body
   - Handles retries with exponential backoff
   - Updates execution status in MongoDB

3. **Schedule Management**
   - CRUD operations for managing schedules
   - Enable/disable without deletion
   - Manual execution for testing
   - Execution history tracking

### Key Features

- **Cron Patterns**: Standard cron expressions for recurring schedules
- **One-time Execution**: Schedule jobs for specific datetime
- **Timezone Support**: All timezones supported
- **Retry Logic**: Configurable attempts with exponential/fixed backoff
- **HTTP Methods**: GET, POST, PUT, DELETE, PATCH
- **Custom Headers/Body**: Full request customization
- **Execution Limits**: Max executions or end date constraints

## API Endpoints

### Create Schedule
```http
POST /api/schedules
Content-Type: application/json

{
  "name": "daily-report",
  "endpoint": {
    "url": "https://api.example.com/trigger",
    "method": "POST",
    "headers": { "Authorization": "Bearer token" },
    "body": { "type": "daily" },
    "timeout": 30000
  },
  "schedule": {
    "cron": "0 9 * * *",
    "timezone": "America/New_York"
  },
  "retryPolicy": {
    "attempts": 3,
    "backoff": { "type": "exponential", "delay": 5000 }
  }
}
```

### Other Endpoints
- `GET /api/schedules` - List all schedules
- `GET /api/schedules/{id}` - Get schedule details
- `PUT /api/schedules/{id}` - Update schedule
- `DELETE /api/schedules/{id}` - Delete schedule
- `PATCH /api/schedules/{id}/toggle` - Enable/disable
- `POST /api/schedules/{id}/execute` - Execute immediately

## Implementation Issues

### MongoDB Dependencies

The service currently fails to start due to MongoDB optional dependencies:
- MongoDB driver (v6.17.0) tries to load Azure/AWS/GCP providers for encryption
- These are optional but cause MODULE_NOT_FOUND errors
- The loading happens in `mongodb/lib/encrypter.js` when checking for encryption support
- Even though we don't use encryption, the driver still tries to load these modules

### Root Cause

The MongoDB driver attempts to load optional dependencies at startup:
1. `./azure` - Azure Key Vault support
2. `@aws-sdk/credential-providers` - AWS KMS support  
3. `gcp-metadata` - Google Cloud KMS support
4. `mongodb-client-encryption` - Client-side field encryption

This happens even when not using these features because the driver checks for their availability.

### Recommended Solution

1. **Option A: Create Stub Modules (Simplest)**
   ```bash
   # Create stub files for the optional dependencies
   mkdir -p node_modules/mongodb/lib/client-side-encryption/providers
   echo "module.exports = {}" > node_modules/mongodb/lib/client-side-encryption/providers/azure.js
   
   # Add to package.json scripts for persistence:
   "postinstall": "node scripts/create-mongodb-stubs.js"
   ```

2. **Option B: Use MongoDB Connection Options**
   ```javascript
   // Try disabling auto-encryption explicitly
   await mongoose.connect(uri, {
     autoEncryption: false,
     // Or try bypassing the encrypter
     driver: { 
       // This might bypass encryption checks
     }
   });
   ```

3. **Option C: Downgrade to MongoDB Driver v5**
   ```json
   "dependencies": {
     "mongoose": "^7.0.0"  // Uses mongodb driver v5.x
   }
   ```

4. **Option D: Use a Module Alias**
   ```javascript
   // In a setup file loaded before anything else
   require('module-alias').addAliases({
     './azure': path.join(__dirname, 'stubs/empty.js'),
     '@aws-sdk/credential-providers': path.join(__dirname, 'stubs/empty.js')
   });
   ```

## Testing Plan

Once service starts:

1. **Basic Functionality**
   ```bash
   # Create test schedule
   curl -X POST http://localhost:3003/api/schedules \
     -H "Content-Type: application/json" \
     -d '{
       "name": "test-webhook",
       "endpoint": {
         "url": "https://webhook.site/YOUR-ID",
         "method": "POST",
         "body": { "test": true }
       },
       "schedule": { "cron": "*/1 * * * *" }
     }'

   # Execute immediately
   curl -X POST http://localhost:3003/api/schedules/{id}/execute
   ```

2. **Verify Execution**
   - Check webhook.site for received requests
   - Verify retry logic on failure
   - Test timezone handling

3. **Edge Cases**
   - Invalid cron expressions
   - Network timeouts
   - 4xx vs 5xx error handling
   - Schedule limits and end dates

## File Structure

```
mech-queue/
├── src/
│   ├── models/
│   │   └── schedule.model.ts      # MongoDB schema
│   ├── types/
│   │   └── schedule.types.ts      # TypeScript interfaces
│   ├── services/
│   │   └── schedule.service.ts    # Business logic
│   ├── routes/
│   │   └── schedule.routes.ts     # REST endpoints
│   └── workers/
│       └── scheduler.worker.ts    # Job processor
├── docs/
│   └── SCHEDULING.md             # User documentation
└── examples/
    └── scheduling-api-calls.ts   # Usage examples
```

## Next Steps

1. **Resolve MongoDB dependency issues**
   - This is blocking all testing
   - See "Implementation Issues" section for options

2. **Start service and test**
   - Run through testing plan
   - Verify all features work as expected

3. **Production considerations**
   - Add monitoring/alerting for failed schedules
   - Consider rate limiting for HTTP calls
   - Add dashboard UI for schedule management
   - Implement schedule templates

## Environment Variables

No new environment variables needed. Uses existing:
- `MONGODB_URI` - Database connection
- `REDIS_*` - Redis/BullMQ configuration
- Standard mech-queue configuration

## Dependencies Added

- `cron-parser` - Parsing and validating cron expressions
- `luxon` - Timezone handling
- `express-validator` - Input validation
- `axios` - HTTP client (already present)

## Security Considerations

- No authentication (internal use only)
- Validate all endpoint URLs
- Consider adding:
  - IP whitelist for target endpoints
  - Rate limiting per schedule
  - Secrets management for auth tokens

## Support

For questions about:
- Implementation details: See code comments
- API usage: See `docs/SCHEDULING.md`
- Examples: See `examples/scheduling-api-calls.ts`