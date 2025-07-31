"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookAttempts = exports.jobsDelivered = exports.activeWorkers = exports.queueSize = exports.jobDuration = exports.jobsCompleted = exports.jobsSubmitted = void 0;
exports.setupMetrics = setupMetrics;
const express_1 = __importDefault(require("express"));
const prom_client_1 = require("prom-client");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
// Metrics
exports.jobsSubmitted = new prom_client_1.Counter({
    name: 'queue_jobs_submitted_total',
    help: 'Total number of jobs submitted',
    labelNames: ['queue', 'application'],
});
exports.jobsCompleted = new prom_client_1.Counter({
    name: 'queue_jobs_completed_total',
    help: 'Total number of jobs completed',
    labelNames: ['queue', 'application', 'status'],
});
exports.jobDuration = new prom_client_1.Histogram({
    name: 'queue_job_duration_seconds',
    help: 'Job processing duration in seconds',
    labelNames: ['queue', 'application'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
});
exports.queueSize = new prom_client_1.Gauge({
    name: 'queue_size',
    help: 'Current queue size',
    labelNames: ['queue', 'state'],
});
exports.activeWorkers = new prom_client_1.Gauge({
    name: 'queue_active_workers',
    help: 'Number of active workers',
    labelNames: ['queue'],
});
exports.jobsDelivered = new prom_client_1.Counter({
    name: 'webhook_deliveries_total',
    help: 'Total number of webhook deliveries',
    labelNames: ['application', 'event', 'status'],
});
exports.webhookAttempts = new prom_client_1.Counter({
    name: 'webhook_attempts_total',
    help: 'Total number of webhook delivery attempts',
    labelNames: ['application', 'event', 'status', 'attempt'],
});
function setupMetrics() {
    // Collect default metrics (CPU, memory, etc.)
    (0, prom_client_1.collectDefaultMetrics)({ prefix: 'queue_service_' });
    // Create metrics server
    const metricsApp = (0, express_1.default)();
    metricsApp.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', prom_client_1.register.contentType);
            res.end(await prom_client_1.register.metrics());
        }
        catch (error) {
            res.status(500).end(error);
        }
    });
    metricsApp.listen(config_1.config.monitoring.metricsPort, () => {
        logger_1.default.info(`Metrics server running on port ${config_1.config.monitoring.metricsPort}`);
    });
}
//# sourceMappingURL=metrics.js.map