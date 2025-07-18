import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'RESOURCE_NOT_FOUND';
  
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id ${id} not found` : `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = 'RESOURCE_CONFLICT';
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error implements AppError {
  statusCode = 503;
  code = 'EXTERNAL_SERVICE_ERROR';
  details?: any;
  
  constructor(service: string, originalError?: Error) {
    super(`External service ${service} is unavailable`);
    this.name = 'ExternalServiceError';
    this.details = originalError?.message;
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error
  logger.error('Error handling request', {
    error: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    requestId: req.id,
  });
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  
  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      code,
      message: err.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: req.id,
    },
  };
  
  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    if (err.details) {
      errorResponse.error.details = err.details;
    }
  }
  
  res.status(statusCode).json(errorResponse);
};