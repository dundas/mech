/**
 * Base Database Adapter Interface
 * Defines the contract for database-specific implementations
 */

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  options?: Record<string, any>;
}

export interface CollectionInfo {
  name: string;
  type: string;
  count?: number;
  size?: number;
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable?: boolean;
  indexed?: boolean;
  unique?: boolean;
  defaultValue?: any;
  description?: string;
}

export interface IndexInfo {
  name: string;
  fields: string[];
  unique: boolean;
  sparse?: boolean;
  type?: string;
}

export interface RelationshipInfo {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  field: string;
  foreignField?: string;
}

export interface DatabaseStats {
  collections: number;
  totalSize: number;
  totalDocuments: number;
  indexes: number;
  avgDocumentSize?: number;
}

export abstract class BaseDatabaseAdapter {
  protected config: ConnectionConfig;
  protected type: string = 'base';
  protected client: any;

  constructor(connectionConfig: ConnectionConfig) {
    this.config = connectionConfig;
  }

  /**
   * Connect to the database
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  abstract disconnect(): Promise<void>;

  /**
   * List all tables/collections
   */
  abstract listCollections(): Promise<CollectionInfo[]>;

  /**
   * Get collection/table schema
   */
  abstract getSchema(collectionName: string): Promise<FieldInfo[]>;

  /**
   * Get sample documents/rows
   */
  abstract getSampleDocuments(collectionName: string, limit?: number): Promise<any[]>;

  /**
   * Count documents/rows
   */
  abstract countDocuments(collectionName: string, filter?: any): Promise<number>;

  /**
   * Execute a query
   */
  abstract executeQuery(collectionName: string, query: any): Promise<any[]>;

  /**
   * Get relationships/foreign keys
   */
  abstract getRelationships(collectionName: string): Promise<RelationshipInfo[]>;

  /**
   * Get indexes
   */
  abstract getIndexes(collectionName: string): Promise<IndexInfo[]>;

  /**
   * Get statistics
   */
  abstract getStatistics(collectionName: string): Promise<Record<string, any>>;

  /**
   * Search across collections/tables
   */
  abstract globalSearch(searchTerm: string, collections?: string[]): Promise<any[]>;

  /**
   * Get database size and stats
   */
  abstract getDatabaseStats(): Promise<DatabaseStats>;

  /**
   * Get the database type
   */
  getType(): string {
    return this.type;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return !!this.client;
  }
}