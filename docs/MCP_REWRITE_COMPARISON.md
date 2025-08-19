# MCP Service: Current vs Proposed

## 🚫 Current Implementation Problems

### 1. Non-Standard Protocol
```javascript
// CURRENT: Custom JSON-RPC
app.post('/rpc', async (req, res) => {
  const { method, params } = req.body;
  if (method === 'tools/list') {
    res.json({ tools: [...] });
  }
});

// SHOULD BE: MCP Protocol
server.setRequestHandler('tools/list', async () => ({
  tools: [...]
}));
```

### 2. SSE Broadcasting Issues
```javascript
// CURRENT: Broadcasts to ALL clients
sseClients.forEach(client => {
  client.write(`data: ${JSON.stringify(message)}\n\n`);
});

// SHOULD BE: Isolated client communication
transport.send(clientId, message);
```

### 3. No Proper Tool Schema
```javascript
// CURRENT: Loose tool definition
const tools = [
  {
    name: 'search_code',
    description: 'Search code',
    // No schema validation!
  }
];

// SHOULD BE: Typed schema with validation
const tool: Tool = {
  name: 'search_code',
  description: 'Search code in repositories',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      projectId: { type: 'string' }
    },
    required: ['query', 'projectId']
  }
};
```

### 4. Poor Error Handling
```javascript
// CURRENT: Errors crash the service
const result = await searchCode(params); // Throws uncaught error

// SHOULD BE: Graceful error handling
try {
  const result = await searchCode(params);
  return { content: [{ type: 'text', text: result }] };
} catch (error) {
  return { 
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true 
  };
}
```

### 5. No Authentication
```javascript
// CURRENT: No auth checks
app.post('/tools/execute', async (req, res) => {
  // Anyone can execute tools!
  const result = await executeTool(req.body);
  res.json(result);
});

// SHOULD BE: Proper authentication
server.setRequestHandler('tools/call', async (request, context) => {
  // MCP handles auth through transport layer
  if (!context.authenticated) {
    throw new Error('Unauthorized');
  }
  return await executeTool(request.params);
});
```

## ✅ Benefits of Rewrite

### 1. **Standards Compliance**
- Works with any MCP-compatible client
- Claude, VS Code, and other tools can connect directly
- No custom client code needed

### 2. **Better Architecture**
```
Current:                          Proposed:
┌─────────────────┐              ┌─────────────────┐
│   Monolithic    │              │   MCP Server    │
│     Service     │              │   (Code Search) │
│                 │              └─────────────────┘
│  - Code Search  │              ┌─────────────────┐
│  - Perplexity   │     ──>      │   MCP Server    │
│  - SSE Handling │              │  (Perplexity)   │
│  - Everything!  │              └─────────────────┘
└─────────────────┘              ┌─────────────────┐
                                 │   MCP Server    │
                                 │  (File System)  │
                                 └─────────────────┘
```

### 3. **Security Improvements**
- Transport-layer authentication
- Tool-level permissions
- Input validation
- Secure environment variables

### 4. **Developer Experience**
```bash
# Current: Complex setup
npm install
# Edit config files
# Start multiple services
# Hope it works

# Proposed: Simple
npx @modelcontextprotocol/create-server my-tool
npm install
npm start
```

### 5. **Testing**
```typescript
// Current: No tests

// Proposed: Comprehensive testing
describe('Code Search Tool', () => {
  it('validates required parameters');
  it('handles indexer errors gracefully');
  it('formats results correctly');
  it('respects rate limits');
});
```

## 📊 Migration Impact

| Aspect | Current | Proposed | Impact |
|--------|---------|----------|---------|
| Protocol Compliance | 0% | 100% | Works with all MCP clients |
| Code Maintainability | Poor | Excellent | 80% less code |
| Test Coverage | 0% | >90% | Reliable operations |
| Security | Basic | Enterprise | Production ready |
| Performance | Variable | Consistent | <100ms overhead |

## 🚀 Why This Matters

1. **For Developers**: Clean, maintainable code
2. **For Users**: Reliable, fast tools
3. **For Security**: Proper boundaries and validation
4. **For Future**: Easy to add new capabilities

The rewrite isn't just about fixing bugs - it's about building a solid foundation for MECH AI's future capabilities using industry standards.