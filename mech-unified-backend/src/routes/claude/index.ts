import { Router } from 'express';
import { claudeController } from './claude.controller';
import { validateRequest } from '../../middleware/validation';
import { processHookSchema, updateStateSchema } from './claude.validation';

export const claudeRouter = Router();

// Process Claude Code hooks
claudeRouter.post('/hooks', validateRequest(processHookSchema), claudeController.processHook);

// Update session state
claudeRouter.post('/state', validateRequest(updateStateSchema), claudeController.updateState);

// Get active sessions
claudeRouter.get('/sessions', claudeController.getActiveSessions);

// Get hook processing status
claudeRouter.get('/hooks/status', claudeController.getHookStatus);