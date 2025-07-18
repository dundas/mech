# Mech Unified Backend API Specification

## Overview

This document provides the complete API specification for the Mech Unified Backend, including all endpoints, request/response schemas, authentication, and error handling.

## Base Configuration

### Base URL
```
Production: https://mech-unified-backend.eastus.azurecontainer.io
Development: http://localhost:3000
```

### Authentication
Most endpoints require authentication via JWT tokens:
```http
Authorization: Bearer <jwt_token>
```

### Common Headers
```http
Content-Type: application/json
X-Project-ID: <project_id>
X-Session-ID: <session_id>
```

## API Endpoints

### Health & Status

#### GET /api/health
Health check endpoint for monitoring

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "mongodb": "connected",
    "openai": "connected",
    "github": "connected"
  },
  "version": "1.0.0"
}
```

#### GET /api/health/services
Detailed health check for all services

**Response:**
```json
{
  "mongodb": {
    "status": "connected",
    "responseTime": 45,
    "collections": 12,
    "lastCheck": "2024-01-15T10:30:00Z"
  },
  "openai": {
    "status": "connected",
    "responseTime": 120,
    "quotaUsed": 0.35,
    "lastCheck": "2024-01-15T10:30:00Z"
  },
  "github": {
    "status": "connected",
    "responseTime": 89,
    "rateLimitRemaining": 4950,
    "lastCheck": "2024-01-15T10:30:00Z"
  }
}
```

### Indexer Service

#### POST /api/indexer/index
Start indexing a repository

**Request:**
```json
{
  "repositoryId": "507f1f77bcf86cd799439011",
  "projectId": "507f1f77bcf86cd799439012",
  "branch": "main",
  "filePath": "src/",
  "options": {
    "summarize": true,
    "incremental": false,
    "maxFiles": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_1234567890",
  "status": "started",
  "message": "Indexing job has been queued",
  "repository": "mech-ai/frontend",
  "estimatedTime": 300,
  "startTime": "2024-01-15T10:30:00Z"
}
```

#### GET /api/indexer/status/:jobId
Get indexing job status

**Response:**
```json
{
  "jobId": "job_1234567890",
  "status": "in_progress",
  "progress": {
    "totalFiles": 150,
    "processedFiles": 75,
    "currentFile": "src/components/chat.tsx",
    "percentage": 50
  },
  "startTime": "2024-01-15T10:30:00Z",
  "estimatedCompletion": "2024-01-15T10:35:00Z",
  "logs": [
    {
      "level": "info",
      "message": "Processing file: src/components/chat.tsx",
      "timestamp": "2024-01-15T10:32:00Z"
    }
  ]
}
```

#### POST /api/indexer/search
Perform vector search on indexed code

**Request:**
```json
{
  "query": "user authentication flow",
  "filters": {
    "projectId": "507f1f77bcf86cd799439012",
    "repositoryName": "mech-ai",
    "language": "typescript",
    "filePath": "src/components/",
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-15T00:00:00Z"
    }
  },
  "options": {
    "limit": 10,
    "includeContent": true,
    "includeMetadata": true,
    "scoreThreshold": 0.7
  }
}
```

**Response:**
```json
{
  "query": "user authentication flow",
  "results": [
    {
      "filePath": "src/components/auth-form.tsx",
      "content": "const handleAuth = async (credentials) => {...}",
      "language": "typescript",
      "score": 0.95,
      "repository": "mech-ai",
      "summary": "Authentication form component with OAuth integration",
      "metadata": {
        "lines": { "start": 45, "end": 65 },
        "lastModified": "2024-01-14T15:30:00Z",
        "author": "developer@mech.ai"
      },
      "context": {
        "before": "import { useState } from 'react';",
        "after": "export default AuthForm;"
      }
    }
  ],
  "total": 1,
  "searchTime": 0.045,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### DELETE /api/indexer/clear
Clear index for a project or repository

**Request:**
```json
{
  "projectId": "507f1f77bcf86cd799439012",
  "repositoryId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Index cleared successfully",
  "deletedDocuments": 1247,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Analyzer Service

#### GET /api/analyzer/overview
Get database overview and statistics

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "collections": 12,
    "totalDocuments": 45672,
    "totalSize": "245.7 MB",
    "relationships": 18
  },
  "collections": [
    {
      "name": "messages",
      "count": 12453,
      "fields": 15,
      "relationships": 3,
      "averageSize": "2.3 KB"
    },
    {
      "name": "projects",
      "count": 23,
      "fields": 12,
      "relationships": 4,
      "averageSize": "1.8 KB"
    }
  ],
  "statistics": {
    "totalCollections": 12,
    "totalDocuments": 45672,
    "totalSize": 257456123,
    "averageDocumentSize": 5643
  }
}
```

#### GET /api/analyzer/schema/:collection
Get schema analysis for a specific collection

**Response:**
```json
{
  "collection": "messages",
  "schema": {
    "_id": {
      "type": "ObjectId",
      "nullable": false,
      "array": false,
      "examples": ["507f1f77bcf86cd799439011"]
    },
    "threadId": {
      "type": "ObjectId",
      "nullable": false,
      "array": false,
      "examples": ["507f1f77bcf86cd799439012"]
    },
    "content": {
      "type": "string",
      "nullable": false,
      "array": false,
      "examples": ["Hello, how can I help you?"]
    },
    "role": {
      "type": "string",
      "nullable": false,
      "array": false,
      "examples": ["user", "assistant", "system"]
    },
    "attachments": {
      "type": "array",
      "nullable": true,
      "array": true,
      "examples": [
        {
          "type": "file",
          "url": "https://example.com/file.pdf",
          "name": "document.pdf"
        }
      ]
    }
  },
  "indexes": [
    {
      "name": "_id_",
      "key": { "_id": 1 },
      "unique": true
    },
    {
      "name": "threadId_1",
      "key": { "threadId": 1 },
      "unique": false
    }
  ],
  "relationships": [
    {
      "field": "threadId",
      "type": "reference",
      "targetCollection": "threads",
      "sourceCollection": "messages"
    }
  ],
  "sampleDocument": {
    "_id": "507f1f77bcf86cd799439011",
    "threadId": "507f1f77bcf86cd799439012",
    "content": "Hello, how can I help you?",
    "role": "user",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/analyzer/stats/:collection
Get detailed statistics for a collection

**Response:**
```json
{
  "collection": "messages",
  "count": 12453,
  "size": "28.5 MB",
  "avgDocumentSize": "2.3 KB",
  "indexes": 3,
  "fieldStatistics": {
    "content": {
      "presence": "100.00%",
      "uniqueValues": 12453,
      "averageLength": 156,
      "topValues": [
        { "value": "Hello", "count": 23 },
        { "value": "Thanks", "count": 18 }
      ]
    },
    "role": {
      "presence": "100.00%",
      "uniqueValues": 3,
      "topValues": [
        { "value": "user", "count": 6234 },
        { "value": "assistant", "count": 5891 },
        { "value": "system", "count": 328 }
      ]
    }
  },
  "growthTrend": {
    "daily": 234,
    "weekly": 1638,
    "monthly": 7012
  }
}
```

#### POST /api/analyzer/analyze
Trigger full database analysis

**Request:**
```json
{
  "collections": ["messages", "threads", "projects"],
  "options": {
    "includeRelationships": true,
    "includeSamples": true,
    "sampleSize": 100
  }
}
```

**Response:**
```json
{
  "jobId": "analysis_1234567890",
  "status": "started",
  "message": "Database analysis has been queued",
  "estimatedTime": 120,
  "startTime": "2024-01-15T10:30:00Z"
}
```

### Database Analyzer Service

#### GET /api/db-analyzer/api-docs
Get comprehensive API documentation for the Database Analyzer service

**Response:**
```json
{
  "service": "Database Analyzer",
  "version": "1.0.0",
  "description": "Provides comprehensive database analysis, schema discovery, and optimization insights",
  "endpoints": [...],
  "errorResponses": [...],
  "authentication": {...}
}
```

#### GET /api/db-analyzer/explain
Get detailed explanation of the Database Analyzer service capabilities

**Response:**
```json
{
  "service": "Database Analyzer",
  "version": "1.0.0",
  "description": "The Database Analyzer service provides comprehensive tools...",
  "capabilities": [...],
  "useCases": [...],
  "quickStart": {...}
}
```

#### GET /api/db-analyzer/overview
Get database overview with statistics

**Response:**
```json
{
  "name": "mechDB",
  "collections": 12,
  "totalSize": 1048576,
  "totalDocuments": 5000,
  "version": "7.0.0",
  "uptime": 86400
}
```

#### GET /api/db-analyzer/collections/:name
Analyze a specific collection with detailed schema information

**Query Parameters:**
- `sampleSize` (number): Number of documents to sample (default: 100)
- `includeIndexes` (boolean): Include index information (default: true)
- `includeRelationships` (boolean): Include inferred relationships (default: true)

**Response:**
```json
{
  "name": "users",
  "fields": [
    {
      "name": "_id",
      "type": "ObjectId",
      "nullable": false,
      "indexed": true,
      "unique": true,
      "examples": ["507f1f77bcf86cd799439011"],
      "frequency": 100
    }
  ],
  "statistics": {
    "count": 1500,
    "size": 524288,
    "avgDocumentSize": 350,
    "indexCount": 3
  },
  "relationships": [...],
  "indexes": [...]
}
```

#### POST /api/db-analyzer/query
Execute a custom query on a collection

**Request:**
```json
{
  "collection": "users",
  "filter": { "status": "active" },
  "projection": { "email": 1, "name": 1 },
  "sort": { "createdAt": -1 },
  "limit": 20,
  "skip": 0
}
```

**Response:**
```json
{
  "collection": "users",
  "count": 2,
  "results": [...]
}
```

#### POST /api/db-analyzer/search
Global text search across multiple collections

**Request:**
```json
{
  "searchTerm": "authentication",
  "collections": ["users", "sessions"],
  "limit": 5
}
```

**Response:**
```json
{
  "searchTerm": "authentication",
  "totalResults": 8,
  "results": {
    "users": [...],
    "sessions": [...]
  }
}
```

### Codebase Indexer Service

#### GET /api/codebase-indexer/api-docs
Get comprehensive API documentation for the Codebase Indexer service

**Response:**
```json
{
  "service": "Codebase Indexer",
  "version": "1.0.0",
  "description": "AI-powered code indexing and search service",
  "endpoints": [...],
  "configuration": {...},
  "supportedFileTypes": [...]
}
```

#### GET /api/codebase-indexer/explain
Get detailed explanation of the Codebase Indexer capabilities

**Response:**
```json
{
  "service": "Codebase Indexer",
  "capabilities": [...],
  "useCases": [...],
  "supportedLanguages": [...],
  "quickStart": {...}
}
```

#### POST /api/codebase-indexer/index
Start indexing a repository or codebase

**Request:**
```json
{
  "projectId": "proj_123",
  "repositoryName": "my-app",
  "branch": "main",
  "options": {
    "incremental": true,
    "filePatterns": ["src/**/*.ts"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "idx_abc123",
  "status": "started",
  "message": "Indexing job has been queued"
}
```

#### POST /api/codebase-indexer/search
Search indexed code using natural language

**Request:**
```json
{
  "query": "authentication middleware Express",
  "projectId": "proj_123",
  "filters": {
    "language": "typescript",
    "repositoryName": "my-app"
  },
  "options": {
    "limit": 20,
    "scoreThreshold": 0.8
  }
}
```

**Response:**
```json
{
  "query": "authentication middleware Express",
  "results": [
    {
      "_id": "65a1b2c3d4e5f6g7",
      "content": "export const authMiddleware = ...",
      "score": 0.92,
      "metadata": {
        "filePath": "src/middleware/auth.ts",
        "repositoryName": "my-app",
        "language": "typescript",
        "startLine": 15,
        "endLine": 45
      }
    }
  ],
  "total": 3
}
```

#### GET /api/codebase-indexer/stats
Get indexing statistics for a project

**Query Parameters:**
- `projectId` (string, required): Project identifier

**Response:**
```json
{
  "totalFiles": 239,
  "totalChunks": 1847,
  "totalRepositories": 2,
  "languageBreakdown": {
    "typescript": 145,
    "javascript": 52,
    "json": 28,
    "markdown": 14
  },
  "lastIndexedAt": "2024-01-15T10:30:00Z"
}
```

### Search Service

#### POST /api/search/semantic
Perform semantic search across all indexed content

**Request:**
```json
{
  "query": "how to implement user authentication",
  "filters": {
    "projectId": "507f1f77bcf86cd799439012",
    "contentTypes": ["code", "documentation", "messages"],
    "languages": ["typescript", "javascript"],
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-15T00:00:00Z"
    }
  },
  "options": {
    "limit": 20,
    "includeSnippets": true,
    "groupByFile": false,
    "scoreThreshold": 0.5
  }
}
```

**Response:**
```json
{
  "query": "how to implement user authentication",
  "results": [
    {
      "type": "code",
      "filePath": "src/components/auth-form.tsx",
      "content": "Implementation of OAuth authentication flow",
      "snippet": "const handleAuth = async (credentials) => {...}",
      "score": 0.92,
      "metadata": {
        "repository": "mech-ai",
        "language": "typescript",
        "lines": { "start": 45, "end": 65 }
      }
    },
    {
      "type": "documentation",
      "filePath": "docs/authentication.md",
      "content": "Authentication setup guide",
      "snippet": "## Setting up Authentication\n\nTo implement authentication...",
      "score": 0.87,
      "metadata": {
        "repository": "mech-ai",
        "language": "markdown"
      }
    }
  ],
  "total": 2,
  "searchTime": 0.123,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /api/search/text
Perform text-based search

**Request:**
```json
{
  "query": "authentication jwt token",
  "filters": {
    "projectId": "507f1f77bcf86cd799439012",
    "exact": false,
    "caseSensitive": false
  },
  "options": {
    "limit": 10,
    "highlightMatches": true
  }
}
```

**Response:**
```json
{
  "query": "authentication jwt token",
  "results": [
    {
      "filePath": "src/lib/auth.ts",
      "content": "JWT token validation and authentication middleware",
      "matches": [
        {
          "text": "authentication",
          "position": { "start": 156, "end": 170 }
        },
        {
          "text": "jwt",
          "position": { "start": 245, "end": 248 }
        }
      ],
      "highlightedContent": "JWT <mark>token</mark> validation and <mark>authentication</mark> middleware"
    }
  ],
  "total": 1,
  "searchTime": 0.034
}
```

#### POST /api/search/hybrid
Perform hybrid search combining semantic and text search

**Request:**
```json
{
  "query": "user authentication implementation",
  "weights": {
    "semantic": 0.7,
    "text": 0.3
  },
  "filters": {
    "projectId": "507f1f77bcf86cd799439012"
  },
  "options": {
    "limit": 15,
    "includeScores": true
  }
}
```

**Response:**
```json
{
  "query": "user authentication implementation",
  "results": [
    {
      "filePath": "src/components/auth-form.tsx",
      "content": "Authentication form component",
      "scores": {
        "semantic": 0.92,
        "text": 0.78,
        "combined": 0.87
      },
      "source": "hybrid"
    }
  ],
  "total": 1,
  "searchTime": 0.167
}
```

### MCP Service

#### GET /api/mcp/sse
Server-Sent Events endpoint for MCP protocol

**Headers:**
```http
Accept: text/event-stream
Cache-Control: no-cache
```

**Response (SSE Stream):**
```
data: {"type":"connection","data":{"name":"mech-unified-backend","version":"1.0.0","capabilities":{"tools":[{"name":"webCrawler","description":"Crawl web pages"},{"name":"perplexitySearch","description":"Search using Perplexity API"}]}}}

data: {"type":"heartbeat","timestamp":"2024-01-15T10:30:00Z"}
```

#### POST /api/mcp/tool
Execute MCP tool

**Request:**
```json
{
  "tool": "webCrawler",
  "parameters": {
    "url": "https://example.com",
    "selector": "article",
    "includeMeta": true,
    "includeLinks": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "url": "https://example.com",
    "content": ["<article>...</article>"],
    "meta": {
      "title": "Example Page",
      "description": "An example web page"
    }
  },
  "executionTime": 0.456,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET /api/mcp/tools
List available MCP tools

**Response:**
```json
{
  "tools": [
    {
      "name": "webCrawler",
      "description": "Crawl web pages and extract content",
      "parameters": {
        "url": { "type": "string", "required": true },
        "selector": { "type": "string", "required": false },
        "includeMeta": { "type": "boolean", "required": false }
      }
    },
    {
      "name": "perplexitySearch",
      "description": "Search using Perplexity API",
      "parameters": {
        "query": { "type": "string", "required": true },
        "limit": { "type": "number", "required": false }
      }
    }
  ],
  "total": 2
}
```

### Claude Code Integration

#### POST /api/claude/hooks/process
Process Claude Code hook events

**Request:**
```json
{
  "sessionId": "claude_session_1234567890",
  "eventType": "PostToolUse",
  "toolName": "Edit",
  "operation": "file_modification",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "files": ["src/components/chat.tsx", "src/lib/utils.ts"],
    "parameters": {
      "filePath": "src/components/chat.tsx",
      "content": "Updated chat component"
    },
    "result": {
      "success": true,
      "linesChanged": 15
    },
    "reasoning": "Updated chat component to improve user experience"
  },
  "metadata": {
    "projectId": "507f1f77bcf86cd799439012",
    "userId": "user_1234567890",
    "gitCommit": "abc123def456",
    "branch": "feature/chat-improvements"
  }
}
```

**Response:**
```json
{
  "success": true,
  "hookId": "hook_1234567890",
  "message": "Hook processed successfully",
  "actions": [
    {
      "type": "indexing_triggered",
      "files": ["src/components/chat.tsx", "src/lib/utils.ts"],
      "jobId": "job_1234567890"
    },
    {
      "type": "reasoning_stored",
      "reasoningId": "reasoning_1234567890"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET /api/claude/hooks/status
Get hook processing status

**Response:**
```json
{
  "status": "active",
  "activeSessions": 3,
  "processedToday": 145,
  "averageProcessingTime": 0.089,
  "recentHooks": [
    {
      "sessionId": "claude_session_1234567890",
      "eventType": "PostToolUse",
      "toolName": "Edit",
      "timestamp": "2024-01-15T10:30:00Z",
      "status": "processed"
    }
  ]
}
```

#### POST /api/claude/reasoning/store
Store reasoning data

**Request:**
```json
{
  "sessionId": "claude_session_1234567890",
  "messageId": "507f1f77bcf86cd799439011",
  "reasoning": {
    "step": 1,
    "type": "analysis",
    "content": "Analyzing the user's request to implement authentication",
    "context": {
      "files": ["src/components/auth-form.tsx"],
      "codeReferences": [
        {
          "file": "src/components/auth-form.tsx",
          "lines": { "start": 10, "end": 25 }
        }
      ]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "reasoningId": "reasoning_1234567890",
  "stored": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET /api/claude/reasoning/search
Search reasoning history

**Request:**
```json
{
  "query": "authentication implementation",
  "filters": {
    "sessionId": "claude_session_1234567890",
    "type": "analysis",
    "dateRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-15T00:00:00Z"
    }
  },
  "options": {
    "limit": 10,
    "includeContext": true
  }
}
```

**Response:**
```json
{
  "query": "authentication implementation",
  "results": [
    {
      "reasoningId": "reasoning_1234567890",
      "sessionId": "claude_session_1234567890",
      "step": 1,
      "type": "analysis",
      "content": "Analyzing the user's request to implement authentication",
      "score": 0.94,
      "timestamp": "2024-01-15T10:30:00Z",
      "context": {
        "files": ["src/components/auth-form.tsx"],
        "codeReferences": [
          {
            "file": "src/components/auth-form.tsx",
            "lines": { "start": 10, "end": 25 }
          }
        ]
      }
    }
  ],
  "total": 1,
  "searchTime": 0.067
}
```

#### POST /api/claude/sessions/create
Create new Claude Code session

**Request:**
```json
{
  "projectId": "507f1f77bcf86cd799439012",
  "userId": "user_1234567890",
  "threadId": "507f1f77bcf86cd799439013",
  "configuration": {
    "model": "claude-3-opus",
    "maxTokens": 4096,
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "claude_session_1234567890",
  "status": "active",
  "expiresAt": "2024-01-15T11:30:00Z",
  "configuration": {
    "model": "claude-3-opus",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "query",
      "issue": "Query parameter is required"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_1234567890"
  }
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `409` - Conflict (resource already exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Authentication failed
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `RESOURCE_CONFLICT` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `EXTERNAL_SERVICE_ERROR` - External service unavailable
- `DATABASE_ERROR` - Database operation failed
- `PROCESSING_ERROR` - General processing error

## Rate Limiting

### Default Limits
- **Search endpoints**: 100 requests/minute
- **Indexing endpoints**: 10 requests/minute
- **Hook processing**: 1000 requests/minute
- **Health checks**: 1000 requests/minute

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705320600
```

## Webhooks

### Claude Code Hooks Configuration
```json
{
  "url": "https://mech-unified-backend.eastus.azurecontainer.io/api/claude/hooks/process",
  "secret": "your-webhook-secret",
  "events": ["PostToolUse", "Stop", "Notification"],
  "headers": {
    "X-Project-ID": "507f1f77bcf86cd799439012"
  }
}
```

This API specification provides a complete reference for integrating with the unified backend system.