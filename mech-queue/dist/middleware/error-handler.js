"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceError = enhanceError;
exports.errorHandler = errorHandler;
const logger_1 = __importDefault(require("../utils/logger"));
function enhanceError(error, code, statusCode, hints, possibleCauses, suggestedFixes, relatedEndpoints) {
    const enhanced = error;
    enhanced.code = code;
    enhanced.statusCode = statusCode;
    enhanced.hints = hints || [];
    enhanced.possibleCauses = possibleCauses || [];
    enhanced.suggestedFixes = suggestedFixes || [];
    enhanced.relatedEndpoints = relatedEndpoints || [];
    return enhanced;
}
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    logger_1.default.error(`Error ${code} in ${req.method} ${req.path}:`, {
        error: err.message,
        stack: err.stack,
        body: req.body,
        params: req.params,
        query: req.query,
    });
    const response = {
        success: false,
        error: {
            code,
            message: err.message,
            hints: err.hints || getDefaultHints(code),
            possibleCauses: err.possibleCauses || getDefaultCauses(code),
            suggestedFixes: err.suggestedFixes || getDefaultFixes(code),
            relatedEndpoints: err.relatedEndpoints || [],
            details: process.env.NODE_ENV === 'development' ? {
                stack: err.stack,
                path: req.path,
                method: req.method,
            } : undefined,
        },
        metadata: {
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method,
        },
    };
    res.status(statusCode).json(response);
}
function getDefaultHints(code) {
    const hints = {
        MISSING_API_KEY: [
            'Add the x-api-key header to your request',
            'Check /api/explain/auth for authentication details',
            'Use /api/applications to create a new API key (requires master key)',
        ],
        INVALID_API_KEY: [
            'Verify your API key is correct',
            'Check if the API key has been revoked',
            'Create a new application with POST /api/applications',
        ],
        QUEUE_NOT_FOUND: [
            'Use GET /api/queues to list available queues',
            'Queue names are case-sensitive',
            'Check /api/explain/queues for queue details',
        ],
        JOB_NOT_FOUND: [
            'Verify the job ID and queue name are correct',
            'Jobs are automatically removed after completion based on settings',
            'Use GET /api/jobs/{queue}/{jobId} to check job status',
        ],
        VALIDATION_ERROR: [
            'Check the request body format',
            'Ensure all required fields are provided',
            'Use /api/explain/{endpoint} for field requirements',
        ],
        RATE_LIMIT_EXCEEDED: [
            'Wait for the rate limit window to reset',
            'Check X-RateLimit-Reset header for reset time',
            'Consider implementing exponential backoff',
        ],
    };
    return hints[code] || ['Check the error message for details'];
}
function getDefaultCauses(code) {
    const causes = {
        MISSING_API_KEY: [
            'The x-api-key header was not included in the request',
            'Header name might be incorrect (should be lowercase)',
        ],
        INVALID_API_KEY: [
            'The provided API key does not exist',
            'The API key might have been deleted',
            'Wrong environment (dev/prod) API key',
        ],
        QUEUE_NOT_FOUND: [
            'The specified queue has not been registered',
            'Typo in the queue name',
            'Queue might be restricted to specific applications',
        ],
        JOB_NOT_FOUND: [
            'Job has been completed and removed',
            'Job ID is incorrect',
            'Job belongs to a different application',
        ],
    };
    return causes[code] || [];
}
function getDefaultFixes(code) {
    const fixes = {
        MISSING_API_KEY: [
            'curl -H "x-api-key: your-key" ...',
            'axios.defaults.headers.common["x-api-key"] = "your-key"',
            'fetch(url, { headers: { "x-api-key": "your-key" } })',
        ],
        QUEUE_NOT_FOUND: [
            'GET /api/queues to see available queues',
            'Ensure queue name matches exactly (case-sensitive)',
            'Common queues: email, webhook, ai-processing',
        ],
        VALIDATION_ERROR: [
            'Check request body structure matches the schema',
            'Ensure JSON is properly formatted',
            'Use /api/explain endpoint for the correct format',
        ],
    };
    return fixes[code] || [];
}
//# sourceMappingURL=error-handler.js.map