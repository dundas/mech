import { Request, Response, NextFunction } from 'express';

// Placeholder auth middleware for MVP - no authentication required
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  // For MVP, we'll just extract session and project IDs from headers
  // In production, this would verify JWT tokens
  
  // Extract IDs from headers
  const sessionId = req.headers['x-session-id'] as string;
  const projectId = req.headers['x-project-id'] as string;
  
  // Attach to request for use in routes
  req.sessionId = sessionId;
  req.projectId = projectId;
  
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      projectId?: string;
      userId?: string;
    }
  }
}