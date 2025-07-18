import { Router, Request, Response } from 'express';
import { codebaseIndexerService } from '../../services/codebase-indexer/codebase-indexer.service';
import { asyncHandler } from '../../middleware/async-handler';
import { CODEBASE_INDEXER_API_DOCS } from './api-docs';

export const codebaseIndexerRouter = Router();

/**
 * Get API documentation
 */
codebaseIndexerRouter.get('/api-docs', (_req: Request, res: Response) => {
  res.json(CODEBASE_INDEXER_API_DOCS);
});

/**
 * Explain the Codebase Indexer service
 */
codebaseIndexerRouter.get('/explain', (_req: Request, res: Response) => {
  res.json({
    service: "Codebase Indexer",
    version: "1.0.0",
    description: "The Codebase Indexer service provides AI-powered code search and understanding capabilities through vector embeddings",
    capabilities: [
      {
        name: "Code Indexing",
        description: "Index local codebases and Git repositories with intelligent chunking",
        features: [
          "Support for 40+ programming languages",
          "Intelligent code chunking with overlap",
          "Incremental indexing for large codebases",
          "Project-based isolation",
          "Async job management"
        ]
      },
      {
        name: "Vector Search",
        description: "Semantic code search using OpenAI embeddings",
        features: [
          "Natural language queries",
          "Code similarity search",
          "Context-aware results",
          "Language-specific filtering",
          "Score-based ranking"
        ]
      },
      {
        name: "Code Understanding",
        description: "Extract meaning and relationships from code",
        features: [
          "Function and class detection",
          "Import statement analysis",
          "Code structure preservation",
          "Cross-file relationship mapping"
        ]
      },
      {
        name: "Repository Management",
        description: "Manage indexed repositories and their metadata",
        features: [
          "Multi-repository support",
          "Branch-specific indexing",
          "File pattern filtering",
          "Indexing statistics",
          "Cleanup and maintenance"
        ]
      }
    ],
    useCases: [
      {
        title: "Code Discovery",
        description: "Find relevant code snippets using natural language",
        example: "POST /api/codebase-indexer/search { query: 'authentication middleware' }"
      },
      {
        title: "Code Reuse",
        description: "Find similar implementations across your codebase",
        example: "POST /api/codebase-indexer/similar { codeSnippet: 'function validateUser...' }"
      },
      {
        title: "Documentation Generation",
        description: "Index code for AI-powered documentation",
        example: "POST /api/codebase-indexer/index { repositoryName: 'my-project' }"
      },
      {
        title: "Code Review Assistance",
        description: "Find related code for better context during reviews",
        example: "GET /api/codebase-indexer/context?file=src/auth.ts"
      },
      {
        title: "Knowledge Management",
        description: "Build a searchable knowledge base of your code",
        example: "GET /api/codebase-indexer/stats"
      }
    ],
    supportedLanguages: [
      "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust",
      "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "Dart", "Lua"
    ],
    quickStart: {
      step1: "Start indexing: POST /api/codebase-indexer/index",
      step2: "Check status: GET /api/codebase-indexer/jobs/{jobId}",
      step3: "Search code: POST /api/codebase-indexer/search",
      step4: "View stats: GET /api/codebase-indexer/stats"
    },
    configuration: {
      embeddingModel: "text-embedding-3-large",
      vectorDimensions: 3072,
      defaultChunkSize: 1500,
      defaultChunkOverlap: 200
    },
    apiDocumentation: "/api/codebase-indexer/api-docs"
  });
});

/**
 * Start indexing a repository
 */
codebaseIndexerRouter.post('/index', asyncHandler(async (req: Request, res: Response) => {
  const { repositoryId, projectId, repositoryName, branch, filePath, options } = req.body;

  if (!projectId || !repositoryName) {
    res.status(400).json({ error: 'projectId and repositoryName are required' });
    return;
  }

  const result = await codebaseIndexerService.startIndexingJob({
    projectId,
    repositoryId,
    repositoryName,
    branch,
    filePath,
    options
  });

  res.json({
    success: true,
    ...result,
    message: 'Indexing job has been queued'
  });
}));

/**
 * Get indexing job status
 */
codebaseIndexerRouter.get('/jobs/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  const job = await codebaseIndexerService.getJobStatus(jobId);
  
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
}));

/**
 * Cancel an indexing job
 */
codebaseIndexerRouter.post('/jobs/:jobId/cancel', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  const cancelled = await codebaseIndexerService.cancelJob(jobId);
  
  if (!cancelled) {
    res.status(404).json({ error: 'Job not found or already completed' });
    return;
  }

  res.json({
    success: true,
    message: 'Job cancelled successfully'
  });
}));

/**
 * Search indexed code
 */
codebaseIndexerRouter.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const { query, projectId, filters, options } = req.body;

  if (!query || !projectId) {
    res.status(400).json({ error: 'query and projectId are required' });
    return;
  }

  const results = await codebaseIndexerService.searchCode({
    query,
    projectId,
    filters,
    options
  });

  res.json({
    query,
    results,
    total: results.length
  });
}));

/**
 * Get similar code snippets
 */
codebaseIndexerRouter.post('/similar', asyncHandler(async (req: Request, res: Response) => {
  const { projectId, codeSnippet, limit = 5, excludeFile, minScore = 0.8 } = req.body;

  if (!projectId || !codeSnippet) {
    res.status(400).json({ error: 'projectId and codeSnippet are required' });
    return;
  }

  const results = await codebaseIndexerService.getSimilarCode(
    projectId,
    codeSnippet,
    { limit, excludeFile, minScore }
  );

  res.json({
    results,
    total: results.length
  });
}));

/**
 * Get indexed repositories
 */
codebaseIndexerRouter.get('/repositories', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'projectId is required' });
    return;
  }

  const repositories = await codebaseIndexerService.getIndexedRepositories(projectId as string);
  res.json(repositories);
}));

/**
 * Get indexing statistics
 */
codebaseIndexerRouter.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'projectId is required' });
    return;
  }

  const stats = await codebaseIndexerService.getIndexingStats(projectId as string);
  res.json(stats);
}));

/**
 * Delete repository embeddings
 */
codebaseIndexerRouter.delete('/repositories/:repositoryName', asyncHandler(async (req: Request, res: Response) => {
  const { repositoryName } = req.params;
  const { projectId } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'projectId is required' });
    return;
  }

  const deletedCount = await codebaseIndexerService.deleteRepositoryEmbeddings(
    projectId as string,
    repositoryName
  );

  res.json({
    success: true,
    deletedCount,
    message: `Deleted ${deletedCount} embeddings for repository ${repositoryName}`
  });
}));

/**
 * Health check for the indexer service
 */
codebaseIndexerRouter.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  // Ensure vector search index exists
  await codebaseIndexerService.ensureVectorSearchIndex();

  res.json({
    status: 'healthy',
    service: 'codebase-indexer',
    vectorIndex: 'configured',
    embeddingModel: 'text-embedding-3-large'
  });
}));