import Joi from 'joi';

export const processHookSchema = Joi.object({
  sessionId: Joi.string().required(),
  eventType: Joi.string()
    .valid('PreToolUse', 'PostToolUse', 'Stop', 'Notification', 'SubagentStop', 'SessionStart')
    .required(),
  toolName: Joi.string().required(),
  operation: Joi.string().required(),
  timestamp: Joi.string().isoDate().required(),
  agent: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().required(),
    model: Joi.string().required(),
  }).optional(),
  project: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    git: Joi.object({
      remote: Joi.string().required(),
      branch: Joi.string().required(),
      commit: Joi.string().required(),
    }).required(),
  }).optional(),
  environment: Joi.object({
    os: Joi.string().required(),
    arch: Joi.string().required(),
    node: Joi.string().required(),
    workingDir: Joi.string().required(),
    hostname: Joi.string().required(),
    user: Joi.string().required(),
  }).optional(),
  tokens: Joi.object({
    github: Joi.string().required(),
    mech: Joi.string().required(),
  }).optional(),
  payload: Joi.object({
    files: Joi.array().items(Joi.string()).optional(),
    parameters: Joi.object().optional(),
    result: Joi.any().optional(),
    error: Joi.string().optional(),
    reasoning: Joi.string().optional(),
    command: Joi.string().optional(),
    sessionStart: Joi.boolean().optional(),
    configuration: Joi.object().optional(),
  }).required(),
  metadata: Joi.object({
    projectId: Joi.string().required(),
    userId: Joi.string().optional(),
    gitCommit: Joi.string().optional(),
    branch: Joi.string().optional(),
    workingDirectory: Joi.string().optional(),
    startupTime: Joi.string().optional(),
  }).required(),
});

export const updateStateSchema = Joi.object({
  sessionId: Joi.string().required(),
  state: Joi.object({
    activeFiles: Joi.array().items(Joi.string()).optional(),
    currentTool: Joi.string().optional(),
    lastCommand: Joi.string().optional(),
    reasoningCount: Joi.number().optional(),
    errorCount: Joi.number().optional(),
    modifiedFiles: Joi.array().items(Joi.string()).optional(),
  }).required(),
});