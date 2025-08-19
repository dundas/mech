# Mech Unified Backend Migration Plan

## Overview

This document outlines the step-by-step migration plan from the current microservices architecture to a unified backend system. The migration is designed to be incremental, non-disruptive, and reversible.

## Current Services Analysis

### Services to Migrate

#### 1. **mech-indexer** (Azure Container Instances)
- **Current**: `http://mech-indexer-8.eastus.azurecontainer.io:3000`
- **Complexity**: High (vector embeddings, MongoDB operations)
- **Dependencies**: OpenAI API, MongoDB, GitHub API
- **Migration Priority**: Phase 2 (after foundation)

#### 2. **mech-analyzer** (Local/Universal)
- **Current**: Local service with universal capabilities
- **Complexity**: Medium (database analysis, schema inference)
- **Dependencies**: MongoDB only
- **Migration Priority**: Phase 1 (foundational)

#### 3. **mcp-server-backend** (Cloudflare Workers)
- **Current**: Existing `worker.ts` with robust MCP implementation
- **Complexity**: Medium (already well-structured)
- **Dependencies**: Perplexity API, Browser Rendering
- **Migration Priority**: Phase 1 (reuse existing code)

#### 4. **code-search-service** (REST API)
- **Current**: Semantic search service
- **Complexity**: Low (simple REST wrapper)
- **Dependencies**: Shared with indexer
- **Migration Priority**: Phase 1 (quick win)

#### 5. **unified-mcp-service** (MCP Consolidation)
- **Current**: Multiple MCP implementations
- **Complexity**: Low (mostly routing)
- **Dependencies**: Other services
- **Migration Priority**: Phase 1 (consolidation target)

## Migration Strategy

### Phase 1: Foundation & Quick Wins (Week 1-2)
**Goal**: Establish unified backend foundation with low-risk services

#### Step 1.1: Create Unified Backend Structure
```bash
# Create new unified backend project
mkdir mech-unified-backend
cd mech-unified-backend
npm init -y

# Install dependencies
npm install express cors dotenv mongodb openai winston helmet compression express-rate-limit
npm install -D @types/express @types/cors @types/node typescript jest supertest
```

#### Step 1.2: Migrate MCP Server (Reuse Existing Code)
```typescript
// src/services/mcp/server.ts - Adapted from existing worker.ts
import { McpServer } from '../../../mcp-server-backend/src/worker';

export class UnifiedMcpServer extends McpServer {
  constructor(config: McpConfig) {
    super(config.name);
    this.setupExistingTools();
  }

  private setupExistingTools() {
    // Migrate existing tools from worker.ts
    this.tool({
      name: "webCrawler",
      description: "Crawl web pages",
      handler: async (params) => {
        // Existing implementation from worker.ts:192
      }
    });
    
    this.tool({
      name: "perplexitySearch", 
      description: "Search using Perplexity API",
      handler: async (params) => {
        // Existing implementation from worker.ts:336
      }
    });
  }
}
```

#### Step 1.3: Migrate Database Analyzer
```typescript
// src/services/analyzer/analyzer.ts - From existing mech-analyzer
import { DatabaseAnalyzer } from '../../../mech-analyzer/src/analyzer';

export class UnifiedAnalyzer extends DatabaseAnalyzer {
  constructor(db: any) {
    super(db);
  }

  // All existing methods remain the same
  // analyzeDatabase(), analyzeCollection(), etc.
}
```

#### Step 1.4: Create Basic Express App
```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { mcpRoutes } from './routes/mcp';
import { analyzerRoutes } from './routes/analyzer';
import { healthRoutes } from './routes/health';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Routes
app.use('/api/mcp', mcpRoutes);
app.use('/api/analyzer', analyzerRoutes);
app.use('/api/health', healthRoutes);

export default app;
```

#### Step 1.5: Deploy Alongside Existing Services
```bash
# Deploy unified backend to Azure Container Instances
az container create \
  --resource-group mech-unified-rg \
  --name mech-unified-backend \
  --image mechunified.azurecr.io/unified-backend:latest \
  --ports 3000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables MONGODB_URI=*** OPENAI_API_KEY=***
```

### Phase 2: Core Services Migration (Week 3-4)
**Goal**: Migrate indexer and search services with zero downtime

#### Step 2.1: Migrate Indexer Service
```typescript
// src/services/indexer/indexer.ts - From existing mech-indexer
import { IndexerService } from '../../../mech-indexer/src/indexers/IndexerService';
import { performVectorSearch } from '../../../mech-indexer/src/mongodb/vector-search';

export class UnifiedIndexer extends IndexerService {
  constructor(config: IndexerConfig) {
    super();
    this.config = config;
  }

  // Migrate existing methods:
  // - startIndexing()
  // - getIndexingStatus()
  // - performVectorSearch()
}
```

#### Step 2.2: Implement Blue-Green Deployment
```typescript
// src/routes/indexer/index.ts
import { Router } from 'express';
import { UnifiedIndexer } from '../../services/indexer/indexer';

const router = Router();
const indexer = new UnifiedIndexer(config);

// Existing endpoints from mech-indexer/api/server.ts:124
router.post('/index', async (req, res) => {
  // Exact same logic as existing mech-indexer
});

router.post('/search', async (req, res) => {
  // Exact same logic as existing mech-indexer
});

router.get('/status/:jobId', async (req, res) => {
  // Exact same logic as existing mech-indexer
});

export { router as indexerRoutes };
```

#### Step 2.3: Frontend Migration (Gradual)
```typescript
// mech-ai/frontend/lib/config/indexer.ts
export const INDEXER_CONFIG = {
  // Phase 2: Dual endpoints for testing
  LEGACY_URL: 'http://mech-indexer-8.eastus.azurecontainer.io:3000',
  UNIFIED_URL: 'http://mech-unified-backend.eastus.azurecontainer.io:3000',
  
  // Feature flag for gradual migration
  USE_UNIFIED: process.env.USE_UNIFIED_BACKEND === 'true',
  
  get BASE_URL() {
    return this.USE_UNIFIED ? this.UNIFIED_URL : this.LEGACY_URL;
  }
};
```

### Phase 3: Claude Code Integration (Week 5-6)
**Goal**: Add Claude Code hooks and reasoning storage

#### Step 3.1: Implement Claude Code Hooks
```typescript
// src/services/claude/hook-processor.ts
export class ClaudeHookProcessor {
  constructor(private db: any) {}

  async processHook(hookEvent: HookEvent): Promise<void> {
    // Store hook event
    await this.db.collection('hook_events').insertOne(hookEvent);
    
    // Process based on event type
    switch (hookEvent.eventType) {
      case 'PostToolUse':
        await this.handlePostToolUse(hookEvent);
        break;
      case 'Stop':
        await this.handleSessionEnd(hookEvent);
        break;
    }
  }

  private async handlePostToolUse(event: HookEvent): Promise<void> {
    // Trigger incremental indexing if files changed
    if (event.payload.files?.length > 0) {
      await this.triggerIncrementalIndexing(event.sessionId, event.payload.files);
    }
    
    // Store reasoning if available
    if (event.payload.reasoning) {
      await this.storeReasoning(event.sessionId, event.payload.reasoning);
    }
  }
}
```

#### Step 3.2: Create Next.js API Routes for Hooks
```typescript
// mech-ai/frontend/app/api/claude-hooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ClaudeHookProcessor } from '../../../lib/claude/hook-processor';

export async function POST(request: NextRequest) {
  try {
    const hookEvent = await request.json();
    
    // Validate hook signature
    const isValid = await validateHookSignature(request, hookEvent);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Process hook through unified backend
    await fetch(`${process.env.UNIFIED_BACKEND_URL}/api/claude/hooks/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hookEvent)
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hook processing error:', error);
    return NextResponse.json({ error: 'Hook processing failed' }, { status: 500 });
  }
}
```

#### Step 3.3: Implement Reasoning Storage
```typescript
// src/services/claude/reasoning.ts
export class ReasoningService {
  constructor(private db: any) {}

  async storeReasoning(sessionId: string, reasoning: any): Promise<void> {
    const reasoningLog: ReasoningLog = {
      sessionId,
      messageId: reasoning.messageId,
      step: reasoning.step,
      type: reasoning.type,
      content: reasoning.content,
      timestamp: new Date(),
      context: reasoning.context,
      metadata: reasoning.metadata || {}
    };

    await this.db.collection('reasoning_logs').insertOne(reasoningLog);
    
    // Update message with reasoning reference
    await this.db.collection('messages').updateOne(
      { _id: new ObjectId(reasoning.messageId) },
      {
        $push: {
          'claudeCodeSession.reasoningLogs': reasoningLog._id
        }
      }
    );
  }

  async searchReasoning(query: string, filters: any): Promise<ReasoningLog[]> {
    // Implement semantic search through reasoning logs
    const pipeline = [
      { $match: filters },
      { $search: {
        index: 'reasoning_search',
        text: { query, path: 'content' }
      }},
      { $sort: { score: { $meta: 'textScore' } } }
    ];

    return await this.db.collection('reasoning_logs').aggregate(pipeline).toArray();
  }
}
```

### Phase 4: Optimization & Cleanup (Week 7-8)
**Goal**: Optimize performance and decommission old services

#### Step 4.1: Performance Optimization
```typescript
// src/middleware/caching.ts
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

const cache = new Map<string, { data: any; timestamp: number }>();

export function cacheMiddleware(ttl: number = 300000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = createHash('md5').update(req.url + JSON.stringify(req.body)).digest('hex');
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return res.json(cached.data);
    }
    
    const originalSend = res.json;
    res.json = function(data: any) {
      cache.set(key, { data, timestamp: Date.now() });
      return originalSend.call(this, data);
    };
    
    next();
  };
}
```

#### Step 4.2: Monitoring & Logging
```typescript
// src/middleware/monitoring.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'unified-backend.log' })
  ]
});

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
}
```

#### Step 4.3: Decommission Old Services
```bash
# Step 1: Route 50% of traffic to unified backend
az container update \
  --resource-group mech-indexer-rg \
  --name mech-indexer-legacy \
  --cpu 0.5 \
  --memory 1.0

# Step 2: Monitor for 48 hours
# Check logs, performance metrics, error rates

# Step 3: Route 100% of traffic to unified backend
# Update frontend configuration
export USE_UNIFIED_BACKEND=true

# Step 4: Decommission legacy services
az container delete \
  --resource-group mech-indexer-rg \
  --name mech-indexer-legacy \
  --yes

az container delete \
  --resource-group decisive-trades-rg \
  --name mech-logger-legacy \
  --yes
```

## Testing Strategy

### Phase 1 Testing
```bash
# Unit tests for migrated services
npm test -- --testPathPattern="services/(mcp|analyzer)" --coverage

# Integration tests for basic endpoints
npm run test:integration -- --testPathPattern="routes/(mcp|analyzer|health)"

# Load testing against both old and new services
artillery run load-tests/phase1-comparison.yml
```

### Phase 2 Testing
```bash
# Performance comparison tests
npm run test:performance -- --compare-endpoints

# Data consistency tests
npm run test:data-consistency -- --check-indexing

# Dual-write verification
npm run test:dual-write -- --verify-sync
```

### Phase 3 Testing
```bash
# Claude Code hooks testing
npm run test:claude-hooks -- --test-all-events

# Reasoning storage tests
npm run test:reasoning -- --test-storage-retrieval

# End-to-end Claude Code integration
npm run test:e2e -- --test-full-claude-flow
```

## Rollback Strategy

### Immediate Rollback (< 1 hour)
```bash
# Revert frontend configuration
export USE_UNIFIED_BACKEND=false

# Scale down unified backend
az container update --name mech-unified-backend --cpu 0.1 --memory 0.5

# Scale up legacy services
az container update --name mech-indexer-legacy --cpu 2.0 --memory 4.0
```

### Data Recovery
```bash
# Backup before each phase
mongodump --uri="$MONGODB_URI" --out="backup-$(date +%Y%m%d)"

# Restore if needed
mongorestore --uri="$MONGODB_URI" backup-20241217/
```

## Migration Checklist

### Pre-Migration
- [ ] Backup all databases
- [ ] Document current service endpoints
- [ ] Set up monitoring and alerting
- [ ] Prepare rollback procedures
- [ ] Test unified backend in staging

### Phase 1 Checklist
- [ ] Deploy unified backend foundation
- [ ] Migrate MCP server functionality
- [ ] Migrate database analyzer
- [ ] Test basic endpoints
- [ ] Verify health checks

### Phase 2 Checklist
- [ ] Migrate indexer service
- [ ] Implement blue-green deployment
- [ ] Test dual-endpoint configuration
- [ ] Verify data consistency
- [ ] Monitor performance metrics

### Phase 3 Checklist
- [ ] Implement Claude Code hooks
- [ ] Create reasoning storage
- [ ] Test hook processing
- [ ] Verify reasoning search
- [ ] Test end-to-end integration

### Phase 4 Checklist
- [ ] Optimize performance
- [ ] Implement monitoring
- [ ] Decommission legacy services
- [ ] Clean up old resources
- [ ] Document new architecture

## Success Metrics

### Performance Metrics
- **Response Time**: < 200ms for search, < 500ms for indexing
- **Throughput**: Handle 100+ concurrent requests
- **Error Rate**: < 1% for all endpoints
- **Availability**: 99.9% uptime

### Operational Metrics
- **Deployment Time**: < 10 minutes (vs. 60+ minutes currently)
- **Service Count**: 1 service (vs. 6 currently)
- **Infrastructure Cost**: 50% reduction in Azure costs
- **Development Velocity**: 2x faster feature development

### Claude Code Integration Metrics
- **Hook Processing Time**: < 100ms average
- **Reasoning Storage**: 100% capture rate
- **Search Accuracy**: > 95% relevant results
- **Session Tracking**: 100% session continuity

This migration plan provides a structured, low-risk approach to consolidating the microservices while adding powerful Claude Code integration capabilities.