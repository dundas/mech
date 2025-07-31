import { Tenant } from '../types';
export declare function initializeTenants(): void;
export declare function getTenantByApiKey(apiKey: string): Promise<Tenant | null>;
export declare function getTenantById(id: string): Promise<Tenant | null>;
export declare function createTenant(data: {
    name: string;
    settings?: Tenant['settings'];
}): Promise<Tenant>;
export declare function updateTenant(id: string, updates: Partial<Pick<Tenant, 'name' | 'settings'>>): Promise<Tenant | null>;
export declare function deleteTenant(id: string): Promise<boolean>;
export declare function listTenants(): Promise<Tenant[]>;
//# sourceMappingURL=tenant.d.ts.map