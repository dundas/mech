import { Request, Response } from 'express';
import { reasoningService } from '../../services/reasoning.service';
import { ValidationError } from '../../middleware/error';

export const reasoningController = {
  async storeReasoning(req: Request, res: Response) {
    try {
      const { sessionId, projectId, type, content, context, quality, metadata } = req.body;
      
      if (!sessionId || !projectId) {
        throw new ValidationError('sessionId and projectId are required');
      }
      
      const reasoningStep = await reasoningService.storeReasoningStep({
        sessionId,
        projectId,
        type,
        content,
        context,
        quality,
        metadata,
      });
      
      res.status(201).json({
        success: true,
        reasoningStep,
        message: 'Reasoning stored successfully',
      });
    } catch (error) {
      throw error;
    }
  },
  
  async getReasoningChain(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      
      const chain = await reasoningService.getReasoningChain(sessionId);
      
      res.json({
        success: true,
        sessionId,
        chain,
        total: chain.length,
      });
    } catch (error) {
      throw error;
    }
  },
  
  async searchReasoning(req: Request, res: Response) {
    try {
      const { query, filters } = req.body;
      
      if (!query) {
        throw new ValidationError('Query is required for search');
      }
      
      const result = await reasoningService.searchReasoning(query, filters);
      
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      throw error;
    }
  },
  
  async analyzeReasoning(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      
      const analysis = await reasoningService.analyzeReasoningChain(sessionId);
      
      res.json({
        success: true,
        sessionId,
        analysis,
      });
    } catch (error) {
      throw error;
    }
  },
  
  async getReasoningStep(req: Request, res: Response) {
    try {
      const { } = req.params;
      
      // TODO: Implement single step retrieval in service
      res.json({
        success: true,
        step: null,
        message: 'Step retrieval not yet implemented',
      });
    } catch (error) {
      throw error;
    }
  },
};