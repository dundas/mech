import { Request } from 'express';

export interface AIContext {
  endpoint: string;
  method: string;
  error?: string;
  data?: any;
}

export class AIHelper {
  static generateSuggestion(context: AIContext): string[] {
    const suggestions: string[] = [];

    // Endpoint-specific suggestions
    if (context.endpoint.includes('/jobs') && context.method === 'POST') {
      suggestions.push(
        'Ensure job data includes all required fields',
        'Check queue name is correct (case-sensitive)',
        'Verify API key has access to this queue'
      );
    }

    // Error-specific suggestions
    if (context.error) {
      const errorSuggestions = this.getErrorSuggestions(context.error);
      suggestions.push(...errorSuggestions);
    }

    return suggestions;
  }

  static getErrorSuggestions(error: string): string[] {
    const suggestions: string[] = [];

    if (error.includes('timeout')) {
      suggestions.push(
        'Increase timeout value in job options',
        'Check if target service is responding',
        'Consider breaking large jobs into smaller ones'
      );
    }

    if (error.includes('validation')) {
      suggestions.push(
        'Use /api/explain endpoint for field requirements',
        'Ensure JSON is properly formatted',
        'Check data types match expected schema'
      );
    }

    if (error.includes('rate limit')) {
      suggestions.push(
        'Implement exponential backoff',
        'Check X-RateLimit headers for reset time',
        'Consider batching requests'
      );
    }

    return suggestions;
  }

  static generateExample(queueName: string): any {
    const examples: Record<string, any> = {
      email: {
        name: 'send-notification',
        data: {
          to: 'user@example.com',
          subject: 'Your order has shipped!',
          body: 'Track your package...',
          html: '<h1>Order Shipped!</h1><p>Track your package...</p>',
        },
      },
      webhook: {
        name: 'notify-partner',
        data: {
          url: 'https://partner.com/webhook',
          method: 'POST',
          headers: {
            'X-API-Key': 'partner-key',
          },
          data: {
            event: 'order.shipped',
            orderId: '12345',
          },
        },
      },
      'ai-processing': {
        name: 'analyze-content',
        data: {
          type: 'completion',
          prompt: 'Summarize this article in 3 bullet points...',
          model: 'gpt-3.5-turbo',
        },
      },
    };

    return examples[queueName] || {
      name: 'example-job',
      data: {
        // Add your job data here
      },
    };
  }

  static explainJobStatus(status: string): string {
    const explanations: Record<string, string> = {
      waiting: 'Job is in queue, will be processed when worker is available',
      active: 'Job is currently being processed by a worker',
      completed: 'Job finished successfully, result available',
      failed: 'Job failed after all retry attempts, check error details',
      delayed: 'Job is scheduled for future processing',
    };

    return explanations[status] || 'Unknown status';
  }

  static generateCurlExample(
    method: string,
    endpoint: string,
    apiKey: string = 'your-api-key',
    data?: any
  ): string {
    let curl = `curl -X ${method} http://localhost:3003${endpoint}`;
    curl += ` -H "x-api-key: ${apiKey}"`;

    if (data) {
      curl += ` -H "Content-Type: application/json"`;
      curl += ` -d '${JSON.stringify(data, null, 2)}'`;
    }

    return curl;
  }

  static generateSDKExample(
    language: 'javascript' | 'python',
    method: string,
    endpoint: string,
    data?: any
  ): string {
    if (language === 'javascript') {
      return `
const response = await fetch('http://localhost:3003${endpoint}', {
  method: '${method}',
  headers: {
    'x-api-key': process.env.QUEUE_API_KEY,
    'Content-Type': 'application/json',
  },${data ? `
  body: JSON.stringify(${JSON.stringify(data, null, 2)}),` : ''}
});

const result = await response.json();
if (!result.success) {
  console.error('Error:', result.error);
  // Check result.error.hints for troubleshooting
}`;
    }

    if (language === 'python') {
      return `
import requests
import os

response = requests.${method.toLowerCase()}(
  'http://localhost:3003${endpoint}',
  headers={
    'x-api-key': os.environ['QUEUE_API_KEY'],
    'Content-Type': 'application/json',
  },${data ? `
  json=${JSON.stringify(data, null, 2)},` : ''}
)

result = response.json()
if not result['success']:
  print('Error:', result['error'])
  # Check result['error']['hints'] for troubleshooting`;
    }

    return '';
  }
}

export function extractContextFromRequest(req: Request): AIContext {
  return {
    endpoint: req.path,
    method: req.method,
    data: req.body,
  };
}