import { Job } from 'bullmq';
import logger from '../utils/logger';

interface EmailJobData {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  _metadata?: any;
}

export async function emailWorker(job: Job<EmailJobData>) {
  const { to, subject, body, html, from, attachments } = job.data;
  const applicationId = job.data._metadata?.applicationId;

  logger.info(`Processing email job ${job.id} for application ${applicationId}`);

  try {
    // Simulate email sending
    await simulateEmailSending(job.data);

    // Update progress
    await job.updateProgress(50);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark as complete
    await job.updateProgress(100);

    logger.info(`Email job ${job.id} completed successfully`);
    
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentAt: new Date().toISOString(),
    };

  } catch (error) {
    logger.error(`Email job ${job.id} failed:`, error);
    throw error;
  }
}

async function simulateEmailSending(data: EmailJobData) {
  // Validate email data
  if (!data.to || !data.subject || (!data.body && !data.html)) {
    throw new Error('Missing required email fields');
  }

  // Simulate API call to email service
  logger.info(`Sending email to: ${Array.isArray(data.to) ? data.to.join(', ') : data.to}`);
  
  // In production, integrate with services like:
  // - SendGrid
  // - AWS SES
  // - Postmark
  // - Mailgun
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
}