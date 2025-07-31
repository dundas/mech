"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookWorker = webhookWorker;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
async function webhookWorker(job) {
    const { url, method = 'POST', headers = {}, data, timeout = 30000 } = job.data;
    const applicationId = job.data._metadata?.applicationId;
    logger_1.default.info(`Processing webhook job ${job.id} for application ${applicationId}: ${method} ${url}`);
    try {
        const response = await (0, axios_1.default)({
            url,
            method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'QueueService/1.0',
                ...headers,
            },
            data,
            timeout,
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        });
        const result = {
            success: response.status < 400,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            timestamp: new Date().toISOString(),
        };
        if (response.status >= 400) {
            logger_1.default.warn(`Webhook returned ${response.status} for job ${job.id}`);
        }
        else {
            logger_1.default.info(`Webhook job ${job.id} completed successfully`);
        }
        return result;
    }
    catch (error) {
        logger_1.default.error(`Webhook job ${job.id} failed:`, error);
        // Differentiate between network errors and other errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            throw new Error(`Network error: ${error.message}`);
        }
        throw error;
    }
}
//# sourceMappingURL=webhook.js.map