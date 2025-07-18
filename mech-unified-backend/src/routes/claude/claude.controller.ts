import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { database } from '../../config/database';
import { sessionService } from '../../services/session.service';
import { reasoningService } from '../../services/reasoning.service';
import { ValidationError } from '../../middleware/error';

export const claudeController = {
  async processHook(req: Request, res: Response) {
    try {
      const hookData = req.body;
      
      logger.info('Processing Claude hook', {
        sessionId: hookData.sessionId,
        eventType: hookData.eventType,
        toolName: hookData.toolName,
      });
      
      // Store hook event
      const collections = database.getCollections();
      const hookEvent = {
        sessionId: hookData.sessionId,
        projectId: hookData.projectId,
        eventType: hookData.eventType,
        toolName: hookData.toolName,
        toolInput: hookData.toolInput,
        toolOutput: hookData.toolOutput,
        reasoning: hookData.reasoning,
        metadata: hookData.metadata,
        createdAt: new Date(),
      };
      
      await collections.hookEvents.insertOne(hookEvent);
      
      // Process based on event type
      switch (hookData.eventType) {
        case 'SessionStart':
          // Create or update session
          await sessionService.createSession({
            sessionId: hookData.sessionId,
            projectId: hookData.projectId,
            agent: hookData.agent,
            metadata: hookData.metadata,
          });
          break;
          
        case 'PreToolUse':
          // Store reasoning before tool use
          if (hookData.reasoning) {
            await reasoningService.storeReasoningStep({
              sessionId: hookData.sessionId,
              projectId: hookData.projectId,
              type: 'decision' as const,
              content: {
                raw: hookData.reasoning,
                summary: `Selected tool: ${hookData.toolName}`,
                confidence: 0.9,
                keywords: [hookData.toolName, 'tool_selection'],
                entities: {
                  files: [],
                  functions: [],
                  variables: [],
                  concepts: [hookData.toolName],
                },
              },
              context: {
                precedingSteps: [],
                toolsUsed: [hookData.toolName],
                filesReferenced: [],
                filesModified: [],
                codeBlocks: [],
                errors: [],
                decisions: [{
                  question: 'Which tool to use?',
                  choice: hookData.toolName,
                  alternatives: [],
                  rationale: hookData.reasoning,
                }],
              },
            });
          }
          
          // Update session statistics
          // Update session statistics
          await sessionService.updateStatistics(hookData.sessionId, {
            toolInvocations: 1,
          });
          break;
          
        case 'PostToolUse':
          // Store tool output as reasoning
          if (hookData.toolOutput) {
            await reasoningService.storeReasoningStep({
              sessionId: hookData.sessionId,
              projectId: hookData.projectId,
              type: 'execution' as const,
              content: {
                raw: JSON.stringify(hookData.toolOutput),
                summary: `Tool ${hookData.toolName} completed`,
                confidence: 0.95,
                keywords: [hookData.toolName, 'tool_result'],
                entities: {
                  files: hookData.toolOutput?.filesModified || [],
                  functions: [],
                  variables: [],
                  concepts: [hookData.toolName],
                },
              },
              context: {
                precedingSteps: [],
                toolsUsed: [hookData.toolName],
                filesReferenced: hookData.toolOutput?.filesModified || [],
                filesModified: hookData.toolOutput?.filesModified || [],
                codeBlocks: [],
                errors: [],
                decisions: [],
              },
            });
          }
          
          // Update files modified count if applicable
          // Update files modified count if applicable
          if (hookData.toolOutput?.filesModified?.length > 0) {
            await sessionService.updateStatistics(hookData.sessionId, {
              filesModified: hookData.toolOutput.filesModified.length,
            });
          }
          break;
          
        case 'Stop':
          // End session
          await sessionService.endSession(
            hookData.sessionId,
            hookData.metadata?.summary
          );
          break;
      }
      
      const result = await collections.hookEvents.insertOne(hookEvent);
      
      res.json({
        success: true,
        hookId: result.insertedId,
        actions: [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to process hook', error);
      throw error;
    }
  },
  
  async updateState(req: Request, res: Response) {
    try {
      const { sessionId, state } = req.body;
      
      if (!sessionId) {
        throw new ValidationError('sessionId is required');
      }
      
      logger.info('Updating Claude state', { sessionId });
      
      // Update session with new state
      await sessionService.updateSession(sessionId, {
        context: state.context,
        metadata: { ...state.metadata, lastStateUpdate: new Date() },
      });
      
      // Create a checkpoint for the state
      await sessionService.createCheckpoint(sessionId, {
        description: 'State update',
        state,
      });
      
      res.json({
        success: true,
        sessionId,
        message: 'State updated successfully',
      });
    } catch (error) {
      throw error;
    }
  },
  
  async getActiveSessions(req: Request, res: Response) {
    try {
      const { projectId } = req.query;
      
      const sessions = await sessionService.getActiveSessions(
        projectId as string | undefined
      );
      
      res.json({
        success: true,
        sessions,
        total: sessions.length,
      });
    } catch (error) {
      throw error;
    }
  },
  
  async getHookStatus(_req: Request, res: Response) {
    try {
      const collections = database.getCollections();
      
      // Get statistics
      const activeSessions = await sessionService.getActiveSessions();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const processedToday = await collections.hookEvents.countDocuments({
        createdAt: { $gte: today },
      });
      
      const recentHooks = await collections.hookEvents
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      
      res.json({
        success: true,
        status: 'active',
        activeSessions: activeSessions.length,
        processedToday,
        averageProcessingTime: 0, // TODO: Calculate from hook processing times
        recentHooks: recentHooks.map(hook => ({
          sessionId: hook.sessionId,
          eventType: hook.eventType,
          toolName: hook.toolName,
          createdAt: hook.createdAt,
        })),
      });
    } catch (error) {
      throw error;
    }
  },
};