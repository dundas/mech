# MCP Service Rewrite Plan

**Date**: May 27, 2025  
**Current State**: Non-compliant, monolithic implementation  
**Goal**: Standards-compliant MCP service using official SDK

## 🔍 Current Problems

### 1. Protocol Non-Compliance
- Custom JSON-RPC implementation instead of MCP protocol
- Missing initialization handshake
- No capability negotiation
- Incorrect message formats

### 2. Architectural Issues
- Monolithic service trying to do everything
- Poor separation of concerns
- SSE broadcasting to all clients
- No proper client isolation

### 3. Code Quality
- Code duplication
- No error boundaries
- Poor logging
- No tests
- Hardcoded dependencies

## 🎯 Rewrite Goals

1. **Use Official MCP SDK**
   - Proper protocol compliance
   - Standard message formats
   - Built-in transport handling

2. **Modular Architecture**
   - Separate MCP servers for each tool
   - Shared utilities
   - Clean interfaces

3. **Production Ready**
   - Error handling
   - Structured logging
   - Environment configuration
   - Tests

## 📐 New Architecture

```
mech-ai/
├── mcp-servers/                    # New directory for MCP servers
│   ├── shared/                     # Shared utilities
│   │   ├── auth.ts                # Authentication helpers
│   │   ├── logging.ts             # Structured logging
│   │   └── config.ts              # Configuration management
│   │
│   ├── code-search/               # Code search MCP server
│   │   ├── src/
│   │   │   ├── index.ts          # MCP server entry
│   │   │   ├── tools.ts          # Tool implementations
│   │   │   └── client.ts         # Indexer client
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── perplexity/                # Perplexity MCP server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── tools.ts
│   │   │   └── client.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── file-system/               # File system MCP server (NEW)
│       ├── src/
│       │   ├── index.ts
│       │   ├── tools/
│       │   │   ├── read-file.ts
│       │   │   ├── write-file.ts
│       │   │   └── list-files.ts
│       │   └── security.ts        # Path validation
│       ├── package.json
│       └── tsconfig.json
```

## 🛠️ Implementation Plan

### Phase 1: Setup Infrastructure (Day 1)
```typescript
// 1. Install official MCP SDK
npm install @modelcontextprotocol/sdk

// 2. Create base MCP server template
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'mech-code-search',
  version: '1.0.0',
});

// 3. Setup proper tool registration
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'search_code',
      description: 'Search code in indexed repositories',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          projectId: { type: 'string' },
          limit: { type: 'number', default: 10 }
        },
        required: ['query', 'projectId']
      }
    }
  ]
}));
```

### Phase 2: Migrate Code Search (Day 2)
1. Create proper MCP server structure
2. Implement tool handlers
3. Add authentication
4. Test with MCP client

### Phase 3: Migrate Perplexity (Day 3)
1. Create Perplexity MCP server
2. Handle API key securely
3. Implement proper error handling
4. Add citation formatting

### Phase 4: Add File System Server (Day 4-5)
1. Create new file system MCP server
2. Implement security boundaries
3. Add approval flow hooks
4. Test all file operations

### Phase 5: Integration & Testing (Day 6-7)
1. Create MCP hub to manage servers
2. Add service discovery
3. Write comprehensive tests
4. Document usage

## 📝 Code Examples

### Proper MCP Tool Implementation
```typescript
// mcp-servers/code-search/src/tools.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const searchCodeTool: Tool = {
  name: 'search_code',
  description: 'Search code across indexed repositories',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      projectId: {
        type: 'string',
        description: 'Project ID to search within'
      },
      limit: {
        type: 'number',
        description: 'Maximum results',
        default: 10,
        minimum: 1,
        maximum: 50
      }
    },
    required: ['query', 'projectId']
  }
};

export async function handleSearchCode(params: any) {
  const { query, projectId, limit = 10 } = params;
  
  try {
    // Call indexer service
    const response = await indexerClient.search({
      query,
      projectId,
      limit
    });
    
    return {
      content: [
        {
          type: 'text',
          text: formatSearchResults(response.results)
        }
      ]
    };
  } catch (error) {
    logger.error('Code search failed', { error, params });
    throw new Error(`Search failed: ${error.message}`);
  }
}
```

### Proper Server Setup
```typescript
// mcp-servers/code-search/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { searchCodeTool, handleSearchCode } from './tools.js';

const server = new Server({
  name: 'mech-code-search',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
});

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [searchCodeTool]
}));

// Handle tool execution
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'search_code':
      return await handleSearchCode(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('Code Search Tool', () => {
  it('should search with valid parameters');
  it('should validate required fields');
  it('should respect limit boundaries');
  it('should handle service errors');
});
```

### Integration Tests
```typescript
describe('MCP Server Integration', () => {
  it('should list available tools');
  it('should execute search tool');
  it('should handle concurrent requests');
  it('should properly format responses');
});
```

## 📊 Success Metrics

1. **Protocol Compliance**: 100% MCP specification compliance
2. **Test Coverage**: >90% coverage
3. **Performance**: <100ms tool discovery, <2s tool execution
4. **Reliability**: Graceful error handling, no crashes
5. **Security**: Proper authentication and authorization

## 🚀 Benefits of Rewrite

1. **Standards Compliance**: Works with any MCP client
2. **Maintainability**: Clean, modular code
3. **Extensibility**: Easy to add new tools
4. **Reliability**: Proper error handling
5. **Security**: Built-in security patterns

## 📅 Timeline

- **Week 1**: Core infrastructure and code search
- **Week 2**: Perplexity and file system servers
- **Week 3**: Testing and documentation
- **Week 4**: Deployment and monitoring

## 🎯 Definition of Done

- [ ] All servers use official MCP SDK
- [ ] Comprehensive test coverage
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Successfully integrated with MECH AI
- [ ] Performance benchmarks met

---

*This rewrite will establish a solid foundation for MECH AI's tool ecosystem using industry standards.*