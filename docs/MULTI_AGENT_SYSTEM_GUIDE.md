# Mech AI Multi-Agent System - Complete Guide

## 🎯 Overview

The Mech AI Multi-Agent System enables multiple AI agents (Claude Code, Cursor, GitHub Copilot, etc.) to work collaboratively on the same project without conflicts. It provides automatic project detection, session isolation, file locking, and memory persistence.

## 🚀 Quick Start

### 1. Navigate to Your Project
```bash
cd /path/to/your/project
```

### 2. Check Project Info
```bash
node .claude/hooks/project-info.cjs
```

### 3. Register Agent
```bash
node .claude/hooks/agent-register.cjs
```

### 4. Check Status
```bash
node .claude/hooks/agent-status.cjs
```

That's it! Your agent is now registered and ready to work with full context persistence.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mech AI Multi-Agent System                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Claude    │  │   Cursor    │  │   GitHub    │            │
│  │   Code #1   │  │             │  │   Copilot   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          │                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Claude    │  │ Coordination│  │    File     │            │
│  │   Code #2   │  │   Service   │  │   Locking   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Project Database                      │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │   │
│  │  │   Agent     │ │   Memory    │ │   Project   │      │   │
│  │  │ Registry    │ │   Storage   │ │Information  │      │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### 1. **Agent Management**
- **Registration**: Auto-detects project and registers agents
- **Session Isolation**: Each agent instance gets unique session ID
- **Coordination**: Tracks multiple agents working simultaneously
- **Status Monitoring**: Real-time agent status and heartbeat

### 2. **Project Detection**
- **Git Integration**: Automatically reads git repository information
- **Project ID Generation**: Creates consistent IDs from git remote URL
- **Metadata Detection**: Identifies language, framework, package manager
- **Auto-Creation**: Creates projects on first agent registration

### 3. **Memory System**
- **Episodic Memory**: Specific events and actions taken
- **Semantic Memory**: General knowledge and patterns learned
- **Procedural Memory**: Step-by-step processes and procedures
- **Context Persistence**: Maintains memory across sessions

### 4. **File Locking**
- **Read Locks**: Multiple agents can read simultaneously
- **Write Locks**: Only one agent can write at a time
- **Exclusive Locks**: Complete file isolation for critical operations
- **Automatic Expiration**: Locks expire to prevent deadlocks

### 5. **Session Management**
- **Unique Sessions**: Each Claude Code terminal gets own session
- **Local Registry**: Tracks all sessions in project directory
- **Session Cleanup**: Automatic cleanup of inactive sessions
- **Reset Capabilities**: Clean reset of agent state

## 🛠️ Available Tools

### Command Line Utilities

| Tool | Description | Example |
|------|-------------|---------|
| `project-info.cjs` | Show project auto-detection info | `node .claude/hooks/project-info.cjs` |
| `agent-register.cjs` | Register agent with system | `node .claude/hooks/agent-register.cjs` |
| `agent-status.cjs` | Show all agents in project | `node .claude/hooks/agent-status.cjs` |
| `agent-reset.cjs` | Reset/cleanup agents | `node .claude/hooks/agent-reset.cjs --cleanup` |
| `agent-reset-shortcut.cjs` | Quick reset commands | `node .claude/hooks/agent-reset-shortcut.cjs clean` |
| `memory-store.cjs` | Store agent memories | `node .claude/hooks/memory-store.cjs` |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/register` | POST | Register new agent |
| `/api/agents/{id}` | GET | Get agent info |
| `/api/agents/{id}` | DELETE | Unregister agent |
| `/api/agents` | GET | List project agents |
| `/api/agents/{id}/memory` | GET/POST | Memory operations |
| `/api/agents/{id}/files` | GET/POST | File locking |
| `/api/projects/auto-register` | POST/GET | Project detection |
| `/api/explain` | GET | System documentation |

## 📋 Common Workflows

### Scenario 1: Single Agent Development
```bash
# 1. Start working on project
cd /path/to/project

# 2. Register agent (auto-detects project)
node .claude/hooks/agent-register.cjs

# 3. Work normally - context is automatically saved
# ... development work ...

# 4. When done, optionally reset
node .claude/hooks/agent-reset-shortcut.cjs current
```

### Scenario 2: Multiple Claude Code Sessions
```bash
# Terminal 1
cd /path/to/project
node .claude/hooks/agent-register.cjs
# Agent registered: claude-code-abc123 (session-1)

# Terminal 2 (same project)
cd /path/to/project
node .claude/hooks/agent-register.cjs
# Agent registered: claude-code-def456 (session-2)

# Check both agents
node .claude/hooks/agent-status.cjs
# Shows both sessions working on same project
```

### Scenario 3: Mixed Agent Types
```bash
# Claude Code
node .claude/hooks/agent-register.cjs

# Cursor (hypothetical registration)
curl -X POST http://localhost:3000/api/agents/register \
  -d '{"agentType":"cursor","projectId":"auto-detected"}'

# GitHub Copilot (hypothetical registration)
curl -X POST http://localhost:3000/api/agents/register \
  -d '{"agentType":"github-copilot","projectId":"auto-detected"}'

# Check coordination
curl "http://localhost:3000/api/agents?projectId=auto-detected"
```

### Scenario 4: File Conflict Resolution
```bash
# Agent 1 locks file
curl -X POST http://localhost:3000/api/agents/claude-code-abc123/files \
  -d '{"operation":"lock","filePath":"src/app.js","lockType":"write"}'

# Agent 2 tries to lock same file
curl -X POST http://localhost:3000/api/agents/cursor-def456/files \
  -d '{"operation":"lock","filePath":"src/app.js","lockType":"write"}'
# Returns conflict error with details

# Agent 2 checks when file will be available
curl -X POST http://localhost:3000/api/agents/cursor-def456/files \
  -d '{"operation":"check","filePath":"src/app.js"}'
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Agent Registration Fails
```bash
# Check if project is detected
node .claude/hooks/project-info.cjs

# Check if API server is running
curl http://localhost:3000/api/explain

# Check git repository status
git status
git remote -v
```

#### 2. Multiple Sessions Conflicting
```bash
# Check all sessions
node .claude/hooks/agent-status.cjs

# Clean up inactive sessions
node .claude/hooks/agent-reset-shortcut.cjs clean

# Reset all if needed
node .claude/hooks/agent-reset-shortcut.cjs reset
```

#### 3. File Locking Issues
```bash
# Check current locks
curl http://localhost:3000/api/agents/claude-code-abc123/files

# Force unlock (if agent crashed)
curl -X POST http://localhost:3000/api/agents/claude-code-abc123/files \
  -d '{"operation":"unlock","filePath":"src/app.js"}'
```

#### 4. Memory Not Persisting
```bash
# Check memory endpoint
curl http://localhost:3000/api/agents/claude-code-abc123/memory

# Manually store memory
node .claude/hooks/memory-store.cjs
```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=mech:*
node .claude/hooks/agent-register.cjs
```

### Log Files

Check system logs:
```bash
# Frontend logs
tail -f mech-ai/frontend/.next/standalone/server.log

# Agent registry
cat .claude/agent-registry.json

# Session files
ls -la .claude/agent-id-*
```

## 📊 Monitoring

### Agent Status Dashboard
```bash
# Real-time status
watch -n 5 'node .claude/hooks/agent-status.cjs'

# Project coordination
watch -n 5 'curl -s "http://localhost:3000/api/agents?projectId=abc123" | jq .data.coordination'
```

### Memory Usage Tracking
```bash
# Memory summary
curl -s "http://localhost:3000/api/agents/claude-code-abc123/memory" | jq .data.summary

# Recent memories
curl -s "http://localhost:3000/api/agents/claude-code-abc123/memory?limit=5" | jq .data.memories
```

### File Lock Monitoring
```bash
# All locks for agent
curl -s "http://localhost:3000/api/agents/claude-code-abc123/files" | jq .data.locks

# Project-wide lock status
curl -s "http://localhost:3000/api/agents?projectId=abc123" | jq .data.coordination.conflictedFiles
```

## 🔒 Security

### Authentication
- Agents receive JWT tokens on registration
- Tokens expire after 24 hours
- Workspace isolation prevents cross-project access

### File Access Control
- Agents can only access files in their workspace
- Restricted paths prevent access to system files
- File locks prevent concurrent modification conflicts

### Memory Isolation
- Each agent has separate memory space
- Memory is scoped to project and agent
- No cross-agent memory access

## 🚀 Advanced Features

### Custom Agent Types
```javascript
// Register custom agent type
const customAgent = {
  agentType: 'custom-ai',
  agentVersion: '1.0.0',
  capabilities: {
    tools: ['custom-tool', 'analysis'],
    languages: ['rust', 'go'],
    canExecuteCode: false,
    canAccessInternet: true
  }
};

fetch('/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(customAgent)
});
```

### Webhook Integration
```javascript
// Register with webhook
const agentWithWebhook = {
  agentType: 'claude-code',
  communication: {
    protocol: 'rest',
    pollInterval: 30000,
    webhookUrl: 'https://your-server.com/webhook'
  }
};
```

### Memory Queries
```bash
# Get semantic memories only
curl "http://localhost:3000/api/agents/claude-code-abc123/memory?type=semantic&limit=10"

# Get memories since yesterday
curl "http://localhost:3000/api/agents/claude-code-abc123/memory?since=2025-07-17T00:00:00Z"

# Get high-importance memories
curl "http://localhost:3000/api/agents/claude-code-abc123/memory?importance=8"
```

## 📈 Performance

### Optimization Tips
1. **Regular Cleanup**: Use `agent-reset-shortcut.cjs clean` regularly
2. **Memory Limits**: Set appropriate memory limits in agent config
3. **File Lock Timeouts**: Use shorter lock durations when possible
4. **Session Management**: Don't run too many concurrent sessions

### Scaling Considerations
- Database: Consider MongoDB for production deployments
- Load Balancing: Use nginx for multiple frontend instances
- Caching: Redis for memory and session caching
- Monitoring: OpenTelemetry for observability

## 🔄 Migration Guide

### From Single Agent to Multi-Agent
```bash
# 1. Backup existing agent data
cp .claude/agent-id.txt .claude/agent-id.backup

# 2. Reset to clean state
node .claude/hooks/agent-reset-shortcut.cjs reset

# 3. Register with new system
node .claude/hooks/agent-register.cjs

# 4. Verify multi-agent support
node .claude/hooks/agent-status.cjs
```

### From Manual to Auto-Project
```bash
# 1. Remove manual project ID
# (Edit .claude/hooks/agent-register.cjs to remove hardcoded MECH_PROJECT_ID)

# 2. Test auto-detection
node .claude/hooks/project-info.cjs

# 3. Re-register agent
node .claude/hooks/agent-register.cjs
```

## 📚 Additional Resources

- **API Documentation**: `/docs/API_DOCUMENTATION.md`
- **System Explanations**: `GET /api/explain`
- **Example Implementations**: `/docs/examples/`
- **Troubleshooting Guide**: `/docs/TROUBLESHOOTING.md`
- **Architecture Deep Dive**: `/docs/ARCHITECTURE.md`

## 🤝 Contributing

### Adding New Agent Types
1. Update `AgentRegistrationData` interface
2. Add agent type to validation
3. Implement agent-specific capabilities
4. Add documentation

### Extending Memory System
1. Add new memory types to interface
2. Implement storage/retrieval logic
3. Add memory analysis tools
4. Update documentation

### Improving Coordination
1. Add new coordination strategies
2. Implement conflict resolution algorithms
3. Add monitoring and alerting
4. Test with multiple agent types

For more details, see the contributing guidelines in `/docs/CONTRIBUTING.md`.

---

*This guide covers the complete multi-agent system. For specific use cases or advanced configurations, refer to the API documentation and system explanations available through the `/api/explain` endpoint.*