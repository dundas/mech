# MECH AI Tool Inventory

**Date**: May 27, 2025  
**Purpose**: Complete inventory of all tools in the MECH AI platform

## 📊 Tool Locations Summary

| Location | Type | Count | Status |
|----------|------|-------|--------|
| `/mech-ai/frontend/lib/tools/` | UI Tools | 9 | ⚠️ Mixed concerns |
| `/mech-ai/services/unified-mcp-service/` | MCP Tools | Unknown | 🔍 Needs investigation |
| `/mech-ai/agent/tools/` | Agent Tools | 0 | ❌ Needs creation |

## 🔧 Detailed Tool Inventory

### Frontend Tools (`/mech-ai/frontend/lib/tools/`)

#### 1. **read-file.ts**
- **Purpose**: Display file contents in UI
- **Status**: ✅ Implemented
- **Issues**: Contains execution logic that should be in agent
- **Action**: Extract execution logic to agent tool

#### 2. **write-file.ts**
- **Purpose**: Handle file write with approval UI
- **Status**: ✅ Implemented with logging attempts
- **Issues**: Mixed UI and execution concerns
- **Action**: Separate UI from execution

#### 3. **list-files.ts**
- **Purpose**: Display directory contents
- **Status**: ✅ Implemented
- **Issues**: None identified
- **Action**: Verify UI-only implementation

#### 4. **search-code.ts**
- **Purpose**: Search code and display results
- **Status**: ✅ Implemented
- **Issues**: May contain search logic
- **Action**: Move search logic to agent

#### 5. **execute-command.ts**
- **Purpose**: Execute commands with approval
- **Status**: ✅ Implemented
- **Issues**: Dangerous execution in frontend
- **Action**: Move all execution to agent

#### 6. **run-tests.ts**
- **Purpose**: Run test suites
- **Status**: ✅ Implemented
- **Issues**: Test execution in frontend
- **Action**: Move to agent

#### 7. **git-status.ts**
- **Purpose**: Show git status
- **Status**: ✅ Implemented
- **Issues**: Git operations in frontend
- **Action**: Move to agent

#### 8. **git-diff.ts**
- **Purpose**: Display git differences
- **Status**: ✅ Implemented
- **Issues**: Git operations in frontend
- **Action**: Move to agent

#### 9. **git-commit.ts**
- **Purpose**: Create git commits with approval
- **Status**: ✅ Implemented
- **Issues**: Git operations in frontend
- **Action**: Move to agent

#### 10. **analyze-project.ts**
- **Purpose**: Analyze project structure
- **Status**: ❌ Empty file
- **Issues**: Not implemented
- **Action**: Implement in agent first

#### 11. **health-check.ts**
- **Purpose**: Check system health
- **Status**: ⚠️ Partially implemented with logging
- **Issues**: Incomplete, has errors
- **Action**: Complete implementation in agent

### Registry File (`/mech-ai/frontend/lib/tools/registry.ts`)
- **Purpose**: Tool registration and exports
- **Status**: ✅ Exists
- **Issues**: Registers UI tools as if they were execution tools
- **Action**: Create separate registries for UI and agent

## 🗂️ MCP Service Tools

Need to investigate:
```bash
ls /mech-ai/services/unified-mcp-service/
```

Expected tools:
- Code search integration
- Perplexity integration
- Database operations
- Other MCP protocol implementations

## 📋 Tool Migration Priority

### Priority 1: Core File Operations
1. `read-file` - Most basic operation
2. `write-file` - Needs approval flow
3. `list-files` - Directory navigation

### Priority 2: Code Analysis
1. `analyze-project` - Currently empty, implement fresh
2. `search-code` - Move search logic
3. `health-check` - Fix and complete

### Priority 3: Execution Tools
1. `execute-command` - Critical for operations
2. `run-tests` - Testing capability
3. Git tools (`status`, `diff`, `commit`)

## 🔄 Migration Plan

### Step 1: Create Agent Tool Structure
```bash
# Create directories
mkdir -p mech-ai/agent/tools/{file-ops,code-analysis,execution,git}
```

### Step 2: Implement Core Interfaces
```typescript
// mech-ai/agent/core/interfaces.ts
export interface Tool {
  name: string;
  description: string;
  requiresApproval: boolean;
  execute(params: any): Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
```

### Step 3: Migrate First Tool
Start with `read-file` as it's the simplest:
1. Create agent implementation
2. Update frontend to call agent
3. Test thoroughly
4. Document pattern

### Step 4: Continue Migration
Follow the pattern established with read-file for remaining tools.

## 🚨 Critical Issues Found

1. **Security Risk**: Execution logic in frontend
   - Commands, file writes, and git operations should NEVER be in frontend
   - All execution must happen in controlled backend environment

2. **Incomplete Implementations**:
   - `analyze-project.ts` is empty
   - `health-check.ts` has errors
   - Logger integration is broken

3. **Architectural Confusion**:
   - No clear separation between UI and execution
   - Tools trying to do both display and execution
   - No proper approval flow integration

## ✅ Recommendations

1. **Immediate Actions**:
   - Create agent directory structure
   - Move ALL execution logic out of frontend
   - Fix security vulnerabilities

2. **Short Term**:
   - Implement proper tool registry
   - Create approval flow system
   - Add comprehensive logging

3. **Long Term**:
   - Add tool versioning
   - Implement tool marketplace
   - Create tool development SDK

## 📊 Success Metrics

- **Security**: 0 execution operations in frontend
- **Separation**: 100% clear UI vs agent separation  
- **Functionality**: All tools working with proper approval
- **Testing**: >90% test coverage for agent tools
- **Documentation**: Every tool fully documented

---

*This inventory will be updated as tools are migrated and new tools are added.*