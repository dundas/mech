# Claude Code Hooks Integration Guide

## Overview

This document provides comprehensive guidance for integrating Claude Code hooks with the Mech unified backend system, enabling real-time tracking of development progress, reasoning storage, and seamless workflow automation.

## Claude Code Hooks Architecture

### Hook Types and Events

Claude Code provides several hook events that can be configured to trigger at different points in the workflow:

#### 1. **PreToolUse**
- **Trigger**: Before Claude executes any tool
- **Use Case**: Validation, preparation, logging
- **Can Block**: Yes (exit code 2)

#### 2. **PostToolUse**
- **Trigger**: After a tool completes successfully
- **Use Case**: Processing results, triggering follow-up actions
- **Can Block**: No

#### 3. **Notification**
- **Trigger**: When Claude sends notifications (waiting for input, idle)
- **Use Case**: User notifications, session management
- **Can Block**: No

#### 4. **Stop**
- **Trigger**: When Claude finishes responding
- **Use Case**: Session cleanup, final processing
- **Can Block**: No

#### 5. **SubagentStop**
- **Trigger**: When subagents (Task tools) finish
- **Use Case**: Task completion tracking
- **Can Block**: No

## Hook Configuration

### 1. Claude Code Settings Configuration

Create `.claude/settings.toml` in your project root:

```toml
# Mech Claude Code Hooks Configuration

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "edit_file"
command = "./.claude/hooks/mech-progress.sh '$CLAUDE_TOOL_NAME' '$CLAUDE_FILE_PATHS'"
timeout = 30

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "create_file"
command = "./.claude/hooks/mech-progress.sh '$CLAUDE_TOOL_NAME' '$CLAUDE_FILE_PATHS'"
timeout = 30

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "str_replace_editor"
command = "./.claude/hooks/mech-progress.sh '$CLAUDE_TOOL_NAME' '$CLAUDE_FILE_PATHS'"
timeout = 30

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "bash"
command = "./.claude/hooks/mech-command.sh '$CLAUDE_TOOL_NAME' '$CLAUDE_COMMAND'"
timeout = 60

[[hooks]]
event = "Stop"
command = "./.claude/hooks/mech-session-end.sh '$CLAUDE_SESSION_ID'"
timeout = 30

[[hooks]]
event = "Notification"
command = "./.claude/hooks/mech-notification.sh '$CLAUDE_NOTIFICATION_TYPE'"
timeout = 10
```

### 2. Hook Scripts

#### Main Progress Hook (`mech-progress.sh`)

```bash
#!/bin/bash
# .claude/hooks/mech-progress.sh
# Main hook for processing file changes and tool usage

set -e

# Configuration
MECH_BACKEND_URL="${MECH_BACKEND_URL:-http://localhost:3000}"
MECH_PROJECT_ID="${MECH_PROJECT_ID:-$(basename $(pwd))}"
MECH_SESSION_ID="${MECH_SESSION_ID:-$(uuidgen)}"
HOOK_LOG_FILE="${HOOK_LOG_FILE:-.claude/progress.log}"

# Parameters
TOOL_NAME="$1"
FILE_PATHS="$2"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
WORKING_DIR=$(pwd)
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo 'unknown')

# Log locally
echo "[$TIMESTAMP] Processing $TOOL_NAME: $FILE_PATHS" >> "$HOOK_LOG_FILE"

# Create hook event payload
create_hook_payload() {
    local changed_files_json="[]"
    if [[ -n "$FILE_PATHS" ]]; then
        # Convert space-separated file paths to JSON array
        changed_files_json=$(echo "$FILE_PATHS" | tr ' ' '\n' | jq -R . | jq -s .)
    fi

    cat <<EOF
{
  "sessionId": "$MECH_SESSION_ID",
  "eventType": "PostToolUse",
  "toolName": "$TOOL_NAME",
  "operation": "file_modification",
  "timestamp": "$TIMESTAMP",
  "payload": {
    "files": $changed_files_json,
    "parameters": {
      "filePaths": "$FILE_PATHS",
      "workingDirectory": "$WORKING_DIR"
    },
    "result": {
      "success": true,
      "timestamp": "$TIMESTAMP"
    }
  },
  "metadata": {
    "projectId": "$MECH_PROJECT_ID",
    "gitCommit": "$GIT_COMMIT",
    "branch": "$GIT_BRANCH",
    "workingDirectory": "$WORKING_DIR"
  }
}
EOF
}

# Send to unified backend
send_to_backend() {
    local payload=$(create_hook_payload)
    
    curl -X POST "$MECH_BACKEND_URL/api/claude/hooks/process" \
        -H "Content-Type: application/json" \
        -H "X-Project-ID: $MECH_PROJECT_ID" \
        -H "X-Session-ID: $MECH_SESSION_ID" \
        -d "$payload" \
        --silent \
        --max-time 10 \
        --fail 2>/dev/null || {
        echo "[$TIMESTAMP] Failed to send hook to backend" >> "$HOOK_LOG_FILE"
        return 1
    }
    
    echo "[$TIMESTAMP] Hook sent to backend successfully" >> "$HOOK_LOG_FILE"
}

# Auto-commit changes (optional)
auto_commit() {
    if [[ "$MECH_AUTO_COMMIT" == "true" && -n "$FILE_PATHS" ]]; then
        git add . 2>/dev/null || true
        git commit -m "🤖 Mech Progress: $TOOL_NAME at $TIMESTAMP

Auto-commit from Claude Code hooks
Session: $MECH_SESSION_ID
Files: $FILE_PATHS
Tool: $TOOL_NAME" --allow-empty 2>/dev/null || true
        
        echo "[$TIMESTAMP] Auto-committed changes" >> "$HOOK_LOG_FILE"
    fi
}

# Main execution
main() {
    # Send hook to backend
    send_to_backend
    
    # Auto-commit if enabled
    auto_commit
    
    # Success
    exit 0
}

# Run main function
main "$@"
```

#### Command Hook (`mech-command.sh`)

```bash
#!/bin/bash
# .claude/hooks/mech-command.sh
# Hook for processing bash commands

set -e

TOOL_NAME="$1"
COMMAND="$2"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
MECH_BACKEND_URL="${MECH_BACKEND_URL:-http://localhost:3000}"
MECH_PROJECT_ID="${MECH_PROJECT_ID:-$(basename $(pwd))}"
MECH_SESSION_ID="${MECH_SESSION_ID:-$(uuidgen)}"

# Create command hook payload
create_command_payload() {
    cat <<EOF
{
  "sessionId": "$MECH_SESSION_ID",
  "eventType": "PostToolUse",
  "toolName": "$TOOL_NAME",
  "operation": "command_execution",
  "timestamp": "$TIMESTAMP",
  "payload": {
    "command": "$COMMAND",
    "parameters": {
      "workingDirectory": "$(pwd)"
    },
    "result": {
      "success": true,
      "timestamp": "$TIMESTAMP"
    }
  },
  "metadata": {
    "projectId": "$MECH_PROJECT_ID",
    "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
  }
}
EOF
}

# Send to backend
curl -X POST "$MECH_BACKEND_URL/api/claude/hooks/process" \
    -H "Content-Type: application/json" \
    -H "X-Project-ID: $MECH_PROJECT_ID" \
    -H "X-Session-ID: $MECH_SESSION_ID" \
    -d "$(create_command_payload)" \
    --silent \
    --max-time 10 \
    --fail 2>/dev/null || true

exit 0
```

#### Session End Hook (`mech-session-end.sh`)

```bash
#!/bin/bash
# .claude/hooks/mech-session-end.sh
# Hook for session cleanup and final processing

set -e

SESSION_ID="$1"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
MECH_BACKEND_URL="${MECH_BACKEND_URL:-http://localhost:3000}"
MECH_PROJECT_ID="${MECH_PROJECT_ID:-$(basename $(pwd))}"

# Create session end payload
create_session_end_payload() {
    cat <<EOF
{
  "sessionId": "$SESSION_ID",
  "eventType": "Stop",
  "toolName": "session",
  "operation": "session_end",
  "timestamp": "$TIMESTAMP",
  "payload": {
    "sessionStats": {
      "endTime": "$TIMESTAMP",
      "totalFiles": $(find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | wc -l),
      "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
    }
  },
  "metadata": {
    "projectId": "$MECH_PROJECT_ID",
    "finalState": "completed"
  }
}
EOF
}

# Send session end to backend
curl -X POST "$MECH_BACKEND_URL/api/claude/hooks/process" \
    -H "Content-Type: application/json" \
    -H "X-Project-ID: $MECH_PROJECT_ID" \
    -H "X-Session-ID: $SESSION_ID" \
    -d "$(create_session_end_payload)" \
    --silent \
    --max-time 10 \
    --fail 2>/dev/null || true

echo "[$TIMESTAMP] Session $SESSION_ID ended" >> .claude/progress.log
exit 0
```

### 3. Environment Configuration

#### Project Environment Variables (`.env`)

```bash
# Mech Backend Configuration
MECH_BACKEND_URL=https://mech-unified-backend.eastus.azurecontainer.io
MECH_PROJECT_ID=507f1f77bcf86cd799439012
MECH_AUTO_COMMIT=true
MECH_AUTO_PUSH=false
MECH_ENABLE_REASONING=true

# Claude Code Configuration
CLAUDE_SESSION_TIMEOUT=3600000
CLAUDE_HOOK_TIMEOUT=30
CLAUDE_MAX_RETRIES=3

# GitHub Integration
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=your-org/your-repo

# MongoDB (for direct access if needed)
MONGODB_URI=your_mongodb_uri_here
MONGODB_DB_NAME=mechDB
```

#### Global Configuration (`~/.claude/global-config.toml`)

```toml
[hooks]
default_timeout = 30
max_concurrent = 3
retry_attempts = 2

[mech]
backend_url = "https://mech-unified-backend.eastus.azurecontainer.io"
auto_commit = true
auto_push = false
enable_reasoning = true
```

## Next.js API Routes Integration

### 1. Hook Processing Route

```typescript
// app/api/claude-hooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateHookSignature } from '@/lib/claude/validation';
import { processClaudeHook } from '@/lib/claude/processor';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Validate hook signature (if webhook secret is configured)
    const signature = request.headers.get('x-claude-signature');
    if (signature) {
      const isValid = await validateHookSignature(payload, signature);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // Extract headers
    const projectId = request.headers.get('x-project-id');
    const sessionId = request.headers.get('x-session-id');
    
    // Process hook
    const result = await processClaudeHook({
      ...payload,
      projectId,
      sessionId
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Claude hook processing error:', error);
    return NextResponse.json({ 
      error: 'Hook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Health check for hook endpoint
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
```

### 2. Hook Processor Implementation

```typescript
// lib/claude/processor.ts
import { connectToMongoDB, getDatabase } from '@/lib/mongodb/client';
import { HookEvent, ReasoningLog } from '@/lib/types/claude';

export async function processClaudeHook(hookEvent: HookEvent): Promise<any> {
  const db = await getDatabase();
  
  try {
    // Store hook event
    const hookResult = await db.collection('hook_events').insertOne({
      ...hookEvent,
      createdAt: new Date(),
      processed: false
    });
    
    // Process based on event type
    const actions = await processHookActions(hookEvent, db);
    
    // Mark as processed
    await db.collection('hook_events').updateOne(
      { _id: hookResult.insertedId },
      { $set: { processed: true, processedAt: new Date() } }
    );
    
    return {
      success: true,
      hookId: hookResult.insertedId,
      actions,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Hook processing error:', error);
    throw error;
  }
}

async function processHookActions(hookEvent: HookEvent, db: any): Promise<any[]> {
  const actions = [];
  
  // Trigger incremental indexing for file changes
  if (hookEvent.eventType === 'PostToolUse' && hookEvent.payload.files?.length > 0) {
    const indexingAction = await triggerIncrementalIndexing(
      hookEvent.sessionId,
      hookEvent.payload.files,
      hookEvent.metadata.projectId
    );
    actions.push(indexingAction);
  }
  
  // Store reasoning if available
  if (hookEvent.payload.reasoning) {
    const reasoningAction = await storeReasoning(
      hookEvent.sessionId,
      hookEvent.payload.reasoning,
      db
    );
    actions.push(reasoningAction);
  }
  
  // Update session state
  if (hookEvent.eventType === 'Stop') {
    const sessionAction = await updateSessionState(
      hookEvent.sessionId,
      'completed',
      db
    );
    actions.push(sessionAction);
  }
  
  return actions;
}

async function triggerIncrementalIndexing(
  sessionId: string,
  files: string[],
  projectId: string
): Promise<any> {
  // Call unified backend indexing endpoint
  const response = await fetch(`${process.env.MECH_BACKEND_URL}/api/indexer/index`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Project-ID': projectId,
      'X-Session-ID': sessionId
    },
    body: JSON.stringify({
      projectId,
      files,
      incremental: true,
      source: 'claude_hook'
    })
  });
  
  const result = await response.json();
  
  return {
    type: 'indexing_triggered',
    files,
    jobId: result.jobId,
    status: result.status
  };
}

async function storeReasoning(
  sessionId: string,
  reasoning: any,
  db: any
): Promise<any> {
  const reasoningLog: ReasoningLog = {
    sessionId,
    messageId: reasoning.messageId,
    step: reasoning.step || 1,
    type: reasoning.type || 'analysis',
    content: reasoning.content,
    timestamp: new Date(),
    context: reasoning.context || {},
    metadata: reasoning.metadata || {}
  };
  
  const result = await db.collection('reasoning_logs').insertOne(reasoningLog);
  
  return {
    type: 'reasoning_stored',
    reasoningId: result.insertedId,
    step: reasoningLog.step
  };
}

async function updateSessionState(
  sessionId: string,
  status: string,
  db: any
): Promise<any> {
  const result = await db.collection('claude_sessions').updateOne(
    { sessionId },
    {
      $set: {
        status,
        endTime: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  
  return {
    type: 'session_updated',
    sessionId,
    status,
    modified: result.modifiedCount > 0
  };
}
```

### 3. Reasoning Storage Service

```typescript
// lib/claude/reasoning.ts
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb/client';
import { ReasoningLog } from '@/lib/types/claude';

export class ReasoningService {
  private db: any;
  
  constructor() {
    this.db = null;
  }
  
  private async getDb() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }
  
  async storeReasoning(reasoning: Partial<ReasoningLog>): Promise<string> {
    const db = await this.getDb();
    
    const reasoningLog: ReasoningLog = {
      sessionId: reasoning.sessionId!,
      messageId: reasoning.messageId,
      step: reasoning.step || 1,
      type: reasoning.type || 'analysis',
      content: reasoning.content!,
      timestamp: new Date(),
      context: reasoning.context || {},
      metadata: reasoning.metadata || {}
    };
    
    const result = await db.collection('reasoning_logs').insertOne(reasoningLog);
    
    // Update associated message if messageId provided
    if (reasoning.messageId) {
      await db.collection('messages').updateOne(
        { _id: new ObjectId(reasoning.messageId) },
        {
          $push: {
            'claudeCodeSession.reasoningLogs': result.insertedId
          }
        }
      );
    }
    
    return result.insertedId.toString();
  }
  
  async searchReasoning(
    query: string,
    filters: any = {},
    options: any = {}
  ): Promise<ReasoningLog[]> {
    const db = await this.getDb();
    
    const searchQuery = {
      $text: { $search: query },
      ...filters
    };
    
    const results = await db.collection('reasoning_logs')
      .find(searchQuery)
      .sort({ score: { $meta: 'textScore' } })
      .limit(options.limit || 10)
      .toArray();
    
    return results;
  }
  
  async getSessionReasoning(sessionId: string): Promise<ReasoningLog[]> {
    const db = await this.getDb();
    
    return await db.collection('reasoning_logs')
      .find({ sessionId })
      .sort({ step: 1, timestamp: 1 })
      .toArray();
  }
  
  async getReasoningStats(sessionId?: string): Promise<any> {
    const db = await this.getDb();
    
    const matchStage = sessionId ? { $match: { sessionId } } : { $match: {} };
    
    const stats = await db.collection('reasoning_logs').aggregate([
      matchStage,
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgSteps: { $avg: '$step' },
          latestTimestamp: { $max: '$timestamp' }
        }
      }
    ]).toArray();
    
    return stats;
  }
}
```

## Auto-Configuration Script

### Project Setup Script

```bash
#!/bin/bash
# setup-claude-hooks.sh
# Auto-configuration script for Claude Code hooks

set -e

echo "🔧 Setting up Claude Code hooks for Mech project..."

# Create .claude directory structure
mkdir -p .claude/{hooks,commands}

# Copy hook scripts
cp -r scripts/claude-hooks/* .claude/hooks/
chmod +x .claude/hooks/*.sh

# Create settings.toml
cat > .claude/settings.toml << 'EOF'
# Mech Claude Code Hooks Configuration
# Auto-generated - modify as needed

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "edit_file"
command = "./.claude/hooks/mech-progress.sh '$CLAUDE_TOOL_NAME' '$CLAUDE_FILE_PATHS'"
timeout = 30

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "create_file"
command = "./.claude/hooks/mech-progress.sh '$CLAUDE_TOOL_NAME' '$CLAUDE_FILE_PATHS'"
timeout = 30

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "str_replace_editor"
command = "./.claude/hooks/mech-progress.sh '$CLAUDE_TOOL_NAME' '$CLAUDE_FILE_PATHS'"
timeout = 30

[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "bash"
command = "./.claude/hooks/mech-command.sh '$CLAUDE_TOOL_NAME' '$CLAUDE_COMMAND'"
timeout = 60

[[hooks]]
event = "Stop"
command = "./.claude/hooks/mech-session-end.sh '$CLAUDE_SESSION_ID'"
timeout = 30
EOF

# Create project-specific CLAUDE.md
cat > CLAUDE.md << 'EOF'
# Mech Project - Claude Code Configuration

## Project Overview
This is a Mech AI project with integrated Claude Code hooks for progress tracking and reasoning storage.

## Available Commands
- `npm run dev` - Start development server
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Run linting

## Hook Configuration
Claude Code hooks are configured to:
- Track file changes and modifications
- Store reasoning and decision logs
- Trigger incremental indexing
- Auto-commit changes (if enabled)

## Project Structure
- `src/` - Source code
- `docs/` - Documentation
- `.claude/` - Claude Code configuration
- `scripts/` - Build and deployment scripts

## Environment Variables
Required environment variables:
- `MECH_BACKEND_URL` - Unified backend URL
- `MECH_PROJECT_ID` - Project identifier
- `MONGODB_URI` - Database connection string
EOF

# Detect project ID from existing config
if [ -f .env ]; then
    PROJECT_ID=$(grep MECH_PROJECT_ID .env | cut -d'=' -f2)
fi

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(basename $(pwd))
    echo "MECH_PROJECT_ID=$PROJECT_ID" >> .env
fi

echo "✅ Claude Code hooks configured successfully!"
echo "📝 Project ID: $PROJECT_ID"
echo "🔧 Edit .claude/settings.toml to customize hook behavior"
echo "🚀 Start Claude Code to begin tracking your development progress"
```

## Testing and Validation

### Hook Testing Script

```bash
#!/bin/bash
# test-claude-hooks.sh
# Test Claude Code hooks integration

set -e

echo "🧪 Testing Claude Code hooks integration..."

# Test backend connectivity
echo "Testing backend connection..."
curl -f -s "$MECH_BACKEND_URL/api/health" > /dev/null || {
    echo "❌ Backend not accessible at $MECH_BACKEND_URL"
    exit 1
}

# Test hook processing endpoint
echo "Testing hook processing endpoint..."
curl -f -s "$MECH_BACKEND_URL/api/claude/hooks/process" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"test": true}' > /dev/null || {
    echo "❌ Hook processing endpoint not responding"
    exit 1
}

# Test hook script execution
echo "Testing hook script..."
./.claude/hooks/mech-progress.sh "test_tool" "test_file.txt" || {
    echo "❌ Hook script execution failed"
    exit 1
}

echo "✅ All tests passed!"
echo "🎉 Claude Code hooks are ready to use"
```

This comprehensive integration guide provides everything needed to set up Claude Code hooks with the Mech unified backend system, enabling powerful development workflow automation and progress tracking.