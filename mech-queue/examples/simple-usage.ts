// Simple Job Tracking Usage Example

import axios from 'axios';

const API_URL = 'http://localhost:3003/api/jobs';
const API_KEY = 'your-api-key';

class JobClient {
  constructor(
    private apiUrl: string,
    private apiKey: string
  ) {}

  // Submit any job to any queue - get back job ID
  async submitJob(queueName: string, data: any): Promise<string> {
    const response = await axios.post(
      this.apiUrl,
      {
        queue: queueName,
        data: data,
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.jobId;
  }

  // Check job status
  async getJobStatus(jobId: string) {
    const response = await axios.get(
      `${this.apiUrl}/${jobId}`,
      {
        headers: {
          'x-api-key': this.apiKey,
        },
      }
    );

    return response.data.job;
  }

  // Update job (for workers)
  async updateJob(jobId: string, update: {
    status: 'started' | 'progress' | 'completed' | 'failed';
    progress?: number;
    result?: any;
    error?: string;
  }) {
    await axios.put(
      `${this.apiUrl}/${jobId}`,
      update,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // List all my jobs
  async listJobs(options?: { queue?: string; status?: string }) {
    const params = new URLSearchParams();
    if (options?.queue) params.append('queue', options.queue);
    if (options?.status) params.append('status', options.status);

    const response = await axios.get(
      `${this.apiUrl}?${params}`,
      {
        headers: {
          'x-api-key': this.apiKey,
        },
      }
    );

    return response.data.jobs;
  }
}

// Usage Examples
async function examples() {
  const client = new JobClient(API_URL, API_KEY);

  // 1. Submit an email job
  console.log('=== Submitting Email Job ===');
  const emailJobId = await client.submitJob('email', {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Thanks for signing up!',
  });
  console.log('Email job ID:', emailJobId);

  // 2. Submit an indexing job
  console.log('\n=== Submitting Indexing Job ===');
  const indexJobId = await client.submitJob('indexing', {
    fileId: 'file-123',
    filePath: '/documents/report.pdf',
    operations: ['extract-text', 'generate-embeddings'],
  });
  console.log('Indexing job ID:', indexJobId);

  // 3. Submit any custom job
  console.log('\n=== Submitting Custom Job ===');
  const customJobId = await client.submitJob('my-custom-queue', {
    whatever: 'data you want',
    nested: {
      values: ['are', 'fine'],
    },
  });
  console.log('Custom job ID:', customJobId);

  // 4. Check job status
  console.log('\n=== Checking Job Status ===');
  const status = await client.getJobStatus(emailJobId);
  console.log('Job status:', status);

  // 5. Simulate worker updating job
  console.log('\n=== Worker Updates ===');
  
  // Worker starts processing
  await client.updateJob(emailJobId, {
    status: 'started',
  });

  // Worker reports progress
  await client.updateJob(emailJobId, {
    status: 'progress',
    progress: 50,
  });

  // Worker completes job
  await client.updateJob(emailJobId, {
    status: 'completed',
    result: {
      messageId: 'msg-789',
      sentAt: new Date().toISOString(),
    },
  });

  // 6. List all jobs
  console.log('\n=== List All Jobs ===');
  const allJobs = await client.listJobs();
  console.log('All jobs:', allJobs);

  // 7. List only email jobs
  console.log('\n=== List Email Jobs ===');
  const emailJobs = await client.listJobs({ queue: 'email' });
  console.log('Email jobs:', emailJobs);

  // 8. List only completed jobs
  console.log('\n=== List Completed Jobs ===');
  const completedJobs = await client.listJobs({ status: 'completed' });
  console.log('Completed jobs:', completedJobs);
}

// Worker Example (separate process/service)
async function workerExample() {
  const client = new JobClient(API_URL, API_KEY);

  // In reality, workers connect directly to Redis/BullMQ
  // This is just showing how they would update job status
  
  const jobId = 'some-job-id';
  
  try {
    // Start processing
    await client.updateJob(jobId, { status: 'started' });
    
    // Do the actual work...
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      await client.updateJob(jobId, { 
        status: 'progress', 
        progress: i 
      });
    }
    
    // Complete with result
    await client.updateJob(jobId, {
      status: 'completed',
      result: { success: true, processedAt: new Date() },
    });
    
  } catch (error) {
    // Report failure
    await client.updateJob(jobId, {
      status: 'failed',
      error: error.message,
    });
  }
}

// Run examples
examples().catch(console.error);