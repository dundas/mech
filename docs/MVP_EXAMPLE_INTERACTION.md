# MECH MVP - Example Self-Improvement Interaction

## Example 1: AI Reading Its Own Code

### User Input:
```
Can you show me your chat API implementation?
```

### AI Response with Tool Use:
```
I'll look at my chat API implementation for you.

[Tool Use: read_file]
Path: /Users/kefentse/dev_env/mech/mech-ai/frontend/app/api/chat/route.ts
```

### Tool Response (shown in chat):
```typescript
// File: mech-ai/frontend/app/api/chat/route.ts
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  const result = await streamText({
    model: anthropic('claude-3-sonnet'),
    messages,
  })
  
  return result.toDataStreamResponse()
}
```

### AI Analysis:
```
I can see the current chat API is quite basic. It's using the Vercel AI SDK to stream responses from Claude, but it's missing tool support. Let me check if there's a tool implementation elsewhere.

[Tool Use: search_code]
Query: "tools" in:file filename:route.ts
```

## Example 2: AI Improving Itself

### User Input:
```
Can you add file reading capability to yourself so you can read your own code?
```

### AI Response:
```
I'll add a file reading tool to my chat API. Let me first check the current implementation and then propose changes.

[Tool Use: read_file]
Path: /Users/kefentse/dev_env/mech/mech-ai/frontend/app/api/chat/route.ts
```

### After reading the file:
```
I'll now create an improved version with tool support. Here's my proposed change:

[Tool Use: write_file - Requires Approval]
Path: /Users/kefentse/dev_env/mech/mech-ai/frontend/app/api/chat/route.ts
```

### Diff View (shown to user):
```diff
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
+import { readFileSync } from 'fs'
+import { resolve } from 'path'
+
+// Define tools for AI
+const tools = {
+  read_file: {
+    description: 'Read a file from the MECH codebase',
+    parameters: {
+      type: 'object',
+      properties: {
+        path: { type: 'string', description: 'Path to file' }
+      },
+      required: ['path']
+    },
+    execute: async ({ path }: { path: string }) => {
+      try {
+        // Only allow reading from MECH directory
+        const mechRoot = '/Users/kefentse/dev_env/mech'
+        const fullPath = resolve(mechRoot, path.replace(mechRoot, ''))
+        
+        if (!fullPath.startsWith(mechRoot)) {
+          return { error: 'Access denied: Path outside MECH directory' }
+        }
+        
+        const content = readFileSync(fullPath, 'utf-8')
+        return { content, path: fullPath }
+      } catch (error) {
+        return { error: `Failed to read file: ${error.message}` }
+      }
+    }
+  }
+}

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  const result = await streamText({
    model: anthropic('claude-3-sonnet'),
    messages,
+    tools,
+    toolChoice: 'auto',
  })
  
  return result.toDataStreamResponse()
}
```

### User Approval UI:
```
┌─────────────────────────────────────────┐
│ 🔧 Tool Request: write_file             │
├─────────────────────────────────────────┤
│ The AI wants to modify:                 │
│ app/api/chat/route.ts                   │
│                                         │
│ Changes:                                │
│ + Add file reading tool                 │
│ + Add security checks                   │
│ + Enable tool support in AI             │
│                                         │
│ [View Diff] [Approve] [Reject] [Edit]  │
└─────────────────────────────────────────┘
```

## Example 3: AI Testing Its Changes

### After user approves:
```
Great! I've added the file reading capability. Let me test it to make sure it works.

[Tool Use: read_file]
Path: mech-ai/frontend/package.json
```

### Tool Response:
```json
{
  "name": "mech-ai-frontend",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev -p 5500",
    "build": "next build",
    "test": "jest"
  }
}
```

### AI Confirmation:
```
Perfect! The file reading tool is working. I can now read any file in the MECH codebase. Let me also check if we have tests for this API route.

[Tool Use: search_code]
Query: "chat/route" in:test
```

## Example 4: Self-Improvement Suggestions

### User Input:
```
What improvements would you suggest for yourself?
```

### AI Response:
```
Let me analyze my current capabilities and suggest improvements.

[Tool Use: list_files]
Path: mech-ai/frontend/lib/tools
```

### After analyzing:
```
Based on my analysis, here are the top improvements I should make to myself:

1. **Add Code Search Tool** - I can read files but can't search across the codebase efficiently
2. **Add Write File Tool** - I can't currently modify code (only read)
3. **Add Test Runner** - I should be able to run tests to verify my changes
4. **Add Git Integration** - I need to track and commit my improvements
5. **Better Error Handling** - My current implementation lacks proper error recovery

Would you like me to implement any of these improvements? I recommend starting with the code search tool as it will help me understand the codebase better.
```

## Example 5: Complete Self-Improvement Cycle

### User Input:
```
Yes, please add the code search tool to yourself.
```

### AI Response:
```
I'll add a code search tool by integrating with the mech-indexer service. Let me first check if it's running.

[Tool Use: execute_command]
Command: curl -s http://localhost:3003/health
```

### After confirming service is running:
```
Good, the indexer service is running. Now I'll add the search tool to my capabilities.

[Tool Use: write_file - Requires Approval]
Path: /Users/kefentse/dev_env/mech/mech-ai/frontend/app/api/chat/route.ts
```

### The AI shows the diff adding:
```typescript
search_code: {
  description: 'Search across the MECH codebase',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' }
    },
    required: ['query']
  },
  execute: async ({ query }: { query: string }) => {
    try {
      const response = await fetch('http://localhost:3003/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      
      const results = await response.json()
      return { results: results.slice(0, 5) } // Limit results
    } catch (error) {
      return { error: `Search failed: ${error.message}` }
    }
  }
}
```

### After approval and testing:
```
Excellent! I now have code search capability. Let me test it:

[Tool Use: search_code]
Query: "TODO"

Found 5 TODOs in the codebase:
1. frontend/components/chat.tsx:45 - TODO: Add message persistence
2. frontend/lib/ai/providers.ts:23 - TODO: Add error retry logic
3. indexer/src/index.ts:67 - TODO: Implement incremental indexing
...

I can now search through code to better understand what needs improvement. This will help me be more effective at improving myself!
```

## UI Mockup for MVP

```
┌─────────────────────────────────────────────────────────┐
│ MECH AI - Self-Improving Development Environment         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 👤 User: Can you read your own chat implementation?    │
│                                                         │
│ 🤖 AI: I'll read my chat implementation for you.       │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 🔧 Tool: read_file                               │   │
│ │ Path: mech-ai/frontend/app/api/chat/route.ts    │   │
│ │ Status: ✅ Complete                              │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ import { streamText } from 'ai'                  │   │
│ │ import { anthropic } from '@ai-sdk/anthropic'    │   │
│ │                                                   │   │
│ │ export async function POST(req: Request) {       │   │
│ │   const { messages } = await req.json()          │   │
│ │   ...                                             │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ 🤖 AI: I can see the current implementation is        │
│ basic. It doesn't have tool support yet. Would you    │
│ like me to add that capability?                       │
│                                                         │
│ [Type your message...]                        [Send]    │
└─────────────────────────────────────────────────────────┘
```

This example demonstrates the core MVP interactions where the AI can:
1. Read its own code
2. Search through its codebase
3. Propose improvements
4. Get user approval for changes
5. Test its modifications
6. Complete a full self-improvement cycle