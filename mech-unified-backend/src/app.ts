import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import { config } from 'dotenv';

// Load environment variables
config();

// Import middleware
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/logging';

// Import routes
import { healthRouter } from './routes/health';
import { sessionRouter } from './routes/sessions';
import { reasoningRouter } from './routes/reasoning';
import { claudeRouter } from './routes/claude';
import { dbAnalyzerRouter } from './routes/db-analyzer';
import { databaseCredentialsRouter } from './routes/database-credentials';
// import { codebaseIndexerRouter } from './routes/codebase-indexer';
import { memoryRecallRouter } from './routes/memory-recall';
import { agentRouter } from './routes/agents';
import { projectRouter } from './routes/projects';
import { explainRouter } from './routes/explain';
import { discoveryRouter } from './routes/discovery';

export function createApp(): Application {
  const app = express();
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  
  // CORS configuration
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5500'];
      
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    optionsSuccessStatus: 200,
  };
  
  app.use(cors(corsOptions));
  
  // Compression
  app.use(compression());
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Request logging
  app.use(requestLogger);
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Apply rate limiting to all routes except health checks
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/health')) {
      return next();
    }
    return limiter(req, res, next);
  });
  
  // Health check routes (no auth required)
  app.use('/api/health', healthRouter);
  
  // Discovery routes (no auth required)
  app.use('/api/discovery', discoveryRouter);
  
  // API routes
  app.use('/api/v2/sessions', sessionRouter);
  app.use('/api/v2/reasoning', reasoningRouter);
  app.use('/api/v2/claude', claudeRouter);
  app.use('/api/db-analyzer', dbAnalyzerRouter);
  app.use('/api/database-credentials', databaseCredentialsRouter);
  // app.use('/api/codebase-indexer', codebaseIndexerRouter);
  app.use('/api/memory-recall', memoryRecallRouter);
  app.use('/api/agents', agentRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api/explain', explainRouter);
  
  // 404 handler with discovery hints
  app.use((req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.status(404).json({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `Cannot ${req.method} ${req.path}`,
        hints: {
          discovery: `${baseUrl}/api/discovery`,
          availableServices: [
            '/api/health',
            '/api/discovery',
            '/api/projects',
            '/api/v2/claude',
            '/api/v2/sessions',
            '/api/v2/reasoning',
            '/api/db-analyzer',
            '/api/database-credentials',
            '/api/memory-recall',
            '/api/agents',
            '/api/explain'
          ],
          documentation: `${baseUrl}/api/discovery?format=markdown`,
          quickStart: `${baseUrl}/api/discovery`
        }
      },
    });
  });
  
  // Global error handler
  app.use(errorHandler);
  
  return app;
}