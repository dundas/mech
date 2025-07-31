import { Application } from '../types';
import { v4 as uuidv4 } from 'uuid';

// In-memory application store (replace with database in production)
const applications = new Map<string, Application>();

// Initialize with some default applications
export function initializeApplications() {
  // Default application for backwards compatibility
  const defaultApplication: Application = {
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

export async function getApplicationByApiKey(apiKey: string): Promise<Application | null> {
  return applications.get(apiKey) || null;
}

export async function getApplicationById(id: string): Promise<Application | null> {
  for (const application of applications.values()) {
    if (application.id === id) {
      return application;
    }
  }
  return null;
}

export async function createApplication(data: {
  name: string;
  settings?: Application['settings'];
}): Promise<Application> {
  const application: Application = {
    id: uuidv4(),
    name: data.name,
    apiKey: `sk_${uuidv4().replace(/-/g, '')}`,
    settings: data.settings || {
      allowedQueues: ['*'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  applications.set(application.apiKey, application);
  return application;
}

export async function updateApplication(
  id: string,
  updates: Partial<Pick<Application, 'name' | 'settings'>>
): Promise<Application | null> {
  const application = await getApplicationById(id);
  if (!application) return null;
  
  Object.assign(application, updates, { updatedAt: new Date() });
  return application;
}

export async function deleteApplication(id: string): Promise<boolean> {
  const application = await getApplicationById(id);
  if (!application) return false;
  
  applications.delete(application.apiKey);
  return true;
}

export async function listApplications(): Promise<Application[]> {
  return Array.from(applications.values());
}