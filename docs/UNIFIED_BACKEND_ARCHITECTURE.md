# Mech Unified Backend Architecture

## Overview

This document outlines the migration from the current microservices architecture to a unified backend system that consolidates all mech services while providing Claude Code hooks integration.

## Current Architecture vs. Unified Backend

### Current State (Microservices)
```
┌─────────────────────┐    ┌─────────────────────┐
│   Next.js Frontend  │    │   mech-indexer      │
│   (Port 5500)       │────│   (Azure ACI)       │
└─────────────────────┘    └─────────────────────┘
           │
           ├─────────────────────┬─────────────────────┐
           │                     │                     │
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   mech-logger       │ │   mech-analyzer     │ │   mcp-server-backend│
│   (Azure Container  │ │   (Local/Universal) │ │   (Cloudflare)      │
│   Apps)             │ │                     │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
           │                     │                     │
           └─────────────────────┼─────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │    MongoDB Atlas    │
                    │    (Shared DB)      │
                    └─────────────────────┘
```

### Proposed Unified Architecture
```
┌─────────────────────┐    ┌─────────────────────┐
│   Next.js Frontend  │    │   Unified Backend   │
│   + API Routes      │────│   (Express.js)      │
│   (BFF Pattern)     │    │                     │
│                     │    │  ┌─────────────────┤
│  /api/claude-hooks  │    │  │ /api/indexer    │
│  /api/reasoning     │    │  │ /api/analyzer   │
│  /api/health        │    │  │ /api/search     │
└─────────────────────┘    │  │ /api/mcp        │
                           │  │ /api/reasoning  │
                           │  │ /api/claude     │
                           │  └─────────────────┤
                           │                     │
                           │  Shared Services:   │
                           │  • MongoDB client   │
                           │  • Vector embeddings│
                           │  • Authentication   │
                           │  • Configuration    │
                           │  • MCP Protocol     │
                           └─────────────────────┘
                                        │
                           ┌─────────────────────┐
                           │    MongoDB Atlas    │
                           │    (Enhanced)       │
                           │                     │
                           │  New Collections:   │
                           │  • claude_sessions  │
                           │  • hook_events      │
                           │  • reasoning_logs   │
                           └─────────────────────┘
```

## Benefits of Unified Architecture

### 1. **Operational Benefits**
- **Single Deployment**: 1 container instead of 6 separate services
- **Unified Monitoring**: Single log stream and health endpoint
- **Simplified Configuration**: One environment config file
- **Reduced Infrastructure Costs**: Single Azure container vs. multiple services

### 2. **Development Benefits**
- **Faster Development**: Shared utilities and configurations
- **Easier Debugging**: All services in one codebase
- **Consistent Error Handling**: Unified error patterns
- **Shared Dependencies**: No version conflicts between services

### 3. **Claude Code Integration Benefits**
- **Real-time Hook Processing**: Direct function calls instead of HTTP
- **Unified Reasoning Storage**: Consistent data patterns
- **Seamless Service Integration**: No network latency between services
- **Centralized Authentication**: Single auth flow for all features

## Directory Structure

```
mech-unified-backend/
├── src/
│   ├── routes/
│   │   ├── indexer/
│   │   │   ├── index.ts           # Vector search endpoints
│   │   │   ├── indexing.ts        # Repository indexing
│   │   │   └── status.ts          # Indexing status
│   │   ├── analyzer/
│   │   │   ├── index.ts           # Database analysis endpoints
│   │   │   ├── schema.ts          # Schema analysis
│   │   │   └── statistics.ts      # Collection statistics
│   │   ├── search/
│   │   │   ├── index.ts           # Code search endpoints
│   │   │   ├── semantic.ts        # Semantic search
│   │   │   └── filters.ts         # Search filtering
│   │   ├── mcp/
│   │   │   ├── index.ts           # MCP protocol handler
│   │   │   ├── tools.ts           # MCP tools registry
│   │   │   └── server.ts          # MCP server implementation
│   │   ├── claude/
│   │   │   ├── hooks.ts           # Claude Code hooks
│   │   │   ├── reasoning.ts       # Reasoning storage
│   │   │   └── sessions.ts        # Session management
│   │   └── health/
│   │       ├── index.ts           # Health checks
│   │       └── metrics.ts         # Service metrics
│   ├── services/
│   │   ├── database/
│   │   │   ├── mongodb.ts         # MongoDB client
│   │   │   ├── operations.ts      # CRUD operations
│   │   │   └── vector-search.ts   # Vector search logic
│   │   ├── embeddings/
│   │   │   ├── pipeline.ts        # Embedding pipeline
│   │   │   ├── processor.ts       # Text processing
│   │   │   └── openai-client.ts   # OpenAI API client
│   │   ├── auth/
│   │   │   ├── middleware.ts      # Authentication middleware
│   │   │   ├── github.ts          # GitHub OAuth
│   │   │   └── tokens.ts          # Token management
│   │   ├── claude/
│   │   │   ├── hook-processor.ts  # Process Claude hooks
│   │   │   ├── reasoning.ts       # Reasoning analysis
│   │   │   └── session-manager.ts # Session tracking
│   │   └── mcp/
│   │       ├── server.ts          # MCP server (from existing)
│   │       ├── tools.ts           # Tool registry
│   │       └── protocol.ts        # MCP protocol handling
│   ├── shared/
│   │   ├── config/
│   │   │   ├── index.ts           # Configuration management
│   │   │   ├── database.ts        # Database configuration
│   │   │   └── services.ts        # Service configuration
│   │   ├── types/
│   │   │   ├── api.ts             # API type definitions
│   │   │   ├── claude.ts          # Claude Code types
│   │   │   └── mcp.ts             # MCP types
│   │   ├── utils/
│   │   │   ├── logger.ts          # Logging utilities
│   │   │   ├── validation.ts      # Input validation
│   │   │   └── errors.ts          # Error handling
│   │   └── middleware/
│   │       ├── cors.ts            # CORS configuration
│   │       ├── rate-limit.ts      # Rate limiting
│   │       └── logging.ts         # Request logging
│   ├── app.ts                     # Express application setup
│   └── server.ts                  # Server entry point
├── tests/
│   ├── integration/
│   │   ├── indexer.test.ts        # Indexer integration tests
│   │   ├── analyzer.test.ts       # Analyzer integration tests
│   │   └── claude-hooks.test.ts   # Claude hooks tests
│   └── unit/
│       ├── services/              # Service unit tests
│       └── utils/                 # Utility unit tests
├── scripts/
│   ├── build.sh                   # Build script
│   ├── deploy.sh                  # Deployment script
│   └── migrate.sh                 # Migration script
├── docs/
│   ├── api/                       # API documentation
│   ├── deployment/                # Deployment guides
│   └── migration/                 # Migration guides
├── Dockerfile                     # Single container definition
├── docker-compose.yml             # Local development
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Project documentation
```

## API Endpoints

### Core Services

#### Indexer Service
```typescript
POST   /api/indexer/index          # Index repository
GET    /api/indexer/status/:jobId  # Get indexing status
POST   /api/indexer/search         # Vector search
DELETE /api/indexer/clear          # Clear index
```

#### Analyzer Service
```typescript
GET    /api/analyzer/overview      # Database overview
GET    /api/analyzer/schema/:collection  # Collection schema
GET    /api/analyzer/stats/:collection   # Collection statistics
POST   /api/analyzer/analyze       # Analyze database
```

#### Search Service
```typescript
POST   /api/search/semantic        # Semantic code search
POST   /api/search/text           # Text-based search
GET    /api/search/filters         # Available filters
POST   /api/search/hybrid          # Hybrid search
```

#### MCP Service
```typescript
GET    /api/mcp/sse                # SSE endpoint (existing)
POST   /api/mcp/tool              # Tool execution (existing)
GET    /api/mcp/tools             # List available tools
POST   /api/mcp/register          # Register new tool
```

### Claude Code Integration

#### Hook Processing
```typescript
POST   /api/claude/hooks/process   # Process Claude Code hooks
GET    /api/claude/hooks/status    # Hook processing status
POST   /api/claude/hooks/configure # Configure hook behavior
```

#### Reasoning Storage
```typescript
POST   /api/claude/reasoning/store # Store reasoning data
GET    /api/claude/reasoning/search # Search reasoning history
GET    /api/claude/reasoning/:sessionId # Get session reasoning
POST   /api/claude/reasoning/analyze # Analyze reasoning patterns
```

#### Session Management
```typescript
POST   /api/claude/sessions/create # Create new session
GET    /api/claude/sessions/:id    # Get session details
PUT    /api/claude/sessions/:id    # Update session
DELETE /api/claude/sessions/:id    # End session
```

### Health & Monitoring
```typescript
GET    /api/health                 # Overall health
GET    /api/health/services        # Service-specific health
GET    /api/metrics                # Service metrics
GET    /api/status                 # Service status
```

## Database Schema Extensions

### New Collections for Claude Code Integration

#### claude_sessions
```typescript
interface ClaudeSession {
  _id: ObjectId;
  sessionId: string;
  projectId: string;
  threadId?: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed';
  metadata: {
    version: string;
    model: string;
    configuration: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### hook_events
```typescript
interface HookEvent {
  _id: ObjectId;
  sessionId: string;
  eventType: 'PreToolUse' | 'PostToolUse' | 'Stop' | 'Notification';
  toolName: string;
  operation: string;
  timestamp: Date;
  payload: {
    files?: string[];
    parameters?: Record<string, any>;
    result?: any;
    error?: string;
  };
  metadata: Record<string, any>;
}
```

#### reasoning_logs
```typescript
interface ReasoningLog {
  _id: ObjectId;
  sessionId: string;
  messageId?: string;
  step: number;
  type: 'analysis' | 'decision' | 'planning' | 'execution';
  content: string;
  timestamp: Date;
  context: {
    files?: string[];
    codeReferences?: Array<{
      file: string;
      lines: { start: number; end: number };
    }>;
    relatedSteps?: number[];
  };
  metadata: Record<string, any>;
}
```

### Enhanced Existing Collections

#### Enhanced MessageRecord
```typescript
interface MessageRecord {
  // ... existing fields ...
  claudeCodeSession?: {
    sessionId: string;
    hookEvents: string[];        // References to hook_events
    reasoningLogs: string[];     // References to reasoning_logs
    codeChanges: Array<{
      file: string;
      changeType: 'create' | 'modify' | 'delete';
      beforeContent?: string;
      afterContent?: string;
      reasoning: string;
      timestamp: Date;
    }>;
    gitCommit?: string;
    branch?: string;
  };
}
```

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with async/await
- **Database**: MongoDB Atlas with Vector Search
- **Authentication**: JWT with GitHub OAuth
- **Monitoring**: Custom metrics + Azure Monitor

### Key Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "mongodb": "^6.0.0",
    "openai": "^4.20.0",
    "jsonwebtoken": "^9.0.0",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.0.0",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "supertest": "^6.3.0"
  }
}
```

## Configuration Management

### Environment Variables
```bash
# Database
MONGODB_URI=your_mongodb_uri_here
MONGODB_DB_NAME=mechDB

# OpenAI
OPENAI_API_KEY=your_openai_key_here

# GitHub
GITHUB_CLIENT_ID=***
GITHUB_CLIENT_SECRET=***

# Claude Code
CLAUDE_CODE_WEBHOOK_SECRET=***
CLAUDE_CODE_SESSION_TIMEOUT=3600000

# MCP
MCP_SERVER_NAME=mech-unified-backend
MCP_SERVER_VERSION=1.0.0

# Services
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Azure
AZURE_STORAGE_CONNECTION_STRING=***
AZURE_CONTAINER_NAME=mech-unified
```

### Configuration Schema
```typescript
interface Config {
  database: {
    uri: string;
    name: string;
    options: Record<string, any>;
  };
  services: {
    openai: {
      apiKey: string;
      baseUrl?: string;
    };
    github: {
      clientId: string;
      clientSecret: string;
    };
  };
  claude: {
    webhookSecret: string;
    sessionTimeout: number;
    maxReasoningSteps: number;
  };
  mcp: {
    serverName: string;
    version: string;
    tools: string[];
  };
  server: {
    port: number;
    env: string;
    logLevel: string;
  };
}
```

## Migration Strategy

This unified architecture provides a solid foundation for consolidating the existing microservices while adding robust Claude Code integration capabilities. The next document will detail the specific migration steps and timeline.