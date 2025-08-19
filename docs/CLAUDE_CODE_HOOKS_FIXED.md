# Claude Code Hooks Integration - Fixed Implementation

## Overview

This document describes the fixes implemented to make the Claude Code hooks system work properly with the Mech AI backend.

## Issues Fixed

### 1. Wrong API Endpoints
- **Problem**: Hooks were trying to hit `/api/claude-hooks` but backend uses `/api/v2/claude`
- **Solution**: Updated all hook scripts to use correct API endpoints

### 2. Wrong Port Configuration
- **Problem**: Hooks were configured for port 5500 but backend runs on port 3001
- **Solution**: Updated default port to 3001 in all scripts

### 3. Missing SessionStart Hook
- **Problem**: The `settings.toml` had no SessionStart hook configured
- **Solution**: Added SessionStart hook configuration

### 4. Tool Name Mismatch
- **Problem**: Hooks were configured for old tool names (`str_replace_editor`) instead of current ones (`Edit`, `Write`, etc.)
- **Solution**: Updated tool names in settings.toml

### 5. Missing Agent Management Scripts
- **Problem**: Referenced scripts like `agent-status.cjs` didn't exist
- **Solution**: Created all missing scripts:
  - `agent-register.cjs` - Registers new agents
  - `agent-status.cjs` - Checks agent status
  - `agent-reset.cjs` - Manages agent cleanup
  - `view-memories.cjs` - Views stored memories
  - `project-info.cjs` - Shows project information

### 6. Project Auto-Registration
- **Problem**: System expected manual project creation
- **Solution**: Implemented auto-registration that:
  - Detects git repository information
  - Auto-registers project on first use
  - Reuses existing projects based on git remote URL

## Current Working System

### Registration Flow

1. **SessionStart Hook** triggers automatically (when Claude Code fixes hook issues)
2. **Manual Registration** available via:
   ```bash
   node .claude/hooks/agent-register.cjs
   # or
   ./.claude/hooks/mech-cli.sh register
   ```

3. **Registration Process**:
   - Auto-detects git repository
   - Registers/finds project in backend
   - Creates new agent with proper schema
   - Stores agent ID locally
   - Sends initial heartbeat

### Available Commands

Using the CLI helper:
```bash
# Register new agent
./.claude/hooks/mech-cli.sh register

# Check agent status
./.claude/hooks/mech-cli.sh status

# View project info
./.claude/hooks/mech-cli.sh info

# View memories
./.claude/hooks/mech-cli.sh memories

# Reset agents
./.claude/hooks/mech-cli.sh reset    # All agents
./.claude/hooks/mech-cli.sh clean    # Inactive only
./.claude/hooks/mech-cli.sh current  # Current session
```

### Configuration

#### Environment Variables
```bash
export MECH_UNIFIED_BACKEND_URL=http://localhost:3001
export MECH_PROJECT_ID=mech-ai  # Optional, auto-detected from git
```

#### Settings File (.claude/settings.toml)
```toml
# Session start hook
[[hooks]]
event = "SessionStart"
command = "MECH_UNIFIED_BACKEND_URL=http://localhost:3001 node ./.claude/hooks/agent-register.cjs"
timeout = 30

# Tool hooks for tracking
[[hooks]]
event = "PostToolUse"
[hooks.matcher]
tool_name = "Edit"
command = "MECH_UNIFIED_BACKEND_URL=http://localhost:3001 ./.claude/hooks/mech-progress.sh"
# ... etc
```

## Testing the System

1. **Start Backend**:
   ```bash
   cd mech-unified-backend
   npm start
   ```

2. **Register Agent**:
   ```bash
   ./.claude/hooks/mech-cli.sh register
   ```

3. **Expected Output**:
   ```
   🤖 Claude Code Agent Registration
   🔗 Backend URL: http://localhost:3001
   
   🔍 Auto-registering project...
   ✅ Project registered: mech-boilerplate
      Project ID: aHR0cHM6Ly9naXRodWIuY29t
   
   ✅ Agent registered successfully: claude-code-xxx
   💓 Heartbeat sent successfully
   ```

4. **Check Status**:
   ```bash
   ./.claude/hooks/mech-cli.sh status
   ```

## Files Created/Modified

### Created Files
- `.claude/hooks/agent-register.cjs`
- `.claude/hooks/agent-status.cjs`
- `.claude/hooks/agent-reset.cjs`
- `.claude/hooks/agent-reset-shortcut.cjs`
- `.claude/hooks/view-memories.cjs`
- `.claude/hooks/project-info.cjs`
- `.claude/hooks/mech-cli.sh`

### Modified Files
- `.claude/settings.toml` - Added SessionStart hook, fixed tool names
- `.claude/hooks/mech-progress.sh` - Updated API endpoint and port
- `.claude/hooks/mech-session-start.sh` - Updated API endpoint and port
- `.claude/hooks/mech-session-end.sh` - Updated API endpoint and port

## Notes

- The SessionStart hook may not trigger automatically due to Claude Code hook issues in 2025
- Manual registration works reliably using the CLI commands
- Backend must be running on port 3001 for the system to work
- Project auto-registration uses git remote URL as unique identifier
- Agent IDs are stored locally in `.claude/agent-registry.json`