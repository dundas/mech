"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApplications = initializeApplications;
exports.getApplicationByApiKey = getApplicationByApiKey;
exports.getApplicationById = getApplicationById;
exports.createApplication = createApplication;
exports.updateApplication = updateApplication;
exports.deleteApplication = deleteApplication;
exports.listApplications = listApplications;
const uuid_1 = require("uuid");
// In-memory application store (replace with database in production)
const applications = new Map();
// Initialize with some default applications
function initializeApplications() {
    // Default application for backwards compatibility
    const defaultApplication = {
        id: 'default',
        name: 'Default Application',
        apiKey: 'default-api-key',
        settings: {
            allowedQueues: ['*'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    applications.set(defaultApplication.apiKey, defaultApplication);
}
async function getApplicationByApiKey(apiKey) {
    return applications.get(apiKey) || null;
}
async function getApplicationById(id) {
    for (const application of applications.values()) {
        if (application.id === id) {
            return application;
        }
    }
    return null;
}
async function createApplication(data) {
    const application = {
        id: (0, uuid_1.v4)(),
        name: data.name,
        apiKey: `sk_${(0, uuid_1.v4)().replace(/-/g, '')}`,
        settings: data.settings || {
            allowedQueues: ['*'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    applications.set(application.apiKey, application);
    return application;
}
async function updateApplication(id, updates) {
    const application = await getApplicationById(id);
    if (!application)
        return null;
    Object.assign(application, updates, { updatedAt: new Date() });
    return application;
}
async function deleteApplication(id) {
    const application = await getApplicationById(id);
    if (!application)
        return false;
    applications.delete(application.apiKey);
    return true;
}
async function listApplications() {
    return Array.from(applications.values());
}
//# sourceMappingURL=application.js.map