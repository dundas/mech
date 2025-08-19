import { DatabaseCredential, IDatabaseCredential } from '../models/database-credential.model';
import { EncryptionService } from './encryption.service';
import { AdapterFactory, AdapterConfig } from './db-analyzer/adapters/adapter-factory';
import { logger } from '../utils/logger';

export interface CredentialInput {
  name: string;
  type: 'mongodb' | 'postgresql' | 'redis';
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  isDefault?: boolean;
  tags?: string[];
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: {
    version?: string;
    serverInfo?: any;
    collections?: number;
    error?: string;
  };
}

export class DatabaseCredentialsService {
  /**
   * Test database connection before saving
   */
  static async testConnection(credential: CredentialInput): Promise<TestConnectionResult> {
    let adapter;
    
    try {
      // Build adapter config
      const config: AdapterConfig = {
        type: credential.type,
        host: credential.host,
        port: credential.port,
        database: credential.database,
        user: credential.username,
        password: credential.password,
        connectionString: credential.connectionString
      };
      
      // Create and connect adapter
      adapter = await AdapterFactory.createAdapter(config);
      
      // Test basic operations
      const stats = await adapter.getDatabaseStats();
      const collections = await adapter.listCollections();
      
      return {
        success: true,
        message: 'Connection successful',
        details: {
          version: adapter.getType(),
          collections: collections.length,
          serverInfo: stats
        }
      };
    } catch (error) {
      logger.error('Connection test failed:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        details: {
          error: error instanceof Error ? error.stack : String(error)
        }
      };
    } finally {
      // Always disconnect test connection
      if (adapter) {
        try {
          await adapter.disconnect();
        } catch (err) {
          logger.warn('Error disconnecting test adapter:', err);
        }
      }
    }
  }
  
  /**
   * Create a new database credential
   */
  static async createCredential(
    userId: string, 
    credential: CredentialInput
  ): Promise<IDatabaseCredential> {
    // Test connection first
    const testResult = await this.testConnection(credential);
    
    if (!testResult.success) {
      throw new Error(`Connection test failed: ${testResult.message}`);
    }
    
    // Encrypt sensitive data
    const encryptedData: any = {
      userId,
      name: credential.name,
      type: credential.type,
      host: credential.host,
      port: credential.port,
      database: credential.database,
      username: credential.username,
      isDefault: credential.isDefault || false,
      tags: credential.tags || [],
      lastTested: new Date(),
      testStatus: 'success',
      testMessage: testResult.message
    };
    
    if (credential.password) {
      encryptedData.encryptedPassword = EncryptionService.encrypt(credential.password);
    }
    
    if (credential.connectionString) {
      encryptedData.encryptedConnectionString = EncryptionService.encrypt(credential.connectionString);
    }
    
    // If setting as default, unset other defaults for this type
    if (credential.isDefault) {
      await DatabaseCredential.updateMany(
        { userId, type: credential.type, isDefault: true },
        { isDefault: false }
      );
    }
    
    return await DatabaseCredential.create(encryptedData);
  }
  
  /**
   * Update an existing credential
   */
  static async updateCredential(
    userId: string,
    credentialId: string,
    updates: Partial<CredentialInput>
  ): Promise<IDatabaseCredential | null> {
    const credential = await DatabaseCredential.findOne({ _id: credentialId, userId });
    
    if (!credential) {
      throw new Error('Credential not found');
    }
    
    // Build full credential for testing
    const fullCredential: CredentialInput = {
      name: updates.name || credential.name,
      type: updates.type || credential.type,
      host: updates.host || credential.host,
      port: updates.port || credential.port,
      database: updates.database || credential.database,
      username: updates.username || credential.username,
      password: updates.password, // New password if provided
      connectionString: updates.connectionString, // New connection string if provided
    };
    
    // If password not provided in update, decrypt existing
    if (!updates.password && credential.encryptedPassword) {
      fullCredential.password = EncryptionService.decrypt(credential.encryptedPassword);
    }
    
    // If connection string not provided in update, decrypt existing
    if (!updates.connectionString && credential.encryptedConnectionString) {
      fullCredential.connectionString = EncryptionService.decrypt(credential.encryptedConnectionString);
    }
    
    // Test connection with updated credentials
    const testResult = await this.testConnection(fullCredential);
    
    if (!testResult.success) {
      throw new Error(`Connection test failed: ${testResult.message}`);
    }
    
    // Update fields
    Object.assign(credential, {
      name: updates.name || credential.name,
      type: updates.type || credential.type,
      host: updates.host || credential.host,
      port: updates.port || credential.port,
      database: updates.database || credential.database,
      username: updates.username || credential.username,
      tags: updates.tags || credential.tags,
      lastTested: new Date(),
      testStatus: 'success',
      testMessage: testResult.message
    });
    
    // Update encrypted fields if provided
    if (updates.password) {
      credential.encryptedPassword = EncryptionService.encrypt(updates.password);
    }
    
    if (updates.connectionString) {
      credential.encryptedConnectionString = EncryptionService.encrypt(updates.connectionString);
    }
    
    // Handle default flag
    if (updates.isDefault !== undefined) {
      credential.isDefault = updates.isDefault;
      
      if (updates.isDefault) {
        await DatabaseCredential.updateMany(
          { userId, type: credential.type, isDefault: true, _id: { $ne: credentialId } },
          { isDefault: false }
        );
      }
    }
    
    return await credential.save();
  }
  
  /**
   * Get all credentials for a user (without decrypted passwords)
   */
  static async getUserCredentials(
    userId: string,
    type?: string
  ): Promise<IDatabaseCredential[]> {
    const query: any = { userId };
    if (type) query.type = type;
    
    return await DatabaseCredential
      .find(query)
      .select('-encryptedPassword -encryptedConnectionString')
      .sort({ isDefault: -1, name: 1 });
  }
  
  /**
   * Get a specific credential with decrypted data
   */
  static async getCredentialWithSecrets(
    userId: string,
    credentialId: string
  ): Promise<AdapterConfig | null> {
    const credential = await DatabaseCredential.findOne({ _id: credentialId, userId });
    
    if (!credential) {
      return null;
    }
    
    // Update last used timestamp
    credential.lastUsed = new Date();
    await credential.save();
    
    // Build adapter config with decrypted data
    const config: AdapterConfig = {
      type: credential.type,
      host: credential.host,
      port: credential.port,
      database: credential.database,
      user: credential.username
    };
    
    if (credential.encryptedPassword) {
      config.password = EncryptionService.decrypt(credential.encryptedPassword);
    }
    
    if (credential.encryptedConnectionString) {
      config.connectionString = EncryptionService.decrypt(credential.encryptedConnectionString);
    }
    
    return config;
  }
  
  /**
   * Delete a credential
   */
  static async deleteCredential(
    userId: string,
    credentialId: string
  ): Promise<boolean> {
    const result = await DatabaseCredential.deleteOne({ _id: credentialId, userId });
    return result.deletedCount > 0;
  }
  
  /**
   * Re-test an existing credential
   */
  static async retestCredential(
    userId: string,
    credentialId: string
  ): Promise<TestConnectionResult> {
    const credential = await DatabaseCredential.findOne({ _id: credentialId, userId });
    
    if (!credential) {
      throw new Error('Credential not found');
    }
    
    // Build credential input with decrypted data
    const credInput: CredentialInput = {
      name: credential.name,
      type: credential.type,
      host: credential.host,
      port: credential.port,
      database: credential.database,
      username: credential.username
    };
    
    if (credential.encryptedPassword) {
      credInput.password = EncryptionService.decrypt(credential.encryptedPassword);
    }
    
    if (credential.encryptedConnectionString) {
      credInput.connectionString = EncryptionService.decrypt(credential.encryptedConnectionString);
    }
    
    // Test connection
    const result = await this.testConnection(credInput);
    
    // Update test status
    credential.lastTested = new Date();
    credential.testStatus = result.success ? 'success' : 'failed';
    credential.testMessage = result.message;
    await credential.save();
    
    return result;
  }
}