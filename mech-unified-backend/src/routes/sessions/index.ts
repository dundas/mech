import { Router } from 'express';
import { sessionController } from './session.controller';
import { validateRequest } from '../../middleware/validation';
import { 
  createSessionSchema, 
  updateSessionSchema, 
  querySessionSchema,
  createCheckpointSchema 
} from './session.validation';

export const sessionRouter = Router();

// Session management
sessionRouter.post('/start', validateRequest(createSessionSchema), sessionController.createSession);
sessionRouter.get('/:sessionId', sessionController.getSession);
sessionRouter.patch('/:sessionId/state', validateRequest(updateSessionSchema), sessionController.updateSessionState);
sessionRouter.post('/:sessionId/end', sessionController.endSession);

// Session queries
sessionRouter.get('/', validateRequest(querySessionSchema, 'query'), sessionController.listSessions);
sessionRouter.get('/:sessionId/stats', sessionController.getSessionStats);

// Checkpoints
sessionRouter.post('/:sessionId/checkpoint', validateRequest(createCheckpointSchema), sessionController.createCheckpoint);
sessionRouter.get('/:sessionId/checkpoints', sessionController.listCheckpoints);
sessionRouter.post('/:sessionId/restore/:checkpointId', sessionController.restoreCheckpoint);

// Real-time updates (Server-Sent Events)
sessionRouter.get('/:sessionId/sse', sessionController.subscribeToUpdates);