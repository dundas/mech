"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
const auth_1 = require("../middleware/auth");
const error_handler_1 = require("../middleware/error-handler");
const jobs_simple_1 = __importDefault(require("./jobs-simple"));
const queues_1 = __importDefault(require("./queues"));
const applications_1 = __importDefault(require("./applications"));
const webhooks_1 = __importDefault(require("./webhooks"));
const explain_1 = __importDefault(require("./explain"));
const subscriptions_1 = __importDefault(require("./subscriptions"));
const schedule_routes_1 = require("./schedule.routes");
const queue_manager_1 = require("../services/queue-manager");
function setupRoutes(app) {
    // Public routes - AI-friendly documentation
    app.use('/api/explain', explain_1.default);
    // Application management (requires master key)
    app.use('/api/applications', applications_1.default);
    // Protected routes
    app.use('/api/jobs', auth_1.authenticateApiKey, jobs_simple_1.default);
    app.use('/api/queues', auth_1.authenticateApiKey, queues_1.default);
    app.use('/api/webhooks', auth_1.authenticateApiKey, webhooks_1.default);
    app.use('/api/subscriptions', auth_1.authenticateApiKey, subscriptions_1.default);
    // Schedule routes (no auth required for internal use)
    const queueManager = queue_manager_1.QueueManager.getInstance();
    const scheduleRoutes = (0, schedule_routes_1.createScheduleRoutes)(queueManager);
    app.use('/api', scheduleRoutes);
    // Global error handler with AI-friendly hints
    app.use(error_handler_1.errorHandler);
}
//# sourceMappingURL=index.js.map