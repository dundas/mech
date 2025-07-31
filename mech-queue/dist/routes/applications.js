"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = require("../config");
const application_1 = require("../services/application");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Middleware to check master API key for application management
const requireMasterKey = (req, res, next) => {
    const apiKey = req.headers[config_1.config.security.apiKeyHeader];
    if (!config_1.config.security.masterApiKey || apiKey !== config_1.config.security.masterApiKey) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Master API key required',
            },
        });
    }
    next();
};
// Create a new application
router.post('/', requireMasterKey, async (req, res) => {
    try {
        const { name, settings } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_NAME',
                    message: 'Application name is required',
                },
            });
        }
        const application = await (0, application_1.createApplication)({ name, settings });
        logger_1.default.info(`Created new application: ${application.id} (${application.name})`);
        res.status(201).json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        logger_1.default.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CREATE_ERROR',
                message: 'Failed to create application',
            },
        });
    }
});
// List all applications
router.get('/', requireMasterKey, async (req, res) => {
    try {
        const applications = await (0, application_1.listApplications)();
        res.json({
            success: true,
            data: applications,
        });
    }
    catch (error) {
        logger_1.default.error('Error listing applications:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'LIST_ERROR',
                message: 'Failed to list applications',
            },
        });
    }
});
// Get application by ID
router.get('/:id', requireMasterKey, async (req, res) => {
    try {
        const { id } = req.params;
        const application = await (0, application_1.getApplicationById)(id);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'APPLICATION_NOT_FOUND',
                    message: `Application '${id}' not found`,
                },
            });
        }
        res.json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        logger_1.default.error('Error getting application:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'GET_ERROR',
                message: 'Failed to get application',
            },
        });
    }
});
// Update application
router.patch('/:id', requireMasterKey, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, settings } = req.body;
        const application = await (0, application_1.updateApplication)(id, { name, settings });
        if (!application) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'APPLICATION_NOT_FOUND',
                    message: `Application '${id}' not found`,
                },
            });
        }
        logger_1.default.info(`Updated application: ${application.id} (${application.name})`);
        res.json({
            success: true,
            data: application,
        });
    }
    catch (error) {
        logger_1.default.error('Error updating application:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: 'Failed to update application',
            },
        });
    }
});
// Delete application
router.delete('/:id', requireMasterKey, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await (0, application_1.deleteApplication)(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'APPLICATION_NOT_FOUND',
                    message: `Application '${id}' not found`,
                },
            });
        }
        logger_1.default.info(`Deleted application: ${id}`);
        res.json({
            success: true,
            data: {
                message: 'Application deleted successfully',
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error deleting application:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'DELETE_ERROR',
                message: 'Failed to delete application',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=applications.js.map