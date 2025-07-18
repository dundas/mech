/**
 * Database Analyzer Service
 * Provides schema analysis, statistics, and insights for MongoDB collections
 */
import { Db, ObjectId } from 'mongodb';
import { database } from '../../config/database';
import { logger } from '../../utils/logger';

export interface CollectionSchema {
  name: string;
  fields: FieldInfo[];
  sampleDocument?: any;
  statistics?: CollectionStats;
  relationships?: RelationshipInfo[];
  indexes?: IndexInfo[];
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
  array?: boolean;
  nested?: boolean;
  examples?: any[];
  frequency?: number;
}

export interface CollectionStats {
  count: number;
  size: number;
  avgDocumentSize: number;
  indexCount: number;
  indexSize?: number;
}

export interface RelationshipInfo {
  from: string;
  to: string;
  field: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  verified?: boolean;
}

export interface IndexInfo {
  name: string;
  fields: string[];
  unique: boolean;
  sparse?: boolean;
  type?: string;
  size?: number;
}

export interface DatabaseOverview {
  name: string;
  collections: number;
  totalSize: number;
  totalDocuments: number;
  version?: string;
  uptime?: number;
}

export class DbAnalyzerService {
  private db: Db;

  constructor() {
    this.db = database.getDb();
  }

  /**
   * Get database overview
   */
  async getDatabaseOverview(): Promise<DatabaseOverview> {
    try {
      const stats = await this.db.stats();
      const serverStatus = await this.db.admin().serverStatus();
      
      return {
        name: this.db.databaseName,
        collections: stats.collections,
        totalSize: stats.dataSize,
        totalDocuments: stats.objects || 0,
        version: serverStatus.version,
        uptime: serverStatus.uptime
      };
    } catch (error) {
      logger.error('Error getting database overview:', error);
      throw error;
    }
  }

  /**
   * List all collections with basic info
   */
  async listCollections(): Promise<CollectionSchema[]> {
    try {
      const collections = await this.db.listCollections().toArray();
      const schemas: CollectionSchema[] = [];

      for (const collection of collections) {
        const stats = await this.getCollectionStats(collection.name);
        schemas.push({
          name: collection.name,
          fields: [],
          statistics: stats
        });
      }

      return schemas;
    } catch (error) {
      logger.error('Error listing collections:', error);
      throw error;
    }
  }

  /**
   * Analyze a specific collection
   */
  async analyzeCollection(collectionName: string, options: {
    sampleSize?: number;
    includeIndexes?: boolean;
    includeRelationships?: boolean;
  } = {}): Promise<CollectionSchema> {
    const { 
      sampleSize = 100, 
      includeIndexes = true, 
      includeRelationships = true 
    } = options;

    try {
      const collection = this.db.collection(collectionName);
      
      // Get sample documents
      const samples = await collection
        .find({})
        .limit(sampleSize)
        .toArray();

      // Infer schema from samples
      const fields = this.inferSchema(samples);
      
      // Get collection statistics
      const statistics = await this.getCollectionStats(collectionName);
      
      const schema: CollectionSchema = {
        name: collectionName,
        fields,
        sampleDocument: samples[0] || null,
        statistics
      };

      // Get indexes if requested
      if (includeIndexes) {
        schema.indexes = await this.getCollectionIndexes(collectionName);
      }

      // Infer relationships if requested
      if (includeRelationships) {
        schema.relationships = await this.inferRelationships(collectionName, fields);
      }

      return schema;
    } catch (error) {
      logger.error(`Error analyzing collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  private async getCollectionStats(collectionName: string): Promise<CollectionStats> {
    try {
      const stats = await this.db.command({ collStats: collectionName });
      return {
        count: stats.count,
        size: stats.size,
        avgDocumentSize: stats.avgObjSize || 0,
        indexCount: stats.nindexes,
        indexSize: stats.totalIndexSize
      };
    } catch (error) {
      // Fallback for basic stats
      const collection = this.db.collection(collectionName);
      const count = await collection.countDocuments();
      return {
        count,
        size: 0,
        avgDocumentSize: 0,
        indexCount: 0
      };
    }
  }

  /**
   * Get collection indexes
   */
  private async getCollectionIndexes(collectionName: string): Promise<IndexInfo[]> {
    const collection = this.db.collection(collectionName);
    const indexes = await collection.indexes();
    
    return indexes.map(index => ({
      name: index.name || '',
      fields: Object.keys(index.key || {}),
      unique: index.unique || false,
      sparse: index.sparse || false,
      type: index['2dsphere'] ? '2dsphere' : index.text ? 'text' : 'btree'
    }));
  }

  /**
   * Infer schema from sample documents
   */
  private inferSchema(documents: any[]): FieldInfo[] {
    const fieldStats: Map<string, {
      types: Map<string, number>;
      nullCount: number;
      examples: Set<any>;
    }> = new Map();

    // Analyze each document
    for (const doc of documents) {
      this.analyzeDocument(doc, fieldStats);
    }

    // Convert stats to field info
    const fields: FieldInfo[] = [];
    for (const [path, stats] of fieldStats) {
      const totalCount = Array.from(stats.types.values()).reduce((a, b) => a + b, 0) + stats.nullCount;
      const mostCommonType = Array.from(stats.types.entries())
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

      fields.push({
        name: path,
        type: mostCommonType,
        nullable: stats.nullCount > 0,
        array: path.includes('[]'),
        nested: path.includes('.'),
        examples: Array.from(stats.examples).slice(0, 3),
        frequency: (totalCount / documents.length) * 100
      });
    }

    return fields.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Recursively analyze document structure
   */
  private analyzeDocument(
    obj: any, 
    fieldStats: Map<string, any>, 
    prefix = ''
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (!fieldStats.has(path)) {
        fieldStats.set(path, {
          types: new Map(),
          nullCount: 0,
          examples: new Set()
        });
      }

      const stats = fieldStats.get(path)!;

      if (value === null) {
        stats.nullCount++;
      } else {
        const type = this.getType(value);
        stats.types.set(type, (stats.types.get(type) || 0) + 1);
        
        // Add examples for simple types
        if (['string', 'number', 'boolean', 'Date', 'ObjectId'].includes(type)) {
          stats.examples.add(value instanceof ObjectId ? value.toString() : value);
        }

        // Recurse for objects
        if (type === 'object' && !(value instanceof Date) && !(value instanceof ObjectId)) {
          this.analyzeDocument(value, fieldStats, path);
        }
        
        // Handle arrays
        if (type === 'array' && Array.isArray(value) && value.length > 0) {
          const arrayPath = `${path}[]`;
          if (!fieldStats.has(arrayPath)) {
            fieldStats.set(arrayPath, {
              types: new Map(),
              nullCount: 0,
              examples: new Set()
            });
          }
          
          // Analyze first item as representative
          const firstItem = value[0];
          const itemType = this.getType(firstItem);
          const arrayStats = fieldStats.get(arrayPath)!;
          arrayStats.types.set(itemType, (arrayStats.types.get(itemType) || 0) + 1);
          
          if (itemType === 'object' && firstItem !== null) {
            this.analyzeDocument(firstItem, fieldStats, arrayPath);
          }
        }
      }
    }
  }

  /**
   * Get the type of a value
   */
  private getType(value: any): string {
    if (value === null) return 'null';
    if (value instanceof ObjectId) return 'ObjectId';
    if (value instanceof Date) return 'Date';
    if (Array.isArray(value)) return 'array';
    if (Buffer.isBuffer(value)) return 'Binary';
    return typeof value;
  }

  /**
   * Infer relationships from field names and types
   */
  private async inferRelationships(
    collectionName: string, 
    fields: FieldInfo[]
  ): Promise<RelationshipInfo[]> {
    const relationships: RelationshipInfo[] = [];
    const collectionNames = (await this.db.listCollections().toArray()).map(c => c.name);

    for (const field of fields) {
      // Check for ObjectId references
      if (field.type === 'ObjectId' && field.name !== '_id') {
        const targetCollection = this.inferTargetCollection(field.name, collectionNames);
        if (targetCollection) {
          relationships.push({
            from: collectionName,
            to: targetCollection,
            field: field.name,
            type: 'one-to-many',
            verified: collectionNames.includes(targetCollection)
          });
        }
      }
      
      // Check for array of ObjectIds
      if (field.array && field.name.endsWith('Ids')) {
        const baseName = field.name.slice(0, -3);
        const targetCollection = this.inferTargetCollection(baseName, collectionNames);
        if (targetCollection) {
          relationships.push({
            from: collectionName,
            to: targetCollection,
            field: field.name,
            type: 'many-to-many',
            verified: collectionNames.includes(targetCollection)
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Infer target collection from field name
   */
  private inferTargetCollection(fieldName: string, existingCollections: string[]): string | null {
    // Remove common suffixes
    let baseName = fieldName.replace(/Id$|_id$/, '');
    
    // Common field mappings
    const mappings: Record<string, string> = {
      'user': 'users',
      'userId': 'users',
      'createdBy': 'users',
      'updatedBy': 'users',
      'author': 'users',
      'owner': 'users',
      'project': 'projects',
      'projectId': 'projects',
      'thread': 'threads',
      'threadId': 'threads',
      'message': 'messages',
      'messageId': 'messages',
      'session': 'sessions',
      'sessionId': 'sessions',
      'claude_sessions_v2': 'claude_sessions_v2'
    };

    if (mappings[fieldName]) {
      return mappings[fieldName];
    }

    // Try pluralizing
    const plural = baseName + 's';
    if (existingCollections.includes(plural)) {
      return plural;
    }

    // Try exact match
    if (existingCollections.includes(baseName)) {
      return baseName;
    }

    return null;
  }

  /**
   * Execute a custom query
   */
  async executeQuery(collectionName: string, query: {
    filter?: any;
    projection?: any;
    sort?: any;
    limit?: number;
    skip?: number;
  }): Promise<any[]> {
    const collection = this.db.collection(collectionName);
    const { filter = {}, projection = {}, sort = {}, limit = 10, skip = 0 } = query;
    
    return await collection
      .find(filter)
      .project(projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  /**
   * Search across collections
   */
  async globalSearch(searchTerm: string, options: {
    collections?: string[];
    limit?: number;
  } = {}): Promise<Record<string, any[]>> {
    const { collections = [], limit = 10 } = options;
    const results: Record<string, any[]> = {};
    const regex = new RegExp(searchTerm, 'i');
    
    const targetCollections = collections.length > 0 
      ? collections 
      : (await this.db.listCollections().toArray()).map(c => c.name);
    
    for (const collName of targetCollections) {
      try {
        const collection = this.db.collection(collName);
        const schema = await this.analyzeCollection(collName, { sampleSize: 10 });
        const stringFields = schema.fields
          .filter(f => f.type === 'string')
          .map(f => f.name);
        
        if (stringFields.length > 0) {
          const orConditions = stringFields.map(field => ({ [field]: regex }));
          results[collName] = await collection
            .find({ $or: orConditions })
            .limit(limit)
            .toArray();
        }
      } catch (error) {
        logger.warn(`Error searching collection ${collName}:`, error);
        results[collName] = [];
      }
    }
    
    return results;
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions(collectionName: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      const schema = await this.analyzeCollection(collectionName);
      const stats = schema.statistics!;
      const indexes = schema.indexes || [];
      
      // Large collection without enough indexes
      if (stats.count > 10000 && indexes.length < 3) {
        suggestions.push('Consider adding more indexes for frequently queried fields');
      }
      
      // Check for missing indexes on relationship fields
      if (schema.relationships && schema.relationships.length > 0) {
        for (const rel of schema.relationships) {
          const hasIndex = indexes.some(idx => idx.fields.includes(rel.field));
          if (!hasIndex) {
            suggestions.push(`Add index on "${rel.field}" for better join performance`);
          }
        }
      }
      
      // Check for large average document size
      if (stats.avgDocumentSize > 16000) { // 16KB
        suggestions.push('Large average document size detected. Consider document splitting or gridFS for large data');
      }
      
      // Check for arrays that might benefit from separate collections
      const arrayFields = schema.fields.filter(f => f.array);
      for (const field of arrayFields) {
        if (field.frequency && field.frequency > 80) {
          suggestions.push(`Field "${field.name}" is a frequently used array. Consider normalizing to a separate collection`);
        }
      }
      
    } catch (error) {
      logger.error(`Error generating suggestions for ${collectionName}:`, error);
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const dbAnalyzerService = new DbAnalyzerService();