import { ObjectId } from 'mongodb';
import { IReasoningStep, ReasoningType } from '../models/reasoning.model';
import { database } from '../config/database';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../middleware/error';
import { sessionService } from './session.service';

export class ReasoningService {
  async storeReasoningStep(data: Partial<IReasoningStep>): Promise<IReasoningStep> {
    try {
      if (!data.sessionId || !data.projectId) {
        throw new ValidationError('sessionId and projectId are required');
      }
      
      const collections = database.getCollections();
      
      // Get the session to ensure it exists and get current step count
      const session = await sessionService.getSession(data.sessionId);
      if (!session) {
        throw new NotFoundError('Session', data.sessionId);
      }
      
      const stepNumber = session.reasoningChain.length + 1;
      
      const reasoningStep: IReasoningStep = {
        _id: new ObjectId(),
        sessionId: data.sessionId,
        projectId: data.projectId,
        stepNumber,
        type: data.type || 'analysis',
        content: {
          raw: data.content?.raw || '',
          summary: data.content?.summary || this.generateSummary(data.content?.raw || ''),
          confidence: data.content?.confidence || 0.8,
          keywords: data.content?.keywords || this.extractKeywords(data.content?.raw || ''),
          entities: data.content?.entities || {
            files: [],
            functions: [],
            variables: [],
            concepts: [],
          },
        },
        context: data.context || {
          precedingSteps: [],
          toolsUsed: [],
          filesReferenced: [],
          filesModified: [],
          codeBlocks: [],
          errors: [],
          decisions: [],
        },
        quality: data.quality || {
          clarity: 0.8,
          completeness: 0.8,
          usefulness: 0.8,
        },
        metadata: data.metadata || {
          timestamp: new Date(),
          duration: 0,
          tokenCount: {
            prompt: 0,
            completion: 0,
            total: 0,
          },
          model: 'claude',
          temperature: 0.7,
          maxTokens: 4096,
        },
        relatedSteps: [],
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      
      await collections.reasoningSteps.insertOne(reasoningStep);
      
      // Add to session's reasoning chain
      await collections.sessions.updateOne(
        { sessionId: data.sessionId },
        { 
          $push: { reasoningChain: reasoningStep._id },
          $inc: { 'statistics.reasoningSteps': 1 },
          $set: { 
            updatedAt: new Date(),
            'statistics.lastActivity': new Date(),
          },
        }
      );
      
      logger.info('✅ Reasoning step stored', { 
        sessionId: data.sessionId,
        stepNumber,
        type: reasoningStep.type,
      });
      
      // Generate embeddings asynchronously if enabled
      if (process.env.ENABLE_REASONING_EMBEDDINGS === 'true') {
        this.generateEmbeddings(reasoningStep).catch(err => 
          logger.error('Failed to generate embeddings', err)
        );
      }
      
      return reasoningStep;
    } catch (error) {
      logger.error('Failed to store reasoning step', error);
      throw error;
    }
  }
  
  async getReasoningChain(sessionId: string): Promise<IReasoningStep[]> {
    try {
      const collections = database.getCollections();
      
      const session = await sessionService.getSession(sessionId);
      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }
      
      const steps = await collections.reasoningSteps
        .find({ sessionId })
        .sort({ stepNumber: 1 })
        .toArray();
      
      logger.info('Retrieved reasoning chain', { 
        sessionId,
        steps: steps.length,
      });
      
      return steps;
    } catch (error) {
      logger.error('Failed to get reasoning chain', { sessionId, error });
      throw error;
    }
  }
  
  async searchReasoning(query: string, filters?: {
    projectId?: string;
    sessionId?: string;
    type?: ReasoningType;
    dateRange?: { start: Date; end: Date };
  }): Promise<{
    results: IReasoningStep[];
    total: number;
    searchTime: number;
  }> {
    try {
      const start = Date.now();
      const collections = database.getCollections();
      
      const searchQuery: any = {
        $text: { $search: query },
      };
      
      if (filters?.projectId) searchQuery.projectId = filters.projectId;
      if (filters?.sessionId) searchQuery.sessionId = filters.sessionId;
      if (filters?.type) searchQuery.type = filters.type;
      if (filters?.dateRange) {
        searchQuery.createdAt = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end,
        };
      }
      
      const results = await collections.reasoningSteps
        .find(searchQuery)
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .limit(50)
        .toArray();
      
      const total = await collections.reasoningSteps.countDocuments(searchQuery);
      
      logger.info('Reasoning search completed', { 
        query,
        results: results.length,
        total,
        searchTime: Date.now() - start,
      });
      
      return {
        results,
        total,
        searchTime: Date.now() - start,
      };
    } catch (error) {
      logger.error('Failed to search reasoning', { query, error });
      throw error;
    }
  }
  
  async analyzeReasoningChain(sessionId: string): Promise<{
    patterns: Record<string, any>;
    metrics: Record<string, number>;
    insights: Record<string, any>;
    generatedAt: Date;
  }> {
    try {
      const steps = await this.getReasoningChain(sessionId);
      
      if (steps.length === 0) {
        throw new ValidationError('No reasoning steps found for analysis');
      }
      
      // Analyze patterns
      const typeDistribution = steps.reduce((acc, step) => {
        acc[step.type] = (acc[step.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const toolUsage = steps.reduce((acc, step) => {
        step.context.toolsUsed.forEach(tool => {
          acc[tool] = (acc[tool] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);
      
      const fileModifications = steps.reduce((acc, step) => {
        step.context.filesReferenced.forEach(file => {
          acc[file] = (acc[file] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);
      
      // Calculate metrics
      const avgQuality = {
        clarity: steps.reduce((sum, s) => sum + (s.quality?.clarity || 0), 0) / steps.length,
        completeness: steps.reduce((sum, s) => sum + (s.quality?.completeness || 0), 0) / steps.length,
        usefulness: steps.reduce((sum, s) => sum + (s.quality?.usefulness || 0), 0) / steps.length,
      };
      
      const keywordFrequency = steps.reduce((acc, step) => {
        step.content.keywords.forEach(keyword => {
          acc[keyword] = (acc[keyword] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);
      
      // Extract top keywords
      const topKeywords = Object.entries(keywordFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }));
      
      const analysis = {
        patterns: {
          typeDistribution,
          toolUsage,
          fileModifications,
          topKeywords,
        },
        metrics: {
          totalSteps: steps.length,
          avgQualityClarity: avgQuality.clarity,
          avgQualityCompleteness: avgQuality.completeness,
          avgQualityUsefulness: avgQuality.usefulness,
          uniqueFilesReferenced: Object.keys(fileModifications).length,
          uniqueToolsUsed: Object.keys(toolUsage).length,
        },
        insights: {
          mostCommonType: Object.entries(typeDistribution)
            .sort(([, a], [, b]) => b - a)[0]?.[0],
          mostUsedTool: Object.entries(toolUsage)
            .sort(([, a], [, b]) => b - a)[0]?.[0],
          mostModifiedFile: Object.entries(fileModifications)
            .sort(([, a], [, b]) => b - a)[0]?.[0],
          reasoningFlow: this.analyzeReasoningFlow(steps),
        },
        generatedAt: new Date(),
      };
      
      logger.info('Reasoning analysis completed', { sessionId });
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze reasoning chain', { sessionId, error });
      throw error;
    }
  }
  
  private generateSummary(text: string): string {
    // Simple summary generation - first 200 chars or first sentence
    const firstSentence = text.match(/^[^.!?]+[.!?]/)?.[0];
    if (firstSentence && firstSentence.length <= 200) {
      return firstSentence;
    }
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - common programming terms
    const keywords = new Set<string>();
    const terms = [
      'function', 'class', 'component', 'service', 'model', 'controller',
      'database', 'api', 'endpoint', 'route', 'middleware', 'error',
      'test', 'import', 'export', 'async', 'await', 'promise',
      'typescript', 'javascript', 'react', 'node', 'express',
    ];
    
    const lowerText = text.toLowerCase();
    terms.forEach(term => {
      if (lowerText.includes(term)) {
        keywords.add(term);
      }
    });
    
    // Extract file extensions
    const fileMatches = text.match(/\.\w{2,4}\b/g);
    if (fileMatches) {
      fileMatches.forEach(ext => keywords.add(ext));
    }
    
    return Array.from(keywords).slice(0, 10);
  }
  
  private analyzeReasoningFlow(steps: IReasoningStep[]): string[] {
    // Analyze the flow of reasoning types
    const flow: string[] = [];
    let currentPhase = '';
    
    steps.forEach(step => {
      if (step.type !== currentPhase) {
        currentPhase = step.type;
        flow.push(currentPhase);
      }
    });
    
    return flow;
  }
  
  private async generateEmbeddings(step: IReasoningStep): Promise<void> {
    try {
      // TODO: Implement OpenAI embeddings generation
      // For now, just log
      logger.debug('Embeddings generation skipped', { 
        sessionId: step.sessionId,
        stepNumber: step.stepNumber,
      });
    } catch (error) {
      logger.error('Failed to generate embeddings', error);
    }
  }
}

export const reasoningService = new ReasoningService();