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
const queue_manager_1 = require("./services/queue-manager");
const application_1 = require("./services/application");
const routes_1 = require("./routes");
const queues_1 = require("./queues");
const workers_1 = require("./workers");
const metrics_1 = require("./monitoring/metrics");
const webhook_manager_1 = require("./services/webhook-manager");
const simple_job_tracker_1 = require("./services/simple-job-tracker");
const mongoose_1 = __importDefault(require("mongoose"));
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
    const queueManager = queue_manager_1.QueueManager.getInstance();
    const stats = await queueManager.getAllQueueStats();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queues: stats,
        version: process.env.npm_package_version || '1.0.0',
    });
});
// AI-friendly root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Queue Service API',
        version: '1.0.0',
        status: 'online',
        documentation: '/api/explain',
        quickstart: {
            '1': 'Get API documentation: GET /api/explain',
            '2': 'Create application (admin): POST /api/applications',
            '3': 'Submit job: POST /api/jobs/{queue}',
            '4': 'Check status: GET /api/jobs/{queue}/{jobId}',
        },
        hints: [
            'All endpoints except /api/explain require x-api-key header',
            'Use /api/explain/* endpoints for detailed documentation',
            'Every error includes hints for troubleshooting',
        ],
    });
});
// Setup routes
(0, routes_1.setupRoutes)(app);
// Initialize services
async function startServer() {
    try {
        logger_1.default.info('Starting queue service...');
        // Connect to MongoDB if configured
        if (config_1.config.mongodb.uri) {
            await mongoose_1.default.connect(config_1.config.mongodb.uri);
            logger_1.default.info('Connected to MongoDB');
        }
        // Initialize applications
        (0, application_1.initializeApplications)();
        logger_1.default.info('Initialized applications');
        // Register queues
        await (0, queues_1.registerQueues)();
        logger_1.default.info('Registered queues');
        // Register workers
        await (0, workers_1.registerWorkers)();
        logger_1.default.info('Registered workers');
        // Initialize SimpleJobTracker
        simple_job_tracker_1.SimpleJobTracker.getInstance({
            host: config_1.config.redis.host,
            port: config_1.config.redis.port,
            password: config_1.config.redis.password,
            db: config_1.config.redis.db,
        });
        logger_1.default.info('Initialized SimpleJobTracker');
        // Initialize webhook manager
        if (config_1.config.mongodb.uri) {
            const webhookManager = webhook_manager_1.WebhookManager.getInstance();
            await webhookManager.initialize();
            logger_1.default.info('Webhook manager initialized');
        }
        else {
            logger_1.default.warn('MongoDB not configured - webhooks disabled');
        }
        // Setup metrics if enabled
        if (config_1.config.monitoring.enablePrometheus) {
            (0, metrics_1.setupMetrics)();
            logger_1.default.info('Prometheus metrics enabled');
        }
        // Start server
        app.listen(config_1.config.port, () => {
            logger_1.default.info(`Queue service running on port ${config_1.config.port}`);
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
    const queueManager = queue_manager_1.QueueManager.getInstance();
    await queueManager.shutdown();
    if (config_1.config.mongodb.uri) {
        const webhookManager = webhook_manager_1.WebhookManager.getInstance();
        await webhookManager.shutdown();
        await mongoose_1.default.disconnect();
    }
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger_1.default.info('Received SIGTERM, shutting down gracefully...');
    const queueManager = queue_manager_1.QueueManager.getInstance();
    await queueManager.shutdown();
    if (config_1.config.mongodb.uri) {
        const webhookManager = webhook_manager_1.WebhookManager.getInstance();
        await webhookManager.shutdown();
        await mongoose_1.default.disconnect();
    }
    process.exit(0);
});
// Start the server
startServer();
//# sourceMappingURL=index.js.map