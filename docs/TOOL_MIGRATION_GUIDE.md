# MECH AI Tool Migration Guide

**Date**: May 27, 2025  
**Purpose**: Step-by-step guide for migrating tools from frontend to agent architecture

## 🎯 Migration Overview

We need to migrate 9 tools from frontend (UI) to agent (backend) architecture while maintaining backward compatibility.

## 📋 Pre-Migration Checklist

- [ ] Run `scripts/setup-agent-structure.sh` to create directories
- [ ] Install dependencies in the agent directory
- [ ] Set up testing environment
- [ ] Back up existing code
- [ ] Document current tool behavior

## 🔧 Migration Pattern

### Step 1: Analyze Existing Tool

Example with `read-file.ts`:

```typescript
// Current: mech-ai/frontend/lib/tools/read-file.ts
export const readFile = {
  // UI concerns mixed with execution
  execute: async (params) => {
    // Direct file system access (BAD!)
    const content = await fs.readFile(params.path);
    return formatForUI(content);
  }
};
```

### Step 2: Create Agent Tool

```typescript
// New: mech-ai/agent/tools/file-ops/read-file.ts
import { BaseTool } from '../../core/base-tool';

export class ReadFileTool extends BaseTool {
  name = 'read-file';
  description = 'Read file contents';
  requiresApproval = false;
  
  parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path' }
    },
    required: ['path']
  };

  protected async executeInternal(params) {
    // Actual file operations here
    const content = await fs.readFile(params.path, 'utf-8');
    return {
      success: true,
      data: { path: params.path, content }
    };
  }
}
```

### Step 3: Update Frontend Tool

```typescript
// Updated: mech-ai/frontend/lib/tools/read-file.ts
export const readFile = {
  displayName: 'Read File',
  icon: FileIcon,
  
  // Now just calls the agent API
  execute: async (params) => {
    const response = await fetch('/api/agent/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'read-file',
        params
      })
    });
    
    const result = await response.json();
    return formatForUI(result);
  },
  
  // UI formatting
  formatForUI: (result) => {
    if (!result.success) {
      return <ErrorDisplay error={result.error} />;
    }
    
    return (
      <FileDisplay 
        path={result.data.path}
        content={result.data.content}
      />
    );
  }
};
```

### Step 4: Create API Endpoint

```typescript
// New: mech-ai/frontend/pages/api/agent/tools/execute.ts
import { toolRegistry } from '@mech-ai/agent';

export default async function handler(req, res) {
  const { tool: toolName, params } = req.body;
  
  // Get tool from registry
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  
  // Check approval if needed
  if (tool.requiresApproval) {
    const approved = await checkApproval(req, toolName, params);
    if (!approved) {
      return res.status(403).json({ error: 'Approval required' });
    }
  }
  
  // Execute tool
  try {
    const result = await tool.execute(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

## 📊 Tool-by-Tool Migration Plan

### Phase 1: Simple Tools (No Approval)
1. **read-file** ⏱️ 2 hours
   - Move file reading logic to agent
   - Update frontend to call API
   - Add security validation

2. **list-files** ⏱️ 2 hours
   - Move directory listing to agent
   - Add path validation
   - Update UI formatting

3. **git-status** ⏱️ 2 hours
   - Move git operations to agent
   - Handle various git states
   - Format for UI display

### Phase 2: Approval Required Tools
4. **write-file** ⏱️ 4 hours
   - Implement approval flow
   - Move write logic to agent
   - Add rollback capability

5. **execute-command** ⏱️ 4 hours
   - Sandbox command execution
   - Implement approval UI
   - Add timeout handling

6. **git-commit** ⏱️ 3 hours
   - Move commit logic to agent
   - Implement commit message validation
   - Add approval flow

### Phase 3: Complex Tools
7. **search-code** ⏱️ 4 hours
   - Integrate with indexer service
   - Implement search algorithms
   - Optimize performance

8. **run-tests** ⏱️ 6 hours
   - Detect test framework
   - Execute in sandbox
   - Stream results

9. **analyze-project** ⏱️ 6 hours
   - Implement from scratch
   - Add various analysis metrics
   - Create detailed reports

10. **health-check** ⏱️ 3 hours
    - Fix existing implementation
    - Add comprehensive checks
    - Create health dashboard

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('ReadFileTool', () => {
  it('should read file successfully');
  it('should handle missing files');
  it('should validate paths');
  it('should respect permissions');
});
```

### Integration Tests
```typescript
describe('Tool API Integration', () => {
  it('should execute tool via API');
  it('should handle approval flow');
  it('should format results for UI');
});
```

### End-to-End Tests
```typescript
describe('User Tool Flow', () => {
  it('should show file contents in UI');
  it('should handle errors gracefully');
  it('should maintain session state');
});
```

## 🚨 Common Pitfalls

### 1. Path Traversal
```typescript
// BAD: No validation
const content = await fs.readFile(params.path);

// GOOD: Validate path
const safePath = validatePath(params.path);
const content = await fs.readFile(safePath);
```

### 2. Missing Error Handling
```typescript
// BAD: Unhandled errors
const result = await tool.execute(params);

// GOOD: Proper error handling
try {
  const result = await tool.execute(params);
  return { success: true, data: result };
} catch (error) {
  logger.error('Tool execution failed', { error });
  return { success: false, error: error.message };
}
```

### 3. Synchronous Operations
```typescript
// BAD: Blocking operations
const files = fs.readdirSync(path);

// GOOD: Async operations
const files = await fs.readdir(path);
```

## 📅 Migration Timeline

### Week 1
- Day 1-2: Setup and Phase 1 tools
- Day 3-4: Testing and documentation
- Day 5: Deploy and monitor

### Week 2
- Day 1-3: Phase 2 tools with approval
- Day 4-5: Integration testing

### Week 3
- Day 1-4: Phase 3 complex tools
- Day 5: Performance optimization

### Week 4
- Day 1-2: Final testing
- Day 3: Documentation update
- Day 4-5: Production deployment

## ✅ Success Criteria

- [ ] All tools migrated to agent architecture
- [ ] Frontend only handles UI concerns
- [ ] All dangerous operations require approval
- [ ] Comprehensive test coverage (>90%)
- [ ] Performance benchmarks met (<2s response)
- [ ] Security audit passed
- [ ] Documentation complete

## 🚀 Post-Migration

1. **Monitor Performance**
   - Track response times
   - Monitor error rates
   - Analyze usage patterns

2. **Gather Feedback**
   - User experience surveys
   - Developer feedback
   - Performance metrics

3. **Iterate and Improve**
   - Optimize slow operations
   - Add new features
   - Enhance security

---

*This migration will establish a secure, scalable foundation for MECH AI's tool system.*