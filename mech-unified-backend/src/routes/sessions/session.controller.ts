import { Request, Response } from 'express';
import { SessionService } from '../../services/session-manager/session.service';
import { logger } from '../../utils/logger';
import { NotFoundError } from '../../middleware/error';
const sessionService = new SessionService();
const sseConnections = new Map<string, Response>();

export const sessionController = {
  async createSession(req: Request, res: Response) {
    const sessionData = req.body;
    
    const session = await sessionService.createSession({
      ...sessionData,
      sessionId: `claude_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
    
    logger.info('Session created', {
      sessionId: session.sessionId,
      projectId: session.projectId,
      agent: session.agent.name,
    });
    
    res.status(201).json({
      success: true,
      session,
      message: 'Session created successfully',
    });
  },
  
  async getSession(req: Request, res: Response) {
    const { sessionId } = req.params;
    
    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }
    
    res.json({
      success: true,
      session,
    });
  },
  
  async updateSessionState(req: Request, res: Response) {
    const { sessionId } = req.params;
    const updates = req.body;
    
    const session = await sessionService.updateSession(sessionId, updates);
    
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }
    
    // Broadcast update to SSE subscribers
    const sseRes = sseConnections.get(sessionId);
    if (sseRes) {
      sseRes.write(`data: ${JSON.stringify({
        type: 'state_update',
        data: session,
        timestamp: new Date().toISOString(),
      })}\n\n`);
    }
    
    res.json({
      success: true,
      session,
      message: 'Session state updated',
    });
  },
  
  async endSession(req: Request, res: Response) {
    const { sessionId } = req.params;
    
    const session = await sessionService.endSession(sessionId);
    
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }
    
    // Close SSE connection
    const sseRes = sseConnections.get(sessionId);
    if (sseRes) {
      sseRes.write(`data: ${JSON.stringify({
        type: 'session_end',
        data: { sessionId },
        timestamp: new Date().toISOString(),
      })}\n\n`);
      sseRes.end();
      sseConnections.delete(sessionId);
    }
    
    res.json({
      success: true,
      session,
      message: 'Session ended successfully',
    });
  },
  
  async listSessions(req: Request, res: Response) {
    const query = req.query;
    
    const result = await sessionService.listSessions(query);
    
    res.json({
      success: true,
      ...result,
    });
  },
  
  async getSessionStats(req: Request, res: Response) {
    const { sessionId } = req.params;
    
    const stats = await sessionService.getSessionStatistics(sessionId);
    
    if (!stats) {
      throw new NotFoundError('Session', sessionId);
    }
    
    res.json({
      success: true,
      stats,
    });
  },
  
  async createCheckpoint(req: Request, res: Response) {
    const { sessionId } = req.params;
    const checkpointData = req.body;
    
    const checkpoint = await sessionService.createCheckpoint(sessionId, {
      ...checkpointData,
      checkpointId: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
    
    res.status(201).json({
      success: true,
      checkpoint,
      message: 'Checkpoint created successfully',
    });
  },
  
  async listCheckpoints(req: Request, res: Response) {
    const { sessionId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const checkpoints = await sessionService.listCheckpoints(
      sessionId,
      Number(limit),
      Number(offset)
    );
    
    res.json({
      success: true,
      checkpoints,
    });
  },
  
  async restoreCheckpoint(req: Request, res: Response) {
    const { sessionId, checkpointId } = req.params;
    
    const session = await sessionService.restoreCheckpoint(sessionId, checkpointId);
    
    res.json({
      success: true,
      session,
      message: 'Checkpoint restored successfully',
    });
  },
  
  subscribeToUpdates(req: Request, res: Response) {
    const { sessionId } = req.params;
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    // Store connection
    sseConnections.set(sessionId, res);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      sessionId,
      timestamp: new Date().toISOString(),
    })}\n\n`);
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(':ping\n\n');
    }, 30000);
    
    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      sseConnections.delete(sessionId);
    });
  },
};