// Enhanced Job Tracking with Metadata Filtering and Webhooks

import axios from 'axios';

const API_URL = 'http://localhost:3003/api/jobs';
const API_KEY = 'your-api-key';

async function examples() {
  // 1. Submit job with metadata and webhooks
  console.log('=== Submit Job with Metadata and Webhooks ===');
  
  const emailJobResponse = await axios.post(
    API_URL,
    {
      queue: 'email',
      data: {
        to: 'user@example.com',
        subject: 'Order Confirmation',
        body: 'Your order has been confirmed!',
      },
      metadata: {
        type: 'transactional',
        priority: 'high',
        customerId: 'cust-123',
        orderId: 'order-456',
      },
      webhooks: {
        'completed': 'https://myapp.com/webhooks/email-sent',
        'failed': 'https://myapp.com/webhooks/email-failed',
        '*': 'https://myapp.com/webhooks/all-events', // Wildcard for all status changes
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const emailJobId = emailJobResponse.data.jobId;
  console.log('Email job ID:', emailJobId);

  // 2. Submit another job with different metadata
  const reportJobResponse = await axios.post(
    API_URL,
    {
      queue: 'reports',
      data: {
        reportType: 'monthly-sales',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
      metadata: {
        type: 'scheduled',
        priority: 'normal',
        departmentId: 'sales',
        scheduledBy: 'system',
      },
      webhooks: {
        'progress': 'https://myapp.com/webhooks/report-progress',
        'completed': 'https://myapp.com/webhooks/report-ready',
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  console.log('Report job ID:', reportJobResponse.data.jobId);

  // 3. Filter jobs by metadata
  console.log('\n=== Filter Jobs by Metadata ===');
  
  // Find all high priority jobs
  const highPriorityJobs = await axios.get(
    `${API_URL}?metadata.priority=high`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );
  console.log('High priority jobs:', highPriorityJobs.data.jobs);

  // Find all transactional emails
  const transactionalEmails = await axios.get(
    `${API_URL}?queue=email&metadata.type=transactional`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );
  console.log('Transactional emails:', transactionalEmails.data.jobs);

  // Find all jobs for a specific customer
  const customerJobs = await axios.get(
    `${API_URL}?metadata.customerId=cust-123`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );
  console.log('Customer jobs:', customerJobs.data.jobs);

  // 4. Update job webhook after submission
  console.log('\n=== Update Job Webhooks ===');
  
  await axios.post(
    `${API_URL}/${emailJobId}/webhook`,
    {
      webhooks: {
        'started': 'https://myapp.com/webhooks/email-started',
        'progress': 'https://myapp.com/webhooks/email-progress',
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log('Added additional webhooks to job');

  // 5. Complex filtering - completed high priority jobs
  const completedHighPriority = await axios.get(
    `${API_URL}?status=completed&metadata.priority=high`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );
  console.log('Completed high priority jobs:', completedHighPriority.data.jobs);
}

// Worker example showing how to update job with data
async function workerExample() {
  const jobId = 'some-job-id';
  
  // Worker starts processing with initial data
  await axios.put(
    `${API_URL}/${jobId}`,
    {
      status: 'started',
      metadata: {
        workerId: 'worker-1',
        startedAt: new Date().toISOString(),
        environment: 'production',
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  // Worker updates progress with intermediate results
  for (let i = 0; i <= 100; i += 25) {
    await axios.put(
      `${API_URL}/${jobId}`,
      {
        status: 'progress',
        progress: i,
        result: {
          // Intermediate results can be passed during progress updates
          recordsProcessedSoFar: i * 10,
          currentBatch: Math.floor(i / 25),
          estimatedTimeRemaining: (100 - i) * 0.5,
        },
        metadata: {
          lastProgressUpdate: new Date().toISOString(),
          memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
        },
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Worker completes job with final results
  await axios.put(
    `${API_URL}/${jobId}`,
    {
      status: 'completed',
      result: {
        success: true,
        recordsProcessed: 1000,
        outputFile: 's3://bucket/report.pdf',
        summary: {
          totalRecords: 1000,
          successfulRecords: 998,
          failedRecords: 2,
          processingTimeSeconds: 5.432,
        },
        // Any complex data structure can be returned
        details: {
          byCategory: {
            categoryA: 450,
            categoryB: 350,
            categoryC: 200,
          },
          errors: [
            { record: 567, error: 'Invalid email format' },
            { record: 892, error: 'Missing required field' },
          ],
        },
      },
      metadata: {
        completedAt: new Date().toISOString(),
        processingTimeMs: 5432,
        finalStatus: 'completed-with-warnings',
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  // Example of handling failure with detailed error data
  async function handleFailure(jobId: string, error: any) {
    await axios.put(
      `${API_URL}/${jobId}`,
      {
        status: 'failed',
        error: error.message,
        result: {
          // Even failed jobs can return partial results
          recordsProcessedBeforeFailure: 450,
          lastSuccessfulRecord: 449,
          errorDetails: {
            type: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            timestamp: new Date().toISOString(),
          },
        },
        metadata: {
          failedAt: new Date().toISOString(),
          retryable: true,
          failureReason: 'database-connection-timeout',
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

// Example webhook receiver
function webhookReceiver() {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  app.post('/webhooks/email-sent', (req, res) => {
    console.log('Email sent webhook received:', {
      jobId: req.body.jobId,
      status: req.body.status,
      result: req.body.result,
    });
    res.status(200).send('OK');
  });
  
  app.post('/webhooks/email-failed', (req, res) => {
    console.log('Email failed webhook received:', {
      jobId: req.body.jobId,
      status: req.body.status,
      error: req.body.error,
    });
    res.status(200).send('OK');
  });
  
  app.post('/webhooks/all-events', (req, res) => {
    console.log('All events webhook received:', {
      jobId: req.headers['x-job-id'],
      status: req.headers['x-job-status'],
      body: req.body,
    });
    res.status(200).send('OK');
  });
  
  app.listen(3004, () => {
    console.log('Webhook receiver listening on port 3004');
  });
}

// Run examples
examples().catch(console.error);