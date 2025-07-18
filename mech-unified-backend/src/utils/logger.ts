import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'mech-unified-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  const logDir = process.env.LOG_DIR || 'logs';
  
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// Stream for Morgan HTTP logger
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for structured logging
export const logError = (message: string, error: Error, metadata?: any) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...metadata,
  });
};

export const logRequest = (
  method: string,
  path: string,
  statusCode: number,
  responseTime: number,
  metadata?: any
) => {
  logger.info(`${method} ${path} ${statusCode} ${responseTime}ms`, {
    method,
    path,
    statusCode,
    responseTime,
    ...metadata,
  });
};

export const logReasoningStep = (
  sessionId: string,
  stepNumber: number,
  type: string,
  confidence: number,
  metadata?: any
) => {
  logger.info(`Reasoning step ${stepNumber} for session ${sessionId}`, {
    sessionId,
    stepNumber,
    type,
    confidence,
    ...metadata,
  });
};

export const logSessionEvent = (
  sessionId: string,
  event: string,
  metadata?: any
) => {
  logger.info(`Session event: ${event}`, {
    sessionId,
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};