import Joi from 'joi';

export const storeReasoningSchema = Joi.object({
  sessionId: Joi.string().required(),
  projectId: Joi.string().required(),
  reasoning: Joi.object({
    step: Joi.number().integer().min(1).required(),
    type: Joi.string()
      .valid('analysis', 'planning', 'execution', 'reflection', 'error', 'decision', 'exploration', 'validation')
      .required(),
    content: Joi.string().required(),
    confidence: Joi.number().min(0).max(1).required(),
    context: Joi.object({
      files: Joi.array().items(Joi.string()).default([]),
      codeReferences: Joi.array().items(
        Joi.object({
          file: Joi.string().required(),
          lines: Joi.object({
            start: Joi.number().integer().min(1).required(),
            end: Joi.number().integer().min(1).required(),
          }).required(),
        })
      ).default([]),
      toolsUsed: Joi.array().items(Joi.string()).default([]),
      errors: Joi.array().items(
        Joi.object({
          message: Joi.string().required(),
          type: Joi.string().required(),
          resolved: Joi.boolean().default(false),
        })
      ).default([]),
    }).required(),
    metadata: Joi.object({
      model: Joi.string().required(),
      temperature: Joi.number().min(0).max(2).required(),
      tokenCount: Joi.object({
        prompt: Joi.number().integer().min(0).required(),
        completion: Joi.number().integer().min(0).required(),
      }).optional(),
    }).required(),
  }).required(),
});

export const searchReasoningSchema = Joi.object({
  query: Joi.string().required(),
  filters: Joi.object({
    sessionId: Joi.string().optional(),
    projectId: Joi.string().optional(),
    type: Joi.alternatives().try(
      Joi.string().valid('analysis', 'planning', 'execution', 'reflection', 'error', 'decision', 'exploration', 'validation'),
      Joi.array().items(Joi.string().valid('analysis', 'planning', 'execution', 'reflection', 'error', 'decision', 'exploration', 'validation'))
    ).optional(),
    minConfidence: Joi.number().min(0).max(1).optional(),
    dateRange: Joi.object({
      start: Joi.date().iso().required(),
      end: Joi.date().iso().required(),
    }).optional(),
    files: Joi.array().items(Joi.string()).optional(),
    hasErrors: Joi.boolean().optional(),
  }).optional(),
  options: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    semanticSearch: Joi.boolean().default(true),
    includeContext: Joi.boolean().default(true),
    includeRelated: Joi.boolean().default(false),
    scoreThreshold: Joi.number().min(0).max(1).default(0.5),
  }).default({}),
});

export const analyzeReasoningSchema = Joi.object({
  options: Joi.object({
    includePatterns: Joi.boolean().default(true),
    includeMetrics: Joi.boolean().default(true),
    includeInsights: Joi.boolean().default(true),
    timeframe: Joi.string().valid('session', 'last24h', 'last7d', 'last30d').default('session'),
  }).default({}),
});