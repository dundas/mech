import { ObjectId } from 'mongodb';

export type ReasoningType = 
  | 'analysis'      // Understanding the problem
  | 'planning'      // Formulating approach
  | 'execution'     // Implementing solution
  | 'reflection'    // Evaluating results
  | 'error'         // Error analysis
  | 'decision'      // Making choices
  | 'exploration'   // Exploring options
  | 'validation';   // Verifying correctness

export interface ICodeBlock {
  language: string;
  content: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  purpose?: string;
}

export interface IReasoningContent {
  raw: string;
  summary: string;
  confidence: number; // 0-1 scale
  keywords: string[];
  entities: {
    files: string[];
    functions: string[];
    variables: string[];
    concepts: string[];
  };
}

export interface IReasoningContext {
  precedingSteps: ObjectId[];
  toolsUsed: string[];
  filesReferenced: string[];
  filesModified: string[];
  codeBlocks: ICodeBlock[];
  errors: {
    message: string;
    type: string;
    resolved: boolean;
  }[];
  decisions: {
    question: string;
    choice: string;
    alternatives: string[];
    rationale: string;
  }[];
}

export interface IReasoningEmbedding {
  vector: number[];
  model: string;
  dimensions: number;
  version: string;
}

export interface IReasoningMetadata {
  timestamp: Date;
  duration: number; // milliseconds
  tokenCount: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface IReasoningStep {
  _id?: ObjectId;
  sessionId: string;
  projectId: string;
  stepNumber: number;
  parentStep?: ObjectId; // For branching reasoning
  
  type: ReasoningType;
  content: IReasoningContent;
  context: IReasoningContext;
  
  embeddings?: IReasoningEmbedding;
  
  metadata: IReasoningMetadata;
  
  // Relationships
  relatedSteps: {
    stepId: ObjectId;
    relationship: 'continues' | 'contradicts' | 'refines' | 'implements';
  }[];
  
  // Quality metrics
  quality: {
    clarity: number;        // 0-1: How clear is the reasoning
    completeness: number;   // 0-1: How complete is the analysis
    correctness?: number;   // 0-1: Verified correctness (if applicable)
    usefulness: number;     // 0-1: How useful for achieving goal
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IReasoningChain {
  _id?: ObjectId;
  sessionId: string;
  projectId: string;
  
  chainId: string;
  title: string;
  description?: string;
  
  steps: ObjectId[];
  startStep: ObjectId;
  endStep?: ObjectId;
  
  summary: {
    totalSteps: number;
    typeDistribution: Record<ReasoningType, number>;
    averageConfidence: number;
    filesAnalyzed: string[];
    filesModified: string[];
    decisionsMade: number;
    errorsEncountered: number;
    successRate: number;
  };
  
  metadata: {
    goal?: string;
    outcome?: 'success' | 'partial' | 'failure' | 'abandoned';
    tags: string[];
    annotations?: Record<string, any>;
  };
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface IReasoningAnalysis {
  sessionId: string;
  
  patterns: {
    commonApproaches: string[];
    recurringIssues: string[];
    successPatterns: string[];
    improvementAreas: string[];
  };
  
  metrics: {
    averageStepsPerTask: number;
    confidenceTrend: number[]; // Confidence over time
    errorRate: number;
    toolUsageDistribution: Record<string, number>;
    reasoningTypeDistribution: Record<ReasoningType, number>;
  };
  
  insights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  
  generatedAt: Date;
}

export interface IReasoningQuery {
  sessionId?: string;
  projectId?: string;
  type?: ReasoningType | ReasoningType[];
  minConfidence?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  keywords?: string[];
  files?: string[];
  hasErrors?: boolean;
  limit?: number;
  offset?: number;
}

export interface IReasoningSearchOptions {
  query: string;
  filters?: IReasoningQuery;
  semanticSearch?: boolean;
  includeContext?: boolean;
  includeRelated?: boolean;
  scoreThreshold?: number;
}