import Joi from 'joi';

export const createSessionSchema = Joi.object({
  projectId: Joi.string().required(),
  userId: Joi.string().optional(),
  threadId: Joi.string().optional(),
  agent: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().required(),
    model: Joi.string().required(),
    capabilities: Joi.array().items(Joi.string()).default([]),
  }).required(),
  environment: Joi.object({
    os: Joi.string().required(),
    arch: Joi.string().required(),
    nodeVersion: Joi.string().required(),
    hostname: Joi.string().required(),
    user: Joi.string().required(),
  }).required(),
  configuration: Joi.object().default({}),
  metadata: Joi.object({
    tokens: Joi.object({
      github: Joi.string().valid('available', 'missing', 'invalid').required(),
      mech: Joi.string().valid('available', 'missing', 'invalid').required(),
      openai: Joi.string().valid('available', 'missing', 'invalid').required(),
    }).required(),
    tags: Joi.array().items(Joi.string()).default([]),
  }).required(),
});

export const updateSessionSchema = Joi.object({
  status: Joi.string().valid('active', 'paused', 'completed', 'error').optional(),
  context: Joi.object({
    workingDirectory: Joi.string().optional(),
    gitBranch: Joi.string().optional(),
    gitCommit: Joi.string().optional(),
    activeFiles: Joi.array().items(Joi.string()).optional(),
    modifiedFiles: Joi.array().items(Joi.string()).optional(),
    currentTool: Joi.string().optional(),
    lastCommand: Joi.string().optional(),
  }).optional(),
  statistics: Joi.object({
    reasoningSteps: Joi.number().optional(),
    toolInvocations: Joi.number().optional(),
    filesModified: Joi.number().optional(),
    errorsEncountered: Joi.number().optional(),
    tokensUsed: Joi.number().optional(),
  }).optional(),
  error: Joi.object({
    message: Joi.string().required(),
    stack: Joi.string().optional(),
  }).optional(),
});

export const querySessionSchema = Joi.object({
  projectId: Joi.string().optional(),
  userId: Joi.string().optional(),
  status: Joi.alternatives().try(
    Joi.string().valid('initializing', 'active', 'paused', 'completed', 'error', 'abandoned'),
    Joi.array().items(Joi.string().valid('initializing', 'active', 'paused', 'completed', 'error', 'abandoned'))
  ).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('createdAt', 'lastActivity', 'duration').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const createCheckpointSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  files: Joi.array().items(Joi.object({
    path: Joi.string().required(),
    content: Joi.string().required(),
  })).optional(),
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string()).default([]),
  }).optional(),
});