import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { getApplicationByApiKey } from '../services/application';

export interface AuthenticatedRequest extends Request {
  application?: {
    id: string;
    name: string;
    settings?: any;
  };
}

export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Skip auth if disabled
  if (!config.security.enableApiKeyAuth) {
    req.application = {
      id: 'default',
      name: 'Default Application',
    };
    return next();
  }

  const apiKey = req.headers[config.security.apiKeyHeader] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: `Missing ${config.security.apiKeyHeader} header`,
        hints: [
          `Add '${config.security.apiKeyHeader}: your-api-key' to request headers`,
          'Get API key from POST /api/applications (requires master key)',
          'Check /api/explain/auth for authentication details',
        ],
        possibleCauses: [
          'Header not included in request',
          'Header name typo (should be lowercase)',
          'Using wrong header name',
        ],
        suggestedFixes: [
          `curl -H "${config.security.apiKeyHeader}: your-key" ...`,
          `fetch(url, { headers: { "${config.security.apiKeyHeader}": "your-key" } })`,
          'Check your HTTP client configuration',
        ],
      },
    });
  }

  // Check for master API key
  if (config.security.masterApiKey && apiKey === config.security.masterApiKey) {
    req.application = {
      id: 'master',
      name: 'Master Application',
      settings: {
        allowedQueues: ['*'], // Access to all queues
      },
    };
    return next();
  }

  try {
    const application = await getApplicationByApiKey(apiKey);
    
    if (!application) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          hints: [
            'Verify API key is correct and active',
            'Check if key was revoked or deleted',
            'Create new application with POST /api/applications',
            'Use /api/explain/auth for help',
          ],
          possibleCauses: [
            'API key does not exist',
            'Typo in API key',
            'Using wrong environment key (dev/prod)',
            'Key was deleted',
          ],
          suggestedFixes: [
            'Double-check the API key value',
            'Request new API key from admin',
            'Create new application if you have master key',
          ],
        },
      });
    }

    req.application = {
      id: application.id,
      name: application.name,
      settings: application.settings,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
      },
    });
  }
}

export function requireQueue(queueName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.application) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      });
    }

    const allowedQueues = req.application.settings?.allowedQueues || [];
    
    if (allowedQueues.includes('*') || allowedQueues.includes(queueName)) {
      return next();
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'QUEUE_ACCESS_DENIED',
        message: `Access denied to queue: ${queueName}`,
      },
    });
  };
}