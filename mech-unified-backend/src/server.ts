import { createApp } from './app';
import { database } from './config/database';
import { logger } from './utils/logger';
import { createServer } from 'http';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await database.connect();
    
    // Create Express app
    const app = createApp();
    
    // Create HTTP server
    const server = createServer(app);
    
    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connection
        await database.disconnect();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Mech Unified Backend server is running`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        pid: process.pid,
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();