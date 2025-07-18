import { ObjectId } from 'mongodb';
import { IClaudeSessionV2, ISessionCheckpoint } from '../models/session.model';
import { database } from '../config/database';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../middleware/error';

export class SessionService {
  async createSession(data: Partial<IClaudeSessionV2>): Promise<IClaudeSessionV2> {
    try {
      if (!data.sessionId || !data.projectId) {
        throw new ValidationError('sessionId and projectId are required');
      }
      
      const collections = database.getCollections();
      
      // Check if session already exists
      const existing = await collections.sessions.findOne({ sessionId: data.sessionId });
      if (existing) {
        logger.warn('Session already exists', { sessionId: data.sessionId });
        return existing;
      }
      
      const now = new Date();
      const session: IClaudeSessionV2 = {
        _id: new ObjectId(),
        sessionId: data.sessionId,
        projectId: data.projectId,
        userId: data.userId,
        status: 'active' as const,
        agent: data.agent || {
          name: 'claude',
          version: 'unknown',
          model: 'claude-3-opus',
          capabilities: ['code_generation', 'reasoning', 'file_operations'],
        },
        context: data.context || {
          workingDirectory: process.cwd(),
          gitBranch: 'main',
          gitCommit: 'unknown',
          activeFiles: [],
          modifiedFiles: [],
        },
        statistics: {
          startTime: now,
          lastActivity: now,
          totalDuration: 0,
          reasoningSteps: 0,
          toolInvocations: 0,
          filesModified: 0,
          errorsEncountered: 0,
          tokensUsed: 0,
        },
        checkpoints: [],
        reasoningChain: [],
        metadata: data.metadata || {
          environment: {
            os: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            hostname: 'unknown',
            user: 'unknown',
          },
          configuration: {},
          tags: [],
          tokens: {
            github: 'missing' as const,
            mech: 'missing' as const,
            openai: process.env.OPENAI_API_KEY ? 'available' as const : 'missing' as const,
          },
        },
        createdAt: now,
        updatedAt: now,
      };
      
      await collections.sessions.insertOne(session);
      logger.info('✅ Session created successfully', { 
        sessionId: session.sessionId,
        projectId: session.projectId,
      });
      
      return session;
    } catch (error) {
      logger.error('Failed to create session', error);
      throw error;
    }
  }
  
  async updateSession(sessionId: string, updates: Partial<IClaudeSessionV2>): Promise<IClaudeSessionV2> {
    try {
      const collections = database.getCollections();
      
      // Don't allow updating certain fields
      delete updates._id;
      delete updates.sessionId;
      delete updates.createdAt;
      
      const updateData = {
        ...updates,
        updatedAt: new Date(),
        'statistics.lastActivity': new Date(),
      };
      
      const result = await collections.sessions.findOneAndUpdate(
        { sessionId },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        throw new NotFoundError('Session', sessionId);
      }
      
      logger.info('Session updated', { sessionId });
      return result;
    } catch (error) {
      logger.error('Failed to update session', { sessionId, error });
      throw error;
    }
  }
  
  async getSession(sessionId: string): Promise<IClaudeSessionV2 | null> {
    try {
      const collections = database.getCollections();
      const session = await collections.sessions.findOne({ sessionId });
      
      if (session) {
        logger.debug('Session retrieved', { sessionId });
      }
      
      return session;
    } catch (error) {
      logger.error('Failed to get session', { sessionId, error });
      throw error;
    }
  }
  
  async endSession(sessionId: string, summary?: string): Promise<void> {
    try {
      const collections = database.getCollections();
      
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }
      
      const endTime = new Date();
      const duration = endTime.getTime() - session.statistics.startTime.getTime();
      
      await collections.sessions.updateOne(
        { sessionId },
        {
          $set: {
            status: 'completed' as const,
            'statistics.endTime': endTime,
            'statistics.totalDuration': duration,
            'metadata.summary': summary,
            updatedAt: endTime,
          },
        }
      );
      
      logger.info('Session ended', { 
        sessionId,
        duration: `${Math.round(duration / 1000)}s`,
      });
    } catch (error) {
      logger.error('Failed to end session', { sessionId, error });
      throw error;
    }
  }
  
  async createCheckpoint(sessionId: string, data: Partial<ISessionCheckpoint>): Promise<ISessionCheckpoint> {
    try {
      const collections = database.getCollections();
      
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }
      
      const checkpoint: ISessionCheckpoint = {
        _id: new ObjectId(),
        sessionId,
        checkpointId: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name || 'Checkpoint',
        description: data.description || 'Manual checkpoint',
        state: data.state || {
          context: session.context,
          statistics: session.statistics,
          reasoningCount: session.reasoningChain.length,
        },
        files: data.files || [],
        metadata: data.metadata || {
          createdBy: 'user' as const,
          tags: [],
          restoreCount: 0,
        },
        createdAt: new Date(),
      };
      
      await collections.sessionCheckpoints.insertOne(checkpoint);
      
      // Add checkpoint reference to session
      await collections.sessions.updateOne(
        { sessionId },
        { 
          $push: { checkpoints: checkpoint._id },
          $set: { updatedAt: new Date() },
        }
      );
      
      logger.info('Checkpoint created', { 
        sessionId,
        checkpointId: checkpoint.checkpointId,
      });
      
      return checkpoint;
    } catch (error) {
      logger.error('Failed to create checkpoint', { sessionId, error });
      throw error;
    }
  }
  
  async getActiveSessions(projectId?: string): Promise<IClaudeSessionV2[]> {
    try {
      const collections = database.getCollections();
      
      const query: any = { status: 'active' };
      if (projectId) {
        query.projectId = projectId;
      }
      
      const sessions = await collections.sessions
        .find(query)
        .sort({ 'statistics.lastActivity': -1 })
        .limit(100)
        .toArray();
      
      logger.info('Retrieved active sessions', { 
        count: sessions.length,
        projectId,
      });
      
      return sessions;
    } catch (error) {
      logger.error('Failed to get active sessions', { projectId, error });
      throw error;
    }
  }
  
  async updateStatistics(sessionId: string, stats: Partial<IClaudeSessionV2['statistics']>): Promise<void> {
    try {
      const collections = database.getCollections();
      
      const updateObj: any = {
        'statistics.lastActivity': new Date(),
        updatedAt: new Date(),
      };
      
      // Increment counters
      const increments: any = {};
      if (stats.toolInvocations) increments['statistics.toolInvocations'] = stats.toolInvocations;
      if (stats.filesModified) increments['statistics.filesModified'] = stats.filesModified;
      if (stats.reasoningSteps) increments['statistics.reasoningSteps'] = stats.reasoningSteps;
      if (stats.errorsEncountered) increments['statistics.errorsEncountered'] = stats.errorsEncountered;
      
      const update: any = { $set: updateObj };
      if (Object.keys(increments).length > 0) {
        update.$inc = increments;
      }
      
      await collections.sessions.updateOne({ sessionId }, update);
      
      logger.debug('Session statistics updated', { sessionId, stats });
    } catch (error) {
      logger.error('Failed to update statistics', { sessionId, error });
      // Don't throw - statistics updates shouldn't break the flow
    }
  }
}

export const sessionService = new SessionService();