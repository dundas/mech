"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const logger_1 = __importDefault(require("./utils/logger"));
const generic_queue_manager_1 = require("./services/generic-queue-manager");
const application_1 = require("./services/application");
const auth_1 = require("./middleware/auth");
const generic_queue_1 = __importDefault(require("./routes/generic-queue"));
const applications_1 = __importDefault(require("./routes/applications"));
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);
// Health check
app.get('/health', async (req, res) => {
    const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
    const queues = await queueManager.listQueues();
    const stats = await Promise.all(queues.map(name => queueManager.getQueueStats(name)));
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queues: stats.filter(Boolean),
        version: process.env.npm_package_version || '1.0.0',
    });
});
// API Documentation
app.get('/api', (req, res) => {
    res.json({
        service: 'Generic Queue Service',
        version: '2.0.0',
        description: 'Domain-agnostic job queue management',
        endpoints: {
            'POST /api/queues/:queueName/jobs': 'Submit a job to a queue',
            'GET /api/queues/:queueName/jobs/:jobId': 'Get job status',
            'GET /api/queues/:queueName/jobs': 'List jobs in queue',
            'DELETE /api/queues/:queueName/jobs/:jobId': 'Cancel a job',
            'GET /api/queues/:queueName/stats': 'Get queue statistics',
            'GET /api/queues': 'List all queues',
            'POST /api/applications': 'Create application (master key required)',
        },
        authentication: {
            header: 'x-api-key',
            description: 'Include API key in header for all requests',
        },
    });
});
// Routes
app.use('/api/applications', applications_1.default);
app.use('/api/queues', auth_1.authenticateApiKey, generic_queue_1.default);
// Error handling
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});
// Initialize services
async function startServer() {
    try {
        logger_1.default.info('Starting generic queue service...');
        // Initialize queue manager
        generic_queue_manager_1.GenericQueueManager.getInstance({
            redis: {
                host: process.env.REDIS_HOST || config_1.config.redis.host,
                port: parseInt(process.env.REDIS_PORT || String(config_1.config.redis.port)),
                password: process.env.REDIS_PASSWORD || config_1.config.redis.password,
            },
        });
        // Initialize applications
        (0, application_1.initializeApplications)();
        logger_1.default.info('Initialized applications');
        // Start server
        app.listen(config_1.config.port, () => {
            logger_1.default.info(`Generic queue service running on port ${config_1.config.port}`);
            logger_1.default.info(`Environment: ${config_1.config.env}`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    logger_1.default.info('Received SIGINT, shutting down gracefully...');
    const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
    await queueManager.shutdown();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger_1.default.info('Received SIGTERM, shutting down gracefully...');
    const queueManager = generic_queue_manager_1.GenericQueueManager.getInstance();
    await queueManager.shutdown();
    process.exit(0);
});
// Start the server
startServer();
//# sourceMappingURL=index-generic.js.map