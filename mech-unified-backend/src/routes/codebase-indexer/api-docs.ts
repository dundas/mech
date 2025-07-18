/**
 * Codebase Indexer API Documentation
 */

export const CODEBASE_INDEXER_API_DOCS = {
  service: "Codebase Indexer",
  version: "1.0.0",
  description: "AI-powered code indexing and search service using vector embeddings for semantic code discovery",
  baseUrl: "/api/codebase-indexer",
  
  endpoints: [
    {
      method: "GET",
      path: "/health",
      description: "Health check for the indexer service",
      authentication: "Optional",
      response: {
        example: {
          status: "healthy",
          service: "codebase-indexer",
          vectorIndex: "configured",
          embeddingModel: "text-embedding-3-large"
        }
      }
    },
    
    {
      method: "POST",
      path: "/index",
      description: "Start indexing a repository or codebase",
      authentication: "Required",
      requestBody: {
        type: "object",
        properties: {
          projectId: { type: "string", required: true, description: "Project identifier" },
          repositoryId: { type: "string", required: false, description: "Repository ID from database" },
          repositoryName: { type: "string", required: true, description: "Repository name" },
          branch: { type: "string", default: "main", description: "Branch to index" },
          filePath: { type: "string", required: false, description: "Specific path to index" },
          options: {
            type: "object",
            properties: {
              incremental: { type: "boolean", default: false, description: "Only index changed files" },
              maxFiles: { type: "number", default: 1000, description: "Maximum files to index" },
              filePatterns: { type: "array", description: "File patterns to include" },
              excludePatterns: { type: "array", description: "File patterns to exclude" },
              chunkSize: { type: "number", default: 1500, description: "Token size for chunks" },
              chunkOverlap: { type: "number", default: 200, description: "Overlap between chunks" }
            }
          }
        },
        example: {
          projectId: "proj_123",
          repositoryName: "my-app",
          branch: "main",
          options: {
            incremental: true,
            filePatterns: ["src/**/*.ts", "src/**/*.tsx"]
          }
        }
      },
      response: {
        example: {
          success: true,
          jobId: "idx_abc123",
          status: "started",
          message: "Indexing job has been queued"
        }
      }
    },
    
    {
      method: "GET",
      path: "/jobs/:jobId",
      description: "Get indexing job status and progress",
      authentication: "Required",
      parameters: [
        { name: "jobId", type: "string", required: true, description: "Job identifier" }
      ],
      response: {
        example: {
          jobId: "idx_abc123",
          projectId: "proj_123",
          repositoryName: "my-app",
          status: "in_progress",
          progress: {
            totalFiles: 150,
            processedFiles: 75,
            totalChunks: 450,
            processedChunks: 225,
            currentFile: "src/components/Header.tsx"
          },
          stats: {
            filesIndexed: 75,
            chunksCreated: 225,
            tokensProcessed: 337500
          },
          timestamps: {
            created: "2024-01-15T10:00:00Z",
            started: "2024-01-15T10:00:05Z"
          }
        }
      }
    },
    
    {
      method: "POST",
      path: "/jobs/:jobId/cancel",
      description: "Cancel an active indexing job",
      authentication: "Required",
      parameters: [
        { name: "jobId", type: "string", required: true, description: "Job identifier" }
      ],
      response: {
        example: {
          success: true,
          message: "Job cancelled successfully"
        }
      }
    },
    
    {
      method: "POST",
      path: "/search",
      description: "Search indexed code using natural language",
      authentication: "Required",
      requestBody: {
        type: "object",
        properties: {
          query: { type: "string", required: true, description: "Search query" },
          projectId: { type: "string", required: true, description: "Project identifier" },
          filters: {
            type: "object",
            properties: {
              repositoryName: { type: "string", description: "Filter by repository" },
              language: { type: "string", description: "Filter by programming language" },
              filePath: { type: "string", description: "Filter by file path pattern" },
              dateRange: {
                type: "object",
                properties: {
                  start: { type: "string", format: "date-time" },
                  end: { type: "string", format: "date-time" }
                }
              }
            }
          },
          options: {
            type: "object",
            properties: {
              limit: { type: "number", default: 10, description: "Maximum results" },
              scoreThreshold: { type: "number", default: 0.7, description: "Minimum similarity score" },
              includeContent: { type: "boolean", default: true },
              includeMetadata: { type: "boolean", default: true }
            }
          }
        },
        example: {
          query: "authentication middleware Express",
          projectId: "proj_123",
          filters: {
            language: "typescript",
            repositoryName: "my-app"
          },
          options: {
            limit: 20,
            scoreThreshold: 0.8
          }
        }
      },
      response: {
        example: {
          query: "authentication middleware Express",
          results: [
            {
              _id: "65a1b2c3d4e5f6g7",
              content: "export const authMiddleware = (req, res, next) => {\\n  const token = req.headers.authorization;\\n  // ...",
              score: 0.92,
              metadata: {
                filePath: "src/middleware/auth.ts",
                repositoryName: "my-app",
                language: "typescript",
                startLine: 15,
                endLine: 45
              }
            }
          ],
          total: 3
        }
      }
    },
    
    {
      method: "POST",
      path: "/similar",
      description: "Find similar code snippets",
      authentication: "Required",
      requestBody: {
        type: "object",
        properties: {
          projectId: { type: "string", required: true, description: "Project identifier" },
          codeSnippet: { type: "string", required: true, description: "Code to find similar matches for" },
          limit: { type: "number", default: 5, description: "Maximum results" },
          excludeFile: { type: "string", description: "File path to exclude from results" },
          minScore: { type: "number", default: 0.8, description: "Minimum similarity score" }
        },
        example: {
          projectId: "proj_123",
          codeSnippet: "const validateEmail = (email) => {\\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);\\n}",
          limit: 5,
          excludeFile: "src/utils/validation.ts"
        }
      },
      response: {
        example: {
          results: [
            {
              _id: "65a1b2c3d4e5f6g8",
              content: "function isValidEmail(email) {\\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\\n  return emailRegex.test(email);\\n}",
              score: 0.95,
              metadata: {
                filePath: "src/helpers/validators.js",
                repositoryName: "my-app",
                language: "javascript"
              }
            }
          ],
          total: 2
        }
      }
    },
    
    {
      method: "GET",
      path: "/repositories",
      description: "Get list of indexed repositories",
      authentication: "Required",
      queryParams: [
        { name: "projectId", type: "string", required: true, description: "Project identifier" }
      ],
      response: {
        example: {
          repositories: [
            {
              name: "my-app",
              fileCount: 150,
              lastIndexed: "2024-01-15T10:30:00Z"
            },
            {
              name: "api-service",
              fileCount: 89,
              lastIndexed: "2024-01-14T15:20:00Z"
            }
          ]
        }
      }
    },
    
    {
      method: "GET",
      path: "/stats",
      description: "Get indexing statistics for a project",
      authentication: "Required",
      queryParams: [
        { name: "projectId", type: "string", required: true, description: "Project identifier" }
      ],
      response: {
        example: {
          totalFiles: 239,
          totalChunks: 1847,
          totalRepositories: 2,
          languageBreakdown: {
            "typescript": 145,
            "javascript": 52,
            "json": 28,
            "markdown": 14
          },
          lastIndexedAt: "2024-01-15T10:30:00Z"
        }
      }
    },
    
    {
      method: "DELETE",
      path: "/repositories/:repositoryName",
      description: "Delete all embeddings for a repository",
      authentication: "Required",
      parameters: [
        { name: "repositoryName", type: "string", required: true, description: "Repository name" }
      ],
      queryParams: [
        { name: "projectId", type: "string", required: true, description: "Project identifier" }
      ],
      response: {
        example: {
          success: true,
          deletedCount: 450,
          message: "Deleted 450 embeddings for repository my-app"
        }
      }
    },
    
    {
      method: "GET",
      path: "/explain",
      description: "Get detailed explanation of the Codebase Indexer service",
      authentication: "Optional",
      response: {
        example: {
          service: "Codebase Indexer",
          version: "1.0.0",
          description: "The Codebase Indexer service provides AI-powered code search...",
          capabilities: ["..."],
          useCases: ["..."]
        }
      }
    }
  ],
  
  errorResponses: [
    {
      code: 400,
      description: "Bad Request - Missing required parameters",
      example: { error: "projectId and repositoryName are required" }
    },
    {
      code: 401,
      description: "Unauthorized - Authentication required",
      example: { error: "Authentication required" }
    },
    {
      code: 404,
      description: "Not Found - Resource not found",
      example: { error: "Job not found" }
    },
    {
      code: 429,
      description: "Too Many Requests - Rate limit exceeded",
      example: { error: "Rate limit exceeded. Please try again later." }
    },
    {
      code: 500,
      description: "Internal Server Error",
      example: { error: "Failed to generate embeddings", details: "OpenAI API error" }
    }
  ],
  
  configuration: {
    embeddingModel: {
      name: "text-embedding-3-large",
      dimensions: 3072,
      maxTokens: 8191
    },
    chunking: {
      defaultSize: 1500,
      defaultOverlap: 200,
      minSize: 100,
      maxSize: 3000
    },
    limits: {
      maxFilesPerJob: 1000,
      maxSearchResults: 100,
      maxConcurrentJobs: 5
    }
  },
  
  supportedFileTypes: [
    ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".h", ".cs",
    ".rb", ".go", ".rs", ".swift", ".kt", ".scala", ".php", ".r", ".lua",
    ".html", ".css", ".scss", ".json", ".yaml", ".yml", ".md", ".mdx",
    ".sh", ".bash", ".sql", ".graphql", "Dockerfile", "Makefile"
  ]
};