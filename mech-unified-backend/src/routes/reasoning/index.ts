import { Router } from 'express';
import { reasoningController } from './reasoning.controller';
import { validateRequest } from '../../middleware/validation';
import { 
  storeReasoningSchema, 
  searchReasoningSchema,
  analyzeReasoningSchema 
} from './reasoning.validation';

export const reasoningRouter = Router();

// Store reasoning
reasoningRouter.post('/store', validateRequest(storeReasoningSchema), reasoningController.storeReasoning);

// Get reasoning chain
reasoningRouter.get('/chain/:sessionId', reasoningController.getReasoningChain);

// Search reasoning
reasoningRouter.post('/search', validateRequest(searchReasoningSchema), reasoningController.searchReasoning);

// Analyze reasoning patterns
reasoningRouter.post('/analyze/:sessionId', validateRequest(analyzeReasoningSchema), reasoningController.analyzeReasoning);

// Get specific reasoning step
reasoningRouter.get('/step/:stepId', reasoningController.getReasoningStep);