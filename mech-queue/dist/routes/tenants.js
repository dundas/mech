"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = require("../config");
const tenant_1 = require("../services/tenant");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Middleware to check master API key for tenant management
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
// Create a new tenant
router.post('/', requireMasterKey, async (req, res) => {
    try {
        const { name, settings } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_NAME',
                    message: 'Tenant name is required',
                },
            });
        }
        const tenant = await (0, tenant_1.createTenant)({ name, settings });
        logger_1.default.info(`Created new tenant: ${tenant.id} (${tenant.name})`);
        res.status(201).json({
            success: true,
            data: tenant,
        });
    }
    catch (error) {
        logger_1.default.error('Error creating tenant:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CREATE_ERROR',
                message: 'Failed to create tenant',
            },
        });
    }
});
// List all tenants
router.get('/', requireMasterKey, async (req, res) => {
    try {
        const tenants = await (0, tenant_1.listTenants)();
        res.json({
            success: true,
            data: tenants,
        });
    }
    catch (error) {
        logger_1.default.error('Error listing tenants:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'LIST_ERROR',
                message: 'Failed to list tenants',
            },
        });
    }
});
// Get tenant by ID
router.get('/:id', requireMasterKey, async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await (0, tenant_1.getTenantById)(id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TENANT_NOT_FOUND',
                    message: `Tenant '${id}' not found`,
                },
            });
        }
        res.json({
            success: true,
            data: tenant,
        });
    }
    catch (error) {
        logger_1.default.error('Error getting tenant:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'GET_ERROR',
                message: 'Failed to get tenant',
            },
        });
    }
});
// Update tenant
router.patch('/:id', requireMasterKey, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, settings } = req.body;
        const tenant = await (0, tenant_1.updateTenant)(id, { name, settings });
        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TENANT_NOT_FOUND',
                    message: `Tenant '${id}' not found`,
                },
            });
        }
        logger_1.default.info(`Updated tenant: ${tenant.id} (${tenant.name})`);
        res.json({
            success: true,
            data: tenant,
        });
    }
    catch (error) {
        logger_1.default.error('Error updating tenant:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: 'Failed to update tenant',
            },
        });
    }
});
// Delete tenant
router.delete('/:id', requireMasterKey, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await (0, tenant_1.deleteTenant)(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TENANT_NOT_FOUND',
                    message: `Tenant '${id}' not found`,
                },
            });
        }
        logger_1.default.info(`Deleted tenant: ${id}`);
        res.json({
            success: true,
            data: {
                message: 'Tenant deleted successfully',
            },
        });
    }
    catch (error) {
        logger_1.default.error('Error deleting tenant:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'DELETE_ERROR',
                message: 'Failed to delete tenant',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=tenants.js.map