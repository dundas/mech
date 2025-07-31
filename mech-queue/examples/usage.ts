// Example: How other services use the generic queue

import axios from 'axios';

const QUEUE_SERVICE_URL = 'http://localhost:3003/api';
const API_KEY = 'your-api-key';

// Example 1: Email service submitting a job
async function sendEmail() {
  const response = await axios.post(
    `${QUEUE_SERVICE_URL}/queues/email/jobs`,
    {
      data: {
        to: 'user@example.com',
        subject: 'Welcome!',
        body: 'Thanks for signing up!',
      },
      options: {
        priority: 1,
        attempts: 3,
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('Email job submitted:', response.data);
  // Response: { success: true, data: { jobId: '123', queue: 'email', status: 'waiting' } }
}

// Example 2: Indexer service submitting a job
async function indexFile() {
  const response = await axios.post(
    `${QUEUE_SERVICE_URL}/queues/indexing/jobs`,
    {
      data: {
        fileId: 'file-456',
        filePath: '/uploads/document.pdf',
        fileType: 'pdf',
        operations: ['extract-text', 'generate-embeddings'],
      },
      options: {
        priority: 5,
        delay: 5000, // Process after 5 seconds
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('Indexing job submitted:', response.data);
}

// Example 3: Check job status
async function checkJobStatus(queueName: string, jobId: string) {
  const response = await axios.get(
    `${QUEUE_SERVICE_URL}/queues/${queueName}/jobs/${jobId}`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );

  console.log('Job status:', response.data);
  // Response: { 
  //   success: true, 
  //   data: { 
  //     id: '123', 
  //     status: 'completed',
  //     data: { ... },
  //     result: { messageId: 'msg-789' },
  //     timestamps: { created: 1234567890, completed: 1234567900 }
  //   }
  // }
}

// Example 4: AI service submitting analysis job
async function analyzeData() {
  const response = await axios.post(
    `${QUEUE_SERVICE_URL}/queues/ai-analysis/jobs`,
    {
      data: {
        dataset: 's3://bucket/dataset.csv',
        model: 'sentiment-analysis',
        parameters: {
          threshold: 0.8,
          language: 'en',
        },
      },
    },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('AI analysis job submitted:', response.data);
}

// Example 5: List all jobs in a queue
async function listJobs(queueName: string, status?: string) {
  const params = status ? `?status=${status}` : '';
  const response = await axios.get(
    `${QUEUE_SERVICE_URL}/queues/${queueName}/jobs${params}`,
    {
      headers: {
        'x-api-key': API_KEY,
      },
    }
  );

  console.log(`Jobs in ${queueName} queue:`, response.data);
}

// Example 6: Worker polling for jobs (external service)
async function workerExample() {
  // In reality, workers would use BullMQ's Worker class to connect directly to Redis
  // But here's how they might check job status via API
  
  while (true) {
    try {
      // Check for jobs in 'email' queue
      const jobs = await axios.get(
        `${QUEUE_SERVICE_URL}/queues/email/jobs?status=waiting&limit=10`,
        {
          headers: {
            'x-api-key': API_KEY,
          },
        }
      );

      for (const job of jobs.data.data) {
        console.log('Processing job:', job.id);
        // Worker would process the job and update status
        // This would be done through BullMQ Worker, not API
      }

    } catch (error) {
      console.error('Worker error:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Usage
async function main() {
  // Any service can submit jobs to any queue
  await sendEmail();
  await indexFile();
  await analyzeData();
  
  // Check status
  await checkJobStatus('email', '123');
  
  // List jobs
  await listJobs('email', 'completed');
}

main().catch(console.error);