"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTenants = initializeTenants;
exports.getTenantByApiKey = getTenantByApiKey;
exports.getTenantById = getTenantById;
exports.createTenant = createTenant;
exports.updateTenant = updateTenant;
exports.deleteTenant = deleteTenant;
exports.listTenants = listTenants;
const uuid_1 = require("uuid");
// In-memory tenant store (replace with database in production)
const tenants = new Map();
// Initialize with some default tenants
function initializeTenants() {
    // Default tenant for backwards compatibility
    const defaultTenant = {
        id: 'default',
        name: 'Default Tenant',
        apiKey: 'default-api-key',
        settings: {
            allowedQueues: ['*'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    tenants.set(defaultTenant.apiKey, defaultTenant);
}
async function getTenantByApiKey(apiKey) {
    return tenants.get(apiKey) || null;
}
async function getTenantById(id) {
    for (const tenant of tenants.values()) {
        if (tenant.id === id) {
            return tenant;
        }
    }
    return null;
}
async function createTenant(data) {
    const tenant = {
        id: (0, uuid_1.v4)(),
        name: data.name,
        apiKey: `sk_${(0, uuid_1.v4)().replace(/-/g, '')}`,
        settings: data.settings || {
            allowedQueues: ['*'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    tenants.set(tenant.apiKey, tenant);
    return tenant;
}
async function updateTenant(id, updates) {
    const tenant = await getTenantById(id);
    if (!tenant)
        return null;
    Object.assign(tenant, updates, { updatedAt: new Date() });
    return tenant;
}
async function deleteTenant(id) {
    const tenant = await getTenantById(id);
    if (!tenant)
        return false;
    tenants.delete(tenant.apiKey);
    return true;
}
async function listTenants() {
    return Array.from(tenants.values());
}
//# sourceMappingURL=tenant.js.map