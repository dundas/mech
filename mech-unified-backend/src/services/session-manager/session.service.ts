import { database } from '../../config/database';
import { IClaudeSessionV2, ISessionUpdate } from '../../models/session.model';
import { logger } from '../../utils/logger';

export class SessionService {
  async createSession(sessionData: Partial<IClaudeSessionV2>): Promise<IClaudeSessionV2> {
    const session: IClaudeSessionV2 = {
      ...sessionData,
      status: 'active',
      context: {
        workingDirectory: process.cwd(),
        gitBranch: 'unknown',
        gitCommit: 'unknown',
        activeFiles: [],
        modifiedFiles: [],
      },
      statistics: {
        startTime: new Date(),
        lastActivity: new Date(),
        totalDuration: 0,
        reasoningSteps: 0,
        toolInvocations: 0,
        filesModified: 0,
        errorsEncountered: 0,
        tokensUsed: 0,
      },
      checkpoints: [],
      reasoningChain: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as IClaudeSessionV2;

    const collections = database.getCollections();
    const result = await collections.sessions.insertOne(session);
    
    return { ...session, _id: result.insertedId };
  }

  async getSession(sessionId: string): Promise<IClaudeSessionV2 | null> {
    const collections = database.getCollections();
    return await collections.sessions.findOne({ sessionId });
  }

  async updateSession(sessionId: string, updates: ISessionUpdate): Promise<IClaudeSessionV2 | null> {
    const collections = database.getCollections();
    
    const updateDoc: any = {
      $set: {
        updatedAt: new Date(),
        'statistics.lastActivity': new Date(),
      },
    };
    
    // Add each update field separately to maintain proper types
    if (updates.status) updateDoc.$set.status = updates.status;
    if (updates.metadata) {
      Object.keys(updates.metadata).forEach(key => {
        updateDoc.$set[`metadata.${key}`] = (updates.metadata as any)[key];
      });
    }
    if (updates.context) {
      Object.keys(updates.context).forEach(key => {
        updateDoc.$set[`context.${key}`] = (updates.context as any)[key];
      });
    }
    if (updates.statistics) {
      Object.keys(updates.statistics).forEach(key => {
        updateDoc.$set[`statistics.${key}`] = (updates.statistics as any)[key];
      });
    }
    if (updates.error) updateDoc.$set.error = updates.error;

    const result = await collections.sessions.findOneAndUpdate(
      { sessionId },
      updateDoc,
      { returnDocument: 'after' }
    );

    return result;
  }

  async endSession(sessionId: string): Promise<IClaudeSessionV2 | null> {
    return this.updateSession(sessionId, { status: 'completed' });
  }

  async listSessions(query: any): Promise<{ sessions: IClaudeSessionV2[]; total: number }> {
    const collections = database.getCollections();
    
    const filter: any = {};
    if (query.projectId) filter.projectId = query.projectId;
    if (query.status) filter.status = query.status;
    
    const sessions = await collections.sessions
      .find(filter)
      .limit(query.limit || 20)
      .skip(query.offset || 0)
      .toArray();
      
    const total = await collections.sessions.countDocuments(filter);
    
    return { sessions, total };
  }

  async getSessionStatistics(sessionId: string): Promise<any> {
    const session = await this.getSession(sessionId);
    return session?.statistics || null;
  }

  async createCheckpoint(sessionId: string, checkpointData: any): Promise<any> {
    const collections = database.getCollections();
    
    const checkpoint = {
      ...checkpointData,
      sessionId,
      createdAt: new Date(),
    };
    
    const result = await collections.sessionCheckpoints.insertOne(checkpoint);
    
    // Update session with checkpoint reference
    await collections.sessions.updateOne(
      { sessionId },
      { $push: { checkpoints: result.insertedId } }
    );
    
    return { ...checkpoint, _id: result.insertedId };
  }

  async listCheckpoints(sessionId: string, limit: number, offset: number): Promise<any[]> {
    const collections = database.getCollections();
    
    return await collections.sessionCheckpoints
      .find({ sessionId })
      .limit(limit)
      .skip(offset)
      .toArray();
  }

  async restoreCheckpoint(sessionId: string, _checkpointId: string): Promise<IClaudeSessionV2 | null> {
    // TODO: Implement checkpoint restoration
    logger.info('Checkpoint restoration not yet implemented');
    return this.getSession(sessionId);
  }
}