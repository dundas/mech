# Mech AI Multi-Agent System - API Documentation

## Overview

The Mech AI Multi-Agent System provides a comprehensive API for managing multiple AI agents working on the same project. It includes automatic project detection, session-based agent isolation, file locking, and memory persistence.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Agents receive authentication tokens upon registration. Include the token in the `Authorization` header for protected endpoints.

## API Endpoints

### 🤖 Agent Management

#### Register Agent
```http
POST /api/agents/register
```

**Description**: Register a new agent with the system

**Request Body**:
```json
{
  "agentType": "claude-code",
  "agentVersion": "1.0.0",
  "projectId": "auto-detected-or-provided",
  "instanceId": "session-123456",
  "environment": {
    "platform": "darwin",
    "os": "Darwin 23.5.0",
    "hostname": "macbook-pro-5.lan",
    "workingDirectory": "/path/to/project",
    "gitBranch": "main",
    "gitCommit": "abc123",
    "sessionId": "session-123456",
    "pid": 12345
  },
  "capabilities": {
    "tools": ["file", "bash", "search", "edit", "git"],
    "languages": ["javascript", "typescript", "python"],
    "canExecuteCode": true,
    "canAccessInternet": true
  },
  "communication": {
    "protocol": "rest",
    "pollInterval": 30000
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "claude-code-abc123",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "permissions": ["read:files", "write:files", "execute:commands"],
    "workspace": {
      "projectId": "abc123",
      "rootPath": "/path/to/project",
      "allowedPaths": ["/path/to/project/**/*"],
      "restrictedPaths": ["**/node_modules/**/*", "**/.env"]
    },
    "endpoints": {
      "heartbeat": "http://localhost:3000/api/agents/claude-code-abc123/heartbeat",
      "memory": "http://localhost:3000/api/agents/claude-code-abc123/memory",
      "tasks": "http://localhost:3000/api/agents/claude-code-abc123/tasks",
      "files": "http://localhost:3000/api/agents/claude-code-abc123/files"
    },
    "expiresAt": "2025-07-19T18:00:00.000Z"
  }
}
```

#### Get Agent Information
```http
GET /api/agents/{agentId}
```

**Description**: Get detailed information about a specific agent

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "claude-code-abc123",
    "status": "active",
    "lastSeen": "2025-07-18T18:00:00.000Z",
    "uptime": 3600,
    "projectId": "abc123",
    "agentType": "claude-code",
    "environment": {
      "platform": "darwin",
      "os": "Darwin 23.5.0",
      "hostname": "macbook-pro-5.lan",
      "workingDirectory": "/path/to/project",
      "gitBranch": "main"
    },
    "capabilities": {
      "tools": ["file", "bash", "search", "edit", "git"],
      "languages": ["javascript", "typescript", "python"],
      "canExecuteCode": true,
      "canAccessInternet": true
    },
    "stats": {
      "tasksCompleted": 25,
      "filesModified": 12,
      "memoryUsage": 45,
      "errors": 2
    }
  }
}
```

#### List Project Agents
```http
GET /api/agents?projectId={projectId}
```

**Description**: List all agents in a project with coordination status

**Response**:
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "agentId": "claude-code-abc123",
        "agentType": "claude-code",
        "status": "active",
        "currentTask": "Implementing feature X",
        "fileLocks": ["src/app.js"]
      },
      {
        "agentId": "cursor-def456",
        "agentType": "cursor",
        "status": "active",
        "currentTask": "Code completion",
        "fileLocks": ["src/utils.js"]
      }
    ],
    "coordination": {
      "totalAgents": 2,
      "activeAgents": 2,
      "busyAgents": 0,
      "conflictedFiles": [],
      "recommendations": [
        "Multiple agents active - consider coordination"
      ]
    }
  }
}
```

#### Unregister Agent
```http
DELETE /api/agents/{agentId}
```

**Description**: Unregister an agent from the system

**Response**:
```json
{
  "success": true,
  "message": "Agent unregistered successfully",
  "data": {
    "agentId": "claude-code-abc123",
    "unregisteredAt": "2025-07-18T18:00:00.000Z"
  }
}
```

### 📁 Project Management

#### Auto-Register Project
```http
POST /api/projects/auto-register
```

**Description**: Auto-register project from git repository

**Request Body**:
```json
{
  "workingDirectory": "/path/to/project",
  "createIfNotExists": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "project": {
      "_id": "abc123",
      "name": "my-project",
      "description": "Auto-generated project for my-project",
      "gitInfo": {
        "remoteUrl": "https://github.com/user/my-project.git",
        "repoName": "my-project",
        "branch": "main",
        "commit": "abc123",
        "isGitRepo": true,
        "rootPath": "/path/to/project"
      },
      "metadata": {
        "language": "javascript",
        "framework": "next.js",
        "packageManager": "npm"
      },
      "settings": {
        "autoIndex": true,
        "allowMultipleAgents": true,
        "defaultBranch": "main"
      }
    },
    "isNewProject": true
  }
}
```

#### Get Project Info
```http
GET /api/projects/auto-register?workingDirectory={path}
```

**Description**: Get project information without creating

**Response**:
```json
{
  "success": true,
  "data": {
    "gitInfo": {
      "remoteUrl": "https://github.com/user/my-project.git",
      "repoName": "my-project",
      "branch": "main",
      "commit": "abc123",
      "isGitRepo": true
    },
    "projectId": "abc123",
    "metadata": {
      "language": "javascript",
      "framework": "next.js"
    },
    "projectExists": false
  }
}
```

### 💾 Memory Management

#### Get Agent Memories
```http
GET /api/agents/{agentId}/memory
```

**Query Parameters**:
- `type`: Filter by memory type (episodic, semantic, procedural)
- `limit`: Maximum number of memories (default: 50)
- `since`: ISO date string to filter memories after this date

**Response**:
```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "1",
        "type": "episodic",
        "content": "Implemented agent registration system",
        "context": {
          "files": ["app/api/agents/register/route.ts"],
          "operation": "create",
          "outcome": "success"
        },
        "importance": 9,
        "timestamp": "2025-07-18T18:00:00.000Z",
        "tags": ["implementation", "api", "registration"]
      }
    ],
    "summary": {
      "totalMemories": 25,
      "lastSession": "2025-07-18T17:00:00.000Z",
      "workingDirectory": "/path/to/project",
      "recentFiles": ["app/api/agents/register/route.ts"],
      "keyInsights": ["Agent registration system is functional"]
    },
    "context": {
      "projectId": "abc123",
      "agentId": "claude-code-abc123",
      "sessionId": "session-123456",
      "startTime": "2025-07-18T18:00:00.000Z",
      "previousSessions": 3
    }
  }
}
```

#### Store Memory
```http
POST /api/agents/{agentId}/memory
```

**Request Body**:
```json
{
  "type": "episodic",
  "content": "Implemented new feature X",
  "context": {
    "files": ["src/feature.js"],
    "operation": "create",
    "outcome": "success"
  },
  "importance": 8,
  "tags": ["feature", "implementation"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "123",
    "type": "episodic",
    "content": "Implemented new feature X",
    "context": {
      "files": ["src/feature.js"],
      "operation": "create",
      "outcome": "success"
    },
    "importance": 8,
    "timestamp": "2025-07-18T18:00:00.000Z",
    "tags": ["feature", "implementation"]
  }
}
```

### 🔒 File Locking

#### File Operations
```http
POST /api/agents/{agentId}/files
```

**Request Body**:
```json
{
  "operation": "lock",
  "filePath": "src/app.js",
  "lockType": "write",
  "reason": "Implementing feature X",
  "duration": 300
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "lock": {
      "agentId": "claude-code-abc123",
      "filePath": "src/app.js",
      "lockType": "write",
      "acquiredAt": "2025-07-18T18:00:00.000Z",
      "expiresAt": "2025-07-18T18:05:00.000Z",
      "reason": "Implementing feature X"
    },
    "canProceed": true,
    "message": "File locked successfully for 300 seconds"
  }
}
```

#### Get Agent File Locks
```http
GET /api/agents/{agentId}/files
```

**Response**:
```json
{
  "success": true,
  "data": {
    "locks": [
      {
        "agentId": "claude-code-abc123",
        "filePath": "src/app.js",
        "lockType": "write",
        "acquiredAt": "2025-07-18T18:00:00.000Z",
        "expiresAt": "2025-07-18T18:05:00.000Z"
      }
    ],
    "message": "Found 1 active locks for agent claude-code-abc123"
  }
}
```

### 📚 Documentation

#### Get System Explanation
```http
GET /api/explain
```

**Description**: Get overview of the multi-agent system

**Response**:
```json
{
  "title": "Mech AI Multi-Agent System",
  "description": "A comprehensive system for managing multiple AI agents working on the same project",
  "availableTopics": [
    {
      "topic": "agents",
      "description": "Agent registration, coordination, and management",
      "endpoint": "/api/explain?topic=agents"
    },
    {
      "topic": "projects",
      "description": "Auto-project detection and registration from git repositories",
      "endpoint": "/api/explain?topic=projects"
    }
  ],
  "quickStart": {
    "title": "Quick Start Guide",
    "steps": [
      "1. Navigate to any git repository",
      "2. Run: node .claude/hooks/agent-register.cjs",
      "3. Project is auto-detected and agent registered"
    ]
  }
}
```

#### Get Topic Explanation
```http
GET /api/explain?topic={topic}
```

**Available Topics**: `agents`, `projects`, `memory`, `files`, `sessions`, `coordination`

**Response**: Detailed explanation of the specified topic including endpoints, concepts, and workflows.

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., file already locked)
- `500 Internal Server Error`: Server-side error

## Rate Limiting

- Agent registration: 10 requests per minute
- Memory operations: 100 requests per minute
- File operations: 50 requests per minute

## Webhooks

Configure webhook URLs in agent registration to receive real-time updates:

- `agent.status.changed`: Agent status updates
- `file.lock.acquired`: File lock notifications
- `memory.stored`: Memory storage events
- `project.updated`: Project information changes

## SDKs and Tools

### Command Line Tools

```bash
# Check project info
node .claude/hooks/project-info.cjs

# Check agent status
node .claude/hooks/agent-status.cjs

# Register agent
node .claude/hooks/agent-register.cjs

# Reset agents
node .claude/hooks/agent-reset.cjs --cleanup
```

### Environment Variables

```bash
# Override default endpoints
export MECH_API_ENDPOINT="http://localhost:3000/api/agents"
export MECH_PROJECT_API_ENDPOINT="http://localhost:3000/api/projects/auto-register"

# Session identification
export CLAUDE_SESSION_ID="custom-session-id"
```

## Examples

### Complete Agent Registration Flow

```bash
# 1. Check project info
curl "http://localhost:3000/api/projects/auto-register?workingDirectory=$(pwd)"

# 2. Register agent
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "claude-code",
    "agentVersion": "1.0.0",
    "environment": {
      "platform": "darwin",
      "workingDirectory": "/path/to/project"
    },
    "capabilities": {
      "tools": ["file", "bash", "edit"],
      "canExecuteCode": true
    }
  }'

# 3. Check coordination status
curl "http://localhost:3000/api/agents?projectId=abc123"

# 4. Store memory
curl -X POST http://localhost:3000/api/agents/claude-code-abc123/memory \
  -H "Content-Type: application/json" \
  -d '{
    "type": "episodic",
    "content": "Registered successfully",
    "importance": 8
  }'
```

### File Locking Example

```bash
# Lock file for writing
curl -X POST http://localhost:3000/api/agents/claude-code-abc123/files \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "lock",
    "filePath": "src/app.js",
    "lockType": "write",
    "reason": "Implementing feature"
  }'

# Check file status
curl -X POST http://localhost:3000/api/agents/claude-code-abc123/files \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "check",
    "filePath": "src/app.js"
  }'

# Unlock file
curl -X POST http://localhost:3000/api/agents/claude-code-abc123/files \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "unlock",
    "filePath": "src/app.js"
  }'
```

For more examples and detailed usage, see the `/api/explain` endpoint or visit the documentation at `/docs`.