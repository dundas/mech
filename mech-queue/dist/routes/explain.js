"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// API Overview
router.get('/', (req, res) => {
    const explanation = {
        service: 'Queue Service API',
        version: '1.0.0',
        description: 'Multi-application background job processing service',
        authentication: {
            method: 'API Key',
            header: 'x-api-key',
            obtaining: 'Use POST /api/applications with master key to create new applications',
        },
        mainEndpoints: {
            '/api/jobs': 'Job submission and management',
            '/api/queues': 'Queue information and control',
            '/api/webhooks': 'Webhook configuration and testing',
            '/api/subscriptions': 'Event subscriptions with metadata filtering',
            '/api/applications': 'Application management (master key required)',
            '/api/explain': 'API documentation and help',
        },
        commonPatterns: {
            submitJob: 'POST /api/jobs/{queueName}',
            checkStatus: 'GET /api/jobs/{queueName}/{jobId}',
            listQueues: 'GET /api/queues',
            setupWebhook: 'POST /api/webhooks',
        },
        quickStart: [
            '1. Get an API key from your admin or create an application',
            '2. Include x-api-key header in all requests',
            '3. Submit jobs to appropriate queues',
            '4. Monitor job status using the job ID',
        ],
    };
    res.json({ success: true, data: explanation });
});
// Authentication explanation
router.get('/auth', (req, res) => {
    const explanation = {
        overview: 'All API endpoints require authentication via API key',
        howToAuthenticate: {
            header: 'x-api-key',
            format: 'sk_[random-string]',
            example: 'x-api-key: sk_a1b2c3d4e5f6g7h8i9j0',
        },
        obtainingApiKey: {
            method: 'POST /api/applications',
            requires: 'Master API key',
            example: {
                curl: 'curl -X POST http://localhost:3003/api/applications -H "x-api-key: master_key" -H "Content-Type: application/json" -d \'{"name":"My App"}\'',
            },
        },
        applicationPermissions: {
            allowedQueues: 'Array of queue names or ["*"] for all queues',
            rateLimit: 'Requests per minute (default: 100)',
        },
        commonErrors: {
            MISSING_API_KEY: 'Include x-api-key header',
            INVALID_API_KEY: 'Check if key is correct and active',
        },
        securityTips: [
            'Keep API keys secure and rotate regularly',
            'Use environment variables for storage',
            'Never commit API keys to version control',
        ],
    };
    res.json({ success: true, data: explanation });
});
// Jobs endpoint explanation
router.get('/jobs', (req, res) => {
    const explanation = {
        overview: 'Job submission and management endpoints - now with metadata filtering and webhooks',
        endpoints: {
            'POST /api/jobs': {
                description: 'Submit a new job to any queue (domain-agnostic)',
                body: {
                    queue: 'Target queue name (created automatically if needed)',
                    data: 'Job payload (required, any JSON)',
                    metadata: 'Custom metadata for filtering (optional)',
                    webhooks: 'Status change webhooks (optional)',
                    options: {
                        delay: 'Delay in milliseconds before processing',
                        priority: 'Job priority (higher = processed first)',
                        attempts: 'Maximum retry attempts',
                        backoff: {
                            type: 'exponential or fixed',
                            delay: 'Initial delay in ms',
                        },
                    },
                },
                example: {
                    curl: 'curl -X POST http://localhost:3003/api/jobs/email -H "x-api-key: your-key" -H "Content-Type: application/json" -d \'{"name":"send-welcome","data":{"to":"user@example.com","subject":"Welcome!"}}\'',
                },
                response: {
                    jobId: 'Unique job identifier',
                    queue: 'Queue name',
                    status: 'Initial status (usually "waiting")',
                },
            },
            'GET /api/jobs/{queueName}/{jobId}': {
                description: 'Get job status and details',
                parameters: {
                    queueName: 'Queue name',
                    jobId: 'Job ID from submission',
                },
                possibleStatuses: [
                    'waiting: Job is queued',
                    'active: Currently processing',
                    'completed: Successfully finished',
                    'failed: Processing failed',
                    'delayed: Scheduled for later',
                ],
            },
            'DELETE /api/jobs/{queueName}/{jobId}': {
                description: 'Cancel/remove a job',
                note: 'Only works for waiting or delayed jobs',
            },
        },
        commonPatterns: {
            fireAndForget: 'Submit job and don\'t check status',
            pollForCompletion: 'Submit job, then poll GET endpoint until completed',
            batchSubmission: 'Submit multiple jobs in parallel for better performance',
        },
        bestPractices: [
            'Always handle job submission errors',
            'Implement exponential backoff when polling',
            'Set reasonable timeout values',
            'Use job names for easier debugging',
        ],
    };
    res.json({ success: true, data: explanation });
});
// Specific job submission explanation
router.get('/jobs/:queueName', (req, res) => {
    const { queueName } = req.params;
    const queueExamples = {
        email: {
            description: 'Email sending queue',
            requiredFields: {
                to: 'Recipient email(s) - string or array',
                subject: 'Email subject line',
                body: 'Plain text body (required if no html)',
                html: 'HTML body (optional)',
            },
            optionalFields: {
                from: 'Sender email (uses default if not provided)',
                cc: 'Carbon copy recipients',
                bcc: 'Blind carbon copy recipients',
                attachments: 'Array of attachment objects',
            },
            example: {
                name: 'welcome-email',
                data: {
                    to: 'user@example.com',
                    subject: 'Welcome to our service!',
                    html: '<h1>Welcome!</h1><p>Thanks for joining...</p>',
                    from: 'noreply@company.com',
                },
            },
            commonErrors: [
                'Missing required fields (to, subject, body/html)',
                'Invalid email format',
                'Attachment size limits',
            ],
        },
        webhook: {
            description: 'HTTP webhook delivery',
            requiredFields: {
                url: 'Target webhook URL',
            },
            optionalFields: {
                method: 'HTTP method (default: POST)',
                headers: 'Custom headers object',
                data: 'Request body (any JSON)',
                timeout: 'Request timeout in ms (default: 30000)',
            },
            example: {
                name: 'user-event',
                data: {
                    url: 'https://example.com/webhook',
                    method: 'POST',
                    headers: {
                        'X-Webhook-Secret': 'shared-secret',
                    },
                    data: {
                        event: 'user.created',
                        userId: '123',
                        timestamp: new Date().toISOString(),
                    },
                },
            },
            retryBehavior: 'Retries on 5xx errors and network failures',
        },
        'ai-processing': {
            description: 'AI/ML processing tasks',
            types: {
                completion: 'Text generation',
                embedding: 'Generate embeddings',
                moderation: 'Content moderation',
                'image-generation': 'Generate images',
            },
            requiredFields: {
                type: 'Processing type (see types above)',
                prompt: 'Text prompt (for completion/image)',
                input: 'Input text (for embedding/moderation)',
            },
            optionalFields: {
                model: 'Model to use (defaults provided)',
                options: 'Model-specific options',
            },
            example: {
                name: 'generate-description',
                data: {
                    type: 'completion',
                    prompt: 'Write a product description for organic coffee',
                    model: 'gpt-3.5-turbo',
                    options: {
                        temperature: 0.7,
                        max_tokens: 200,
                    },
                },
            },
            prerequisites: 'Requires OPENAI_API_KEY in environment',
        },
    };
    const queueInfo = queueExamples[queueName];
    if (!queueInfo) {
        return res.status(404).json({
            success: false,
            error: {
                code: 'QUEUE_NOT_DOCUMENTED',
                message: `No documentation available for queue: ${queueName}`,
                hints: [
                    'Use GET /api/queues to see all available queues',
                    'Common queues: email, webhook, ai-processing',
                ],
            },
        });
    }
    res.json({
        success: true,
        data: {
            queue: queueName,
            ...queueInfo,
            submitEndpoint: `/api/jobs/${queueName}`,
            statusEndpoint: `/api/jobs/${queueName}/{jobId}`,
        },
    });
});
// Queues explanation
router.get('/queues', (req, res) => {
    const explanation = {
        overview: 'Queue information and management',
        availableQueues: [
            { name: 'email', description: 'Email sending', concurrency: 'High' },
            { name: 'webhook', description: 'HTTP webhooks', concurrency: 'High' },
            { name: 'image-processing', description: 'Image manipulation', concurrency: 'Medium' },
            { name: 'pdf-generation', description: 'PDF creation', concurrency: 'Medium' },
            { name: 'data-export', description: 'Large exports', concurrency: 'Low' },
            { name: 'ai-processing', description: 'AI/ML tasks', concurrency: 'Medium' },
            { name: 'scheduled-tasks', description: 'Cron-like jobs', concurrency: 'High' },
            { name: 'notifications', description: 'Push notifications', concurrency: 'High' },
            { name: 'social-media', description: 'Social posting', concurrency: 'Medium' },
            { name: 'web-scraping', description: 'Web scraping', concurrency: 'Medium' },
        ],
        endpoints: {
            'GET /api/queues': 'List accessible queues',
            'GET /api/queues/stats': 'Statistics for all queues',
            'GET /api/queues/{name}/stats': 'Statistics for specific queue',
            'POST /api/queues/{name}/pause': 'Pause queue (admin only)',
            'POST /api/queues/{name}/resume': 'Resume queue (admin only)',
            'POST /api/queues/{name}/clean': 'Clean old jobs (admin only)',
        },
        statistics: {
            waiting: 'Jobs waiting to be processed',
            active: 'Jobs currently being processed',
            completed: 'Successfully completed jobs',
            failed: 'Failed jobs',
            delayed: 'Jobs scheduled for future',
            paused: 'Whether queue is paused',
        },
        choosingQueues: [
            'Use dedicated queues for different job types',
            'Consider concurrency limits',
            'Heavy jobs should use low-concurrency queues',
            'Time-sensitive jobs need high-priority queues',
        ],
    };
    res.json({ success: true, data: explanation });
});
// Error codes explanation
router.get('/errors', (req, res) => {
    const explanation = {
        overview: 'Common error codes and solutions',
        errorStructure: {
            success: 'Always false for errors',
            error: {
                code: 'Machine-readable error code',
                message: 'Human-readable description',
                hints: 'Suggestions for fixing',
                possibleCauses: 'Why this might happen',
                suggestedFixes: 'Concrete solutions',
                details: 'Additional context (dev mode)',
            },
        },
        commonErrors: {
            MISSING_API_KEY: {
                status: 401,
                cause: 'No x-api-key header provided',
                fix: 'Add x-api-key header to request',
            },
            INVALID_API_KEY: {
                status: 401,
                cause: 'API key not found or revoked',
                fix: 'Check key or create new application',
            },
            QUEUE_NOT_FOUND: {
                status: 404,
                cause: 'Queue name incorrect or not registered',
                fix: 'Use GET /api/queues for valid names',
            },
            JOB_NOT_FOUND: {
                status: 404,
                cause: 'Job ID incorrect or job completed/removed',
                fix: 'Verify job ID and check if still exists',
            },
            QUEUE_ACCESS_DENIED: {
                status: 403,
                cause: 'Tenant not allowed to use this queue',
                fix: 'Check application permissions or use allowed queue',
            },
            VALIDATION_ERROR: {
                status: 400,
                cause: 'Request body invalid or missing fields',
                fix: 'Check /api/explain/jobs/{queue} for requirements',
            },
            RATE_LIMIT_EXCEEDED: {
                status: 429,
                cause: 'Too many requests in time window',
                fix: 'Wait for reset or implement backoff',
                headers: {
                    'X-RateLimit-Limit': 'Request limit',
                    'X-RateLimit-Remaining': 'Requests left',
                    'X-RateLimit-Reset': 'Reset timestamp',
                },
            },
        },
        debuggingTips: [
            'Check error.hints array for quick solutions',
            'Use /api/explain endpoints for detailed docs',
            'Enable NODE_ENV=development for stack traces',
            'Check service logs for detailed errors',
        ],
    };
    res.json({ success: true, data: explanation });
});
// Patterns and best practices
router.get('/patterns', (req, res) => {
    const explanation = {
        overview: 'Common patterns and best practices',
        patterns: {
            reliableJobSubmission: {
                description: 'Ensure jobs are submitted successfully',
                implementation: [
                    '1. Submit job with unique idempotency key',
                    '2. Store job ID in your database',
                    '3. Handle submission failures with retry',
                    '4. Poll for status if needed',
                ],
                code: `
// Reliable submission with retry
async function submitJobReliably(queueName, jobData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(\`/api/jobs/\${queueName}\`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: \`job-\${Date.now()}\`,
          data: jobData,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.data.jobId;
      }
      
      // Don't retry on client errors
      if (response.status >= 400 && response.status < 500) {
        throw new Error(\`Client error: \${response.status}\`);
      }
      
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}`,
            },
            pollingForCompletion: {
                description: 'Wait for job completion efficiently',
                implementation: [
                    '1. Submit job and get ID',
                    '2. Poll with exponential backoff',
                    '3. Handle timeout gracefully',
                    '4. Process results or errors',
                ],
                code: `
// Poll for job completion
async function waitForJob(queueName, jobId, timeoutMs = 60000) {
  const startTime = Date.now();
  let delay = 1000; // Start with 1 second
  
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(\`/api/jobs/\${queueName}/\${jobId}\`, {
      headers: { 'x-api-key': API_KEY },
    });
    
    if (!response.ok) {
      throw new Error(\`Failed to check job status: \${response.status}\`);
    }
    
    const result = await response.json();
    const status = result.data.status;
    
    if (status === 'completed') {
      return result.data.result;
    } else if (status === 'failed') {
      throw new Error(\`Job failed: \${result.data.error}\`);
    }
    
    // Exponential backoff with max delay
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 10000); // Max 10 seconds
  }
  
  throw new Error('Job timeout');
}`,
            },
            batchProcessing: {
                description: 'Process multiple jobs efficiently',
                tips: [
                    'Submit jobs in parallel, not sequentially',
                    'Use Promise.allSettled for robustness',
                    'Group related jobs for easier tracking',
                    'Consider queue capacity',
                ],
                code: `
// Batch job submission
async function submitBatch(queueName, items) {
  const submissions = items.map(item => 
    fetch(\`/api/jobs/\${queueName}\`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: \`batch-\${Date.now()}-\${item.id}\`,
        data: item,
      }),
    }).then(r => r.json())
  );
  
  const results = await Promise.allSettled(submissions);
  
  return results.map((result, index) => ({
    item: items[index],
    success: result.status === 'fulfilled',
    jobId: result.status === 'fulfilled' ? result.value.data.jobId : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
}`,
            },
        },
        bestPractices: [
            'Always include error handling',
            'Use meaningful job names for debugging',
            'Implement idempotency for critical jobs',
            'Monitor queue statistics regularly',
            'Set appropriate timeouts',
            'Use structured logging',
            'Test failure scenarios',
        ],
        aiAgentTips: [
            'Parse error hints array for quick fixes',
            'Use /api/explain endpoints when confused',
            'Check rate limit headers before retrying',
            'Implement exponential backoff automatically',
            'Store job IDs for status tracking',
        ],
    };
    res.json({ success: true, data: explanation });
});
// Webhooks explanation
router.get('/webhooks', (req, res) => {
    const explanation = {
        overview: 'Real-time webhook notifications for job events',
        description: 'Get instant notifications when jobs complete, fail, or change status',
        availableEvents: [
            { event: 'job.created', description: 'Job added to queue' },
            { event: 'job.started', description: 'Job started processing' },
            { event: 'job.completed', description: 'Job completed successfully' },
            { event: 'job.failed', description: 'Job failed or errored' },
            { event: 'job.progress', description: 'Job progress updated' },
            { event: 'job.stalled', description: 'Job stalled or timed out' },
            { event: 'queue.paused', description: 'Queue was paused' },
            { event: 'queue.resumed', description: 'Queue was resumed' },
        ],
        endpoints: {
            'POST /api/webhooks': {
                description: 'Create a new webhook',
                requiredFields: {
                    url: 'Target webhook URL (must be HTTPS in production)',
                    events: 'Array of events to subscribe to',
                },
                optionalFields: {
                    queues: 'Array of queue names or ["*"] for all queues',
                    headers: 'Custom headers to include',
                    retryConfig: 'Retry configuration object',
                },
                example: {
                    url: 'https://your-app.com/webhooks/queue-events',
                    events: ['job.completed', 'job.failed'],
                    queues: ['email', 'webhook'],
                    headers: {
                        'Authorization': 'Bearer your-token',
                    },
                    retryConfig: {
                        maxAttempts: 3,
                        backoffMultiplier: 2,
                        initialDelay: 1000,
                    },
                },
                response: {
                    id: 'Webhook ID',
                    secret: 'Webhook signing secret',
                    url: 'Configured URL',
                    events: 'Subscribed events',
                },
            },
            'GET /api/webhooks': 'List all webhooks',
            'GET /api/webhooks/{id}': 'Get specific webhook details',
            'PATCH /api/webhooks/{id}': 'Update webhook configuration',
            'DELETE /api/webhooks/{id}': 'Delete webhook',
            'POST /api/webhooks/{id}/test': 'Send test webhook',
            'POST /api/webhooks/{id}/regenerate-secret': 'Generate new signing secret',
        },
        webhookPayload: {
            structure: {
                event: 'Event name (e.g., "job.completed")',
                timestamp: 'ISO 8601 timestamp',
                data: {
                    jobId: 'Job identifier',
                    queue: 'Queue name',
                    status: 'Current job status',
                    result: 'Job result (for completed jobs)',
                    error: 'Error message (for failed jobs)',
                    progress: 'Progress percentage (for progress events)',
                    application: {
                        id: 'Application ID',
                        name: 'Application name',
                    },
                },
            },
            example: {
                event: 'job.completed',
                timestamp: '2024-01-20T10:00:00Z',
                data: {
                    jobId: '123',
                    queue: 'email',
                    status: 'completed',
                    result: {
                        messageId: 'msg_abc123',
                        sentAt: '2024-01-20T10:00:05Z',
                    },
                    application: {
                        id: 'application_123',
                        name: 'My Application',
                    },
                    createdAt: '2024-01-20T09:59:55Z',
                },
            },
        },
        security: {
            signatureVerification: {
                header: 'X-Webhook-Signature',
                algorithm: 'HMAC-SHA256',
                verification: `
// Node.js/Express example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// In your webhook handler
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhook(req.body, signature, 'your-webhook-secret');
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
  res.status(200).send('OK');
});`,
            },
            headers: {
                'X-Webhook-Signature': 'HMAC signature for verification',
                'X-Webhook-Event': 'Event type',
                'X-Webhook-Timestamp': 'Delivery timestamp',
                'X-Webhook-Attempt': 'Attempt number (for retries)',
            },
        },
        retryBehavior: {
            conditions: 'Retries on 5xx errors and network failures',
            backoff: 'Exponential backoff with jitter',
            maxAttempts: 'Configurable (default: 3)',
            disabling: 'Webhooks disabled after 10 consecutive failures',
            clientErrors: '4xx errors are not retried',
        },
        bestPractices: [
            'Always verify webhook signatures',
            'Respond with 2xx status codes quickly',
            'Process webhooks asynchronously if needed',
            'Use HTTPS URLs in production',
            'Implement idempotency for duplicate deliveries',
            'Set up monitoring for webhook failures',
        ],
        troubleshooting: {
            commonIssues: {
                timeouts: 'Ensure your endpoint responds within 30 seconds',
                ssl: 'Use valid SSL certificates for HTTPS URLs',
                firewalls: 'Ensure webhook URLs are publicly accessible',
                signatures: 'Verify you\'re using the correct secret',
            },
            testing: 'Use POST /api/webhooks/{id}/test to send test events',
            debugging: 'Check webhook failure count and last triggered time',
        },
    };
    res.json({ success: true, data: explanation });
});
// Subscriptions explanation
router.get('/subscriptions', (req, res) => {
    const explanation = {
        overview: 'Event subscriptions for real-time job notifications with metadata-based filtering',
        description: 'Subscribe to job events based on specific criteria like queue, status, and metadata values',
        keyFeatures: [
            'Filter by metadata fields (e.g., priority=high, customerId=X)',
            'Subscribe to specific queues or all queues',
            'Multiple event types (created, started, progress, completed, failed)',
            'Custom headers for authentication',
            'Automatic retry with exponential backoff',
            'Real-time event delivery',
        ],
        endpoints: {
            'POST /api/subscriptions': {
                description: 'Create a new subscription',
                requiredFields: {
                    name: 'Subscription name for identification',
                    endpoint: 'HTTPS URL to receive events',
                    events: 'Array of event types to subscribe to',
                },
                optionalFields: {
                    description: 'Human-readable description',
                    method: 'HTTP method (POST or PUT, default: POST)',
                    headers: 'Custom headers to include in requests',
                    filters: {
                        queues: 'Array of queue names to monitor',
                        statuses: 'Array of job statuses to filter',
                        metadata: 'Key-value pairs for metadata filtering',
                    },
                    retryConfig: {
                        maxAttempts: 'Maximum retry attempts (default: 3)',
                        backoffMs: 'Initial backoff delay in ms (default: 1000)',
                    },
                },
                example: {
                    name: 'High Priority Email Monitor',
                    description: 'Alert on high priority email job failures',
                    endpoint: 'https://alerts.myapp.com/webhook',
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer webhook-secret',
                    },
                    filters: {
                        queues: ['email'],
                        metadata: {
                            priority: 'high',
                            type: 'transactional',
                        },
                    },
                    events: ['failed', 'completed'],
                    retryConfig: {
                        maxAttempts: 5,
                        backoffMs: 2000,
                    },
                },
            },
            'GET /api/subscriptions': {
                description: 'List all subscriptions for your application',
                queryParams: {
                    active: 'Filter by active status (true/false)',
                    queue: 'Filter by queue name',
                },
            },
            'GET /api/subscriptions/{id}': 'Get detailed subscription info',
            'PUT /api/subscriptions/{id}': 'Update subscription configuration',
            'DELETE /api/subscriptions/{id}': 'Delete subscription',
            'POST /api/subscriptions/{id}/test': 'Send test event to verify endpoint',
        },
        eventTypes: {
            created: 'Job submitted to queue',
            started: 'Job picked up by worker',
            progress: 'Job progress updated',
            completed: 'Job finished successfully',
            failed: 'Job failed with error',
        },
        eventPayload: {
            structure: {
                subscription: {
                    id: 'Subscription ID',
                    name: 'Subscription name',
                },
                event: {
                    type: 'Event type (e.g., completed)',
                    timestamp: 'ISO 8601 timestamp',
                },
                job: {
                    id: 'Job ID',
                    queue: 'Queue name',
                    status: 'Current status',
                    data: 'Original job data',
                    metadata: 'Job metadata',
                    result: 'Job result (for completed)',
                    error: 'Error message (for failed)',
                    progress: 'Progress percentage',
                },
            },
            headers: {
                'Content-Type': 'application/json',
                'X-Subscription-Id': 'Subscription ID',
                'X-Job-Id': 'Job ID',
                'X-Job-Status': 'Job status',
                'X-Application-Id': 'Your application ID',
                // Plus any custom headers configured
            },
        },
        useCases: {
            criticalJobMonitoring: {
                description: 'Monitor critical jobs for immediate action',
                example: {
                    name: 'Payment Processing Monitor',
                    filters: {
                        queues: ['payments'],
                        metadata: { amount: { $gte: 1000 } },
                    },
                    events: ['failed'],
                    endpoint: 'https://alerts.myapp.com/critical',
                },
            },
            customerTracking: {
                description: 'Track all jobs for specific customers',
                example: {
                    name: 'VIP Customer Activity',
                    filters: {
                        metadata: { customerId: 'vip-123', tier: 'premium' },
                    },
                    events: ['created', 'completed', 'failed'],
                    endpoint: 'https://crm.myapp.com/customer-events',
                },
            },
            realtimeDashboard: {
                description: 'Feed real-time data to dashboards',
                example: {
                    name: 'Operations Dashboard Feed',
                    filters: {}, // No filters - all events
                    events: ['created', 'started', 'completed', 'failed'],
                    endpoint: 'wss://dashboard.myapp.com/live',
                },
            },
            failureAlerting: {
                description: 'Alert on specific types of failures',
                example: {
                    name: 'Email Delivery Failures',
                    filters: {
                        queues: ['email'],
                        statuses: ['failed'],
                        metadata: { errorType: 'delivery_failed' },
                    },
                    events: ['failed'],
                    endpoint: 'https://oncall.myapp.com/alert',
                },
            },
        },
        filteringExamples: {
            byPriority: {
                filters: { metadata: { priority: 'high' } },
                description: 'Only high priority jobs',
            },
            byCustomer: {
                filters: { metadata: { customerId: 'cust-123' } },
                description: 'All jobs for specific customer',
            },
            byMultipleFields: {
                filters: {
                    queues: ['email', 'sms'],
                    metadata: {
                        priority: 'high',
                        region: 'us-east',
                    },
                },
                description: 'High priority communication jobs in US East',
            },
            byStatus: {
                filters: {
                    statuses: ['failed'],
                    metadata: { retryable: true },
                },
                description: 'Failed jobs that can be retried',
            },
        },
        bestPractices: [
            'Use HTTPS endpoints for security',
            'Implement signature verification if sensitive data',
            'Respond quickly (within 30s) to avoid timeouts',
            'Handle duplicate events (idempotency)',
            'Use specific filters to reduce noise',
            'Monitor subscription health (triggerCount, lastTriggeredAt)',
            'Test subscriptions with /test endpoint before production',
        ],
        troubleshooting: {
            notReceivingEvents: [
                'Check if subscription is active',
                'Verify endpoint is publicly accessible',
                'Ensure filters match your job metadata',
                'Check SSL certificate validity',
                'Test with broader filters first',
            ],
            tooManyEvents: [
                'Add more specific metadata filters',
                'Filter by specific queues',
                'Use fewer event types',
            ],
            authenticationIssues: [
                'Verify custom headers are correct',
                'Check if endpoint expects specific auth format',
                'Test with curl to verify endpoint',
            ],
        },
    };
    res.json({ success: true, data: explanation });
});
exports.default = router;
//# sourceMappingURL=explain.js.map