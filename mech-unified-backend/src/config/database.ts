import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';
import { IClaudeSessionV2, ISessionCheckpoint } from '../models/session.model';
import { IReasoningStep, IReasoningChain } from '../models/reasoning.model';
import { logger } from '../utils/logger';

export interface DatabaseCollections {
  sessions: Collection<IClaudeSessionV2>;
  sessionCheckpoints: Collection<ISessionCheckpoint>;
  reasoningSteps: Collection<IReasoningStep>;
  reasoningChains: Collection<IReasoningChain>;
  hookEvents: Collection<any>;
  reasoningEmbeddings: Collection<any>;
  codeEmbeddings: Collection<any>;
  indexingJobs: Collection<any>;
  agentRegistrations: Collection<any>;
  agentMemories: Collection<any>;
  fileLocks: Collection<any>;
  agentTasks: Collection<any>;
  agentEvents: Collection<any>;
}

class DatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collections: DatabaseCollections | null = null;
  
  async connect(): Promise<void> {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }
      
      const options: MongoClientOptions = {
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        w: 'majority',
      };
      
      // Connect native MongoDB driver
      this.client = new MongoClient(uri, options);
      await this.client.connect();
      
      const dbName = process.env.MONGODB_DATABASE || 'mechDB';
      this.db = this.client.db(dbName);
      
      // Connect Mongoose ODM (for models like DatabaseCredential)
      await mongoose.connect(uri, {
        dbName: dbName,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
      });
      
      // Initialize collections
      this.collections = {
        sessions: this.db.collection<IClaudeSessionV2>('claude_sessions_v2'),
        sessionCheckpoints: this.db.collection<ISessionCheckpoint>('session_checkpoints'),
        reasoningSteps: this.db.collection<IReasoningStep>('reasoning_steps'),
        reasoningChains: this.db.collection<IReasoningChain>('reasoning_chains'),
        hookEvents: this.db.collection('hook_events'),
        reasoningEmbeddings: this.db.collection('reasoning_embeddings'),
        codeEmbeddings: this.db.collection('code_embeddings'),
        indexingJobs: this.db.collection('indexing_jobs'),
        agentRegistrations: this.db.collection('agent_registrations'),
        agentMemories: this.db.collection('agent_memories'),
        fileLocks: this.db.collection('file_locks'),
        agentTasks: this.db.collection('agent_tasks'),
        agentEvents: this.db.collection('agent_events'),
      };
      
      // Create indexes
      await this.createIndexes();
      
      logger.info('✅ Connected to MongoDB successfully', {
        database: dbName,
        host: new URL(uri).hostname,
        mongoose: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      });
    } catch (error) {
      logger.error('❌ Failed to connect to MongoDB', error);
      throw error;
    }
  }
  
  async createIndexes(): Promise<void> {
    if (!this.collections) return;
    
    try {
      // Session indexes
      await this.collections.sessions.createIndexes([
        { key: { sessionId: 1 }, unique: true },
        { key: { projectId: 1, status: 1 } },
        { key: { userId: 1, createdAt: -1 } },
        { key: { 'statistics.lastActivity': -1 } },
        { key: { 'metadata.tags': 1 } },
      ]);
      
      // Reasoning indexes
      await this.collections.reasoningSteps.createIndexes([
        { key: { sessionId: 1, stepNumber: 1 } },
        { key: { projectId: 1, type: 1 } },
        { key: { 'content.keywords': 1 } },
        { key: { 'context.filesReferenced': 1 } },
        { key: { createdAt: -1 } },
        { key: { 'content.summary': 'text', 'content.raw': 'text' } },
      ]);
      
      // Reasoning embeddings index for vector search
      await this.collections.reasoningEmbeddings.createIndexes([
        { key: { sessionId: 1 } },
        { key: { projectId: 1 } },
      ]);
      
      // Session checkpoints indexes
      await this.collections.sessionCheckpoints.createIndexes([
        { key: { sessionId: 1, createdAt: -1 } },
        { key: { checkpointId: 1 }, unique: true },
      ]);
      
      // Code embeddings indexes
      await this.collections.codeEmbeddings.createIndexes([
        { key: { 'metadata.projectId': 1, 'metadata.repositoryName': 1 } },
        { key: { 'metadata.projectId': 1, 'metadata.filePath': 1 } },
        { key: { 'timestamps.indexed': -1 } },
      ]);
      
      // Indexing jobs indexes (handle existing null values)
      try {
        await this.collections.indexingJobs.createIndexes([
          { key: { jobId: 1 }, unique: true, sparse: true },
          { key: { projectId: 1, status: 1 } },
          { key: { 'timestamps.created': -1 } },
        ]);
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key error - drop and recreate without unique constraint
          await this.collections.indexingJobs.dropIndex('jobId_1');
          await this.collections.indexingJobs.createIndexes([
            { key: { jobId: 1 }, sparse: true },
            { key: { projectId: 1, status: 1 } },
            { key: { 'timestamps.created': -1 } },
          ]);
        } else {
          throw error;
        }
      }
      
      // Agent registrations indexes
      await this.collections.agentRegistrations.createIndexes([
        { key: { agentId: 1 }, unique: true },
        { key: { projectId: 1, 'session.status': 1 } },
        { key: { 'session.lastHeartbeat': -1 } },
        { key: { userId: 1 } }
      ]);
      
      // Agent memories indexes
      await this.collections.agentMemories.createIndexes([
        { key: { memoryId: 1 }, unique: true },
        { key: { agentId: 1, projectId: 1, createdAt: -1 } },
        { key: { type: 1, projectId: 1 } },
        { key: { importance: -1 } },
        { key: { 'metadata.tags': 1 } }
      ]);
      
      // File locks indexes
      await this.collections.fileLocks.createIndexes([
        { key: { filePath: 1, projectId: 1 } },
        { key: { agentId: 1 } },
        { key: { expiresAt: 1 }, expireAfterSeconds: 0 }
      ]);
      
      // Agent tasks indexes
      await this.collections.agentTasks.createIndexes([
        { key: { taskId: 1 }, unique: true },
        { key: { projectId: 1, status: 1 } },
        { key: { assignedTo: 1, status: 1 } },
        { key: { priority: -1, createdAt: 1 } }
      ]);
      
      // Agent events indexes
      await this.collections.agentEvents.createIndexes([
        { key: { eventId: 1 }, unique: true },
        { key: { agentId: 1, timestamp: -1 } },
        { key: { projectId: 1, eventType: 1 } },
        { key: { timestamp: -1 } }
      ]);
      
      logger.info('✅ Database indexes created successfully');
    } catch (error) {
      logger.error('❌ Failed to create indexes', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collections = null;
    }
    
    // Disconnect Mongoose
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    logger.info('Disconnected from MongoDB');
  }
  
  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
  
  getCollections(): DatabaseCollections {
    if (!this.collections) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.collections;
  }
  
  async healthCheck(): Promise<{
    connected: boolean;
    responseTime: number;
    collections: number;
    error?: string;
  }> {
    const start = Date.now();
    
    try {
      if (!this.client || !this.db) {
        return {
          connected: false,
          responseTime: 0,
          collections: 0,
          error: 'Not connected',
        };
      }
      
      await this.db.admin().ping();
      const collections = await this.db.listCollections().toArray();
      
      return {
        connected: true,
        responseTime: Date.now() - start,
        collections: collections.length,
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - start,
        collections: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const database = new DatabaseManager();