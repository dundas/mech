# Cline Patterns for MECH Agent Tool Use

## Executive Summary

After analyzing Cline's architecture, here are the key patterns that MECH can adapt for browser-based agent tool use:

## 1. Tool Definition Pattern

Cline uses a structured approach with predefined tool names and parameters:

```typescript
// Core tool names
export const toolUseNames = [
  "execute_command",
  "read_file", 
  "write_to_file",
  "replace_in_file",
  "search_files",
  "list_files",
  "use_mcp_tool",
  "access_mcp_resource",
  // ... more tools
] as const

// Tool interface
export interface ToolUse {
  type: "tool_use"
  name: ToolUseName
  params: Partial<Record<ToolParamName, string>>
  partial: boolean
}
```

**MECH Adaptation**: 
- Define a similar set of browser-compatible tools
- Use TypeScript for type safety
- Support partial tool invocations for real-time UI updates

## 2. Approval Flow Pattern

Cline implements a sophisticated approval system:

```typescript
// Auto-approval based on:
- Tool type (safe vs dangerous)
- Path location (workspace vs system)
- User settings

// UI flow:
if (shouldAutoApprove) {
  executeDirectly()
} else {
  const approved = await askApproval("tool", toolParams)
  if (approved) execute()
}
```

**MECH Adaptation**:
- Implement browser-based approval UI
- Store auto-approval preferences in localStorage
- Show diffs/previews before execution

## 3. MCP (Model Context Protocol) Integration

Cline's MCP implementation provides extensibility:

```typescript
export type McpServer = {
  name: string
  config: string
  status: "connected" | "connecting" | "disconnected"
  tools?: McpTool[]
  resources?: McpResource[]
  timeout?: number
}

export type McpTool = {
  name: string
  description?: string
  inputSchema?: object
  autoApprove?: boolean
}
```

**MECH Adaptation**:
- Use WebSocket connections to MCP servers
- Implement browser-compatible MCP client
- Support dynamic tool loading

## 4. Message Passing Architecture

Cline uses structured message passing between UI and backend:

```typescript
// Bidirectional messages
type WebviewMessage = // UI → Backend
type ExtensionMessage = // Backend → UI

// Clear message types for different operations
```

**MECH Adaptation**:
- Use postMessage API for Worker communication
- WebSocket for server communication
- Structured event system

## 5. Context Management

Cline maintains rich context across tool invocations:

```typescript
// Multi-level state:
- Global state (API keys, settings)
- Task state (current operation)
- Tool execution history
- Checkpoint system for rollback
```

**MECH Adaptation**:
- IndexedDB for persistent state
- In-memory state for active sessions
- Browser-based checkpoint system

## 6. Error Handling & Recovery

Cline implements robust error handling:

```typescript
// Consecutive mistake tracking
// Graceful degradation
// User-friendly error messages
// Checkpoint-based recovery
```

**MECH Adaptation**:
- Browser-specific error handling
- Service Worker for resilience
- User-guided recovery flows

## MVP Implementation Strategy for MECH

### Phase 1: Core Tool System (Week 1)
1. **Define Browser-Compatible Tools**:
   ```typescript
   const mechTools = [
     "execute_code",      // WebContainer
     "read_file",         // Virtual FS
     "write_file",        // Virtual FS
     "search_code",       // Indexer service
     "analyze_database",  // Mech-analyzer
     "run_tests",         // Playwright
   ] as const
   ```

2. **Implement Approval UI**:
   - React component for tool approval
   - Diff viewer for file changes
   - Settings for auto-approval

### Phase 2: Message System (Week 1)
1. **Setup Communication**:
   ```typescript
   // Worker ↔ Main Thread
   worker.postMessage({ type: 'tool_use', tool, params })
   
   // Client ↔ Server
   websocket.send(JSON.stringify({ type: 'execute', tool, params }))
   ```

2. **State Management**:
   - Zustand/Redux for UI state
   - IndexedDB for persistence
   - WebSocket for real-time sync

### Phase 3: MCP Integration (Week 2)
1. **MCP Client**:
   - WebSocket-based MCP client
   - Tool discovery and registration
   - Dynamic tool loading

2. **Existing Service Integration**:
   - Connect mech-analyzer as MCP server
   - Connect mech-indexer for code search
   - Connect WebContainer for execution

### Key Differences from Cline

1. **Browser Constraints**:
   - No direct file system access
   - Sandboxed execution environment
   - Web security policies

2. **Browser Advantages**:
   - Real-time collaboration potential
   - No installation required
   - Cross-platform by default

3. **Architecture Adaptations**:
   - Service Workers instead of extension host
   - IndexedDB instead of file system
   - WebContainers instead of terminal

## Recommended MVP Tool Set

Based on Cline's patterns, here's the minimal tool set for MECH MVP:

1. **Code Execution** (`execute_code`)
   - Via WebContainer
   - Auto-approve for read-only operations

2. **File Operations** (`read_file`, `write_file`)
   - Virtual file system in WebContainer
   - Diff preview before write

3. **Code Search** (`search_code`)
   - Via mech-indexer service
   - Pattern and semantic search

4. **Database Analysis** (`analyze_database`)
   - Via mech-analyzer service
   - Natural language queries

5. **Test Execution** (`run_tests`)
   - Via Playwright integration
   - Visual test results

This approach leverages Cline's proven patterns while adapting them for the browser environment, creating a powerful yet user-friendly agent system.