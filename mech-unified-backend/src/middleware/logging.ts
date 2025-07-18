import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, logRequest } from '../utils/logger';

// Extend Express Request type to include custom properties
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Assign unique request ID
  req.id = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    sessionId: req.headers['x-session-id'],
    projectId: req.headers['x-project-id'],
  });
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    res.send = originalSend;
    
    // Calculate response time
    const responseTime = Date.now() - req.startTime;
    
    // Log response
    logRequest(
      req.method,
      req.path,
      res.statusCode,
      responseTime,
      {
        requestId: req.id,
        contentLength: res.get('content-length'),
        sessionId: req.headers['x-session-id'],
        projectId: req.headers['x-project-id'],
      }
    );
    
    return res.send(data);
  };
  
  next();
};