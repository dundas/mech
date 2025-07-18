import { ObjectId } from 'mongodb';

export interface IClaudeAgent {
  name: string;
  version: string;
  model: string;
  capabilities: string[];
}

export interface ISessionContext {
  workingDirectory: string;
  gitBranch: string;
  gitCommit: string;
  activeFiles: string[];
  modifiedFiles: string[];
  currentTool?: string;
  lastCommand?: string;
}

export interface ISessionStatistics {
  startTime: Date;
  lastActivity: Date;
  totalDuration: number;
  reasoningSteps: number;
  toolInvocations: number;
  filesModified: number;
  errorsEncountered: number;
  tokensUsed: number;
}

export interface ISessionMetadata {
  environment: {
    os: string;
    arch: string;
    nodeVersion: string;
    hostname: string;
    user: string;
  };
  configuration: Record<string, any>;
  tags: string[];
  tokens: {
    github: 'available' | 'missing' | 'invalid';
    mech: 'available' | 'missing' | 'invalid';
    openai: 'available' | 'missing' | 'invalid';
  };
}

export type SessionStatus = 'initializing' | 'active' | 'paused' | 'completed' | 'error' | 'abandoned';

export interface IClaudeSessionV2 {
  _id?: ObjectId;
  sessionId: string;
  projectId: string;
  userId?: string;
  threadId?: string;
  
  status: SessionStatus;
  
  agent: IClaudeAgent;
  context: ISessionContext;
  statistics: ISessionStatistics;
  
  checkpoints: ObjectId[];
  reasoningChain: ObjectId[];
  
  metadata: ISessionMetadata;
  
  error?: {
    message: string;
    stack?: string;
    timestamp: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionCheckpoint {
  _id?: ObjectId;
  sessionId: string;
  checkpointId: string;
  name: string;
  description?: string;
  
  state: {
    context: ISessionContext;
    statistics: ISessionStatistics;
    reasoningCount: number;
  };
  
  files: {
    path: string;
    content: string;
    hash: string;
  }[];
  
  metadata: {
    createdBy: 'user' | 'auto' | 'system';
    tags: string[];
    restoreCount: number;
  };
  
  createdAt: Date;
}

export interface ISessionUpdate {
  status?: SessionStatus;
  context?: Partial<ISessionContext>;
  statistics?: Partial<ISessionStatistics>;
  metadata?: Partial<ISessionMetadata>;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface ISessionQuery {
  projectId?: string;
  userId?: string;
  status?: SessionStatus | SessionStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'lastActivity' | 'duration';
  sortOrder?: 'asc' | 'desc';
}