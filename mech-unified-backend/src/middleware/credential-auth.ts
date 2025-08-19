import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Authentication middleware for credential management
 * Requires user identification for secure credential storage
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get user ID from various sources
  const userId = req.headers['x-user-id'] as string || 
                 req.headers['x-session-id'] as string ||
                 (req as any).sessionId;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'User identification required for credential management',
      hint: 'Please provide X-User-ID or X-Session-ID header'
    });
    return;
  }
  
  // Attach user info to request
  (req as any).user = { id: userId };
  (req as any).userId = userId;
  
  logger.info(`Credential access by user: ${userId}`);
  
  next();
};