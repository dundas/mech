/**
 * Codebase Indexer Models
 * TypeScript interfaces for code embeddings and indexing jobs
 */

import { ObjectId } from 'mongodb';

/**
 * Code embedding document structure
 */
export interface ICodeEmbedding {
  _id?: ObjectId;
  content: string;
  embedding: number[];
  metadata: {
    filePath: string;
    repositoryName: string;
    projectId: string;
    language?: string;
    startLine?: number;
    endLine?: number;
    functionName?: string;
    className?: string;
    importStatements?: string[];
  };
  chunkInfo: {
    chunkIndex: number;
    totalChunks: number;
    overlapWithPrevious?: number;
    overlapWithNext?: number;
  };
  timestamps: {
    indexed: Date;
    fileModified?: Date;
  };
  version: number;
}

/**
 * Indexing job status
 */
export enum IndexingJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Indexing job document structure
 */
export interface IIndexingJob {
  _id?: ObjectId;
  jobId: string;
  projectId: string;
  repositoryId?: string;
  repositoryName: string;
  branch?: string;
  filePath?: string;
  status: IndexingJobStatus;
  progress: {
    totalFiles: number;
    processedFiles: number;
    totalChunks: number;
    processedChunks: number;
    currentFile?: string;
  };
  options: {
    incremental: boolean;
    maxFiles?: number;
    filePatterns?: string[];
    excludePatterns?: string[];
    chunkSize?: number;
    chunkOverlap?: number;
  };
  stats: {
    filesIndexed: number;
    chunksCreated: number;
    tokensProcessed: number;
    embeddingsCost?: number;
    duration?: number;
  };
  error?: {
    message: string;
    stack?: string;
    failedFile?: string;
  };
  timestamps: {
    created: Date;
    started?: Date;
    completed?: Date;
    lastUpdate: Date;
  };
}

/**
 * Search query interface
 */
export interface ICodeSearchQuery {
  query: string;
  projectId: string;
  filters?: {
    repositoryName?: string;
    language?: string;
    filePath?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  options?: {
    limit?: number;
    scoreThreshold?: number;
    includeContent?: boolean;
    includeMetadata?: boolean;
  };
}

/**
 * Search result interface
 */
export interface ICodeSearchResult {
  _id: string;
  content: string;
  score: number;
  metadata: {
    filePath: string;
    repositoryName: string;
    language?: string;
    startLine?: number;
    endLine?: number;
  };
  highlights?: {
    content?: string[];
    filePath?: string;
  };
}

/**
 * Repository configuration for indexing
 */
export interface IRepositoryConfig {
  repositoryId: string;
  projectId: string;
  url?: string;
  branch?: string;
  localPath?: string;
  authentication?: {
    type: 'token' | 'ssh' | 'none';
    token?: string;
    sshKeyPath?: string;
  };
}

/**
 * Supported file types for indexing
 */
export const SUPPORTED_EXTENSIONS = [
  // Programming languages
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
  '.cs', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.m', '.mm',
  '.php', '.lua', '.dart', '.elm', '.clj', '.ex', '.exs',
  
  // Web
  '.html', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
  
  // Data & Config
  '.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.env', '.properties',
  
  // Documentation
  '.md', '.mdx', '.rst', '.txt', '.adoc',
  
  // Shell & Scripts
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  
  // Build files
  'Dockerfile', 'Makefile', 'CMakeLists.txt', '.gradle', '.maven',
  
  // Other
  '.sql', '.graphql', '.proto'
];

/**
 * Default chunking configuration
 */
export const DEFAULT_CHUNK_CONFIG = {
  chunkSize: 1500,
  chunkOverlap: 200,
  minChunkSize: 100,
  maxChunkSize: 3000
};