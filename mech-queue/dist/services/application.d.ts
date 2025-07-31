import { Application } from '../types';
export declare function initializeApplications(): void;
export declare function getApplicationByApiKey(apiKey: string): Promise<Application | null>;
export declare function getApplicationById(id: string): Promise<Application | null>;
export declare function createApplication(data: {
    name: string;
    settings?: Application['settings'];
}): Promise<Application>;
export declare function updateApplication(id: string, updates: Partial<Pick<Application, 'name' | 'settings'>>): Promise<Application | null>;
export declare function deleteApplication(id: string): Promise<boolean>;
export declare function listApplications(): Promise<Application[]>;
//# sourceMappingURL=application.d.ts.map