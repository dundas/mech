import { Router } from 'express';
import { config } from '../config';
import { createApplication, listApplications, getApplicationById, updateApplication, deleteApplication } from '../services/application';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

const router = Router();

// Middleware to check master API key for application management
const requireMasterKey = (req: any, res: any, next: any) => {
  const apiKey = req.headers[config.security.apiKeyHeader] as string;
  
  if (!config.security.masterApiKey || apiKey !== config.security.masterApiKey) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Master API key required',
      },
    } as ApiResponse);
  }
  
  next();
};

// Create a new application
router.post('/', requireMasterKey, async (req, res) => {
  try {
    const { name, settings } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_NAME',
          message: 'Application name is required',
        },
      } as ApiResponse);
    }

    const application = await createApplication({ name, settings });
    
    logger.info(`Created new application: ${application.id} (${application.name})`);

    res.status(201).json({
      success: true,
      data: application,
    } as ApiResponse);

  } catch (error) {
    logger.error('Error creating application:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create application',
      },
    } as ApiResponse);
  }
});

// List all applications
router.get('/', requireMasterKey, async (req, res) => {
  try {
    const applications = await listApplications();
    
    res.json({
      success: true,
      data: applications,
    } as ApiResponse);

  } catch (error) {
    logger.error('Error listing applications:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to list applications',
      },
    } as ApiResponse);
  }
});

// Get application by ID
router.get('/:id', requireMasterKey, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await getApplicationById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: `Application '${id}' not found`,
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: application,
    } as ApiResponse);

  } catch (error) {
    logger.error('Error getting application:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ERROR',
        message: 'Failed to get application',
      },
    } as ApiResponse);
  }
});

// Update application
router.patch('/:id', requireMasterKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, settings } = req.body;
    
    const application = await updateApplication(id, { name, settings });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: `Application '${id}' not found`,
        },
      } as ApiResponse);
    }

    logger.info(`Updated application: ${application.id} (${application.name})`);

    res.json({
      success: true,
      data: application,
    } as ApiResponse);

  } catch (error) {
    logger.error('Error updating application:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update application',
      },
    } as ApiResponse);
  }
});

// Delete application
router.delete('/:id', requireMasterKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await deleteApplication(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: `Application '${id}' not found`,
        },
      } as ApiResponse);
    }

    logger.info(`Deleted application: ${id}`);

    res.json({
      success: true,
      data: {
        message: 'Application deleted successfully',
      },
    } as ApiResponse);

  } catch (error) {
    logger.error('Error deleting application:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete application',
      },
    } as ApiResponse);
  }
});

export default router;