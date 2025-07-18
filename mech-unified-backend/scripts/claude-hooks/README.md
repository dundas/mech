# Claude Code Hook Scripts

This directory contains hook scripts that integrate Claude Code with the Mech AI unified backend for comprehensive session and reasoning tracking.

## Overview

These scripts are designed to be called by Claude Code at specific points during a session to capture and store:
- Session lifecycle events
- Tool usage and reasoning
- File modifications
- Error tracking
- Performance metrics

## Hook Scripts

### 1. `session-start.js`
**Called when:** A new Claude Code session begins
**Purpose:** Registers the session with the unified backend

**Environment Variables:**
- `MECH_UNIFIED_BACKEND_URL` - Backend URL (default: http://localhost:3001)
- `MECH_PROJECT_ID` - Project identifier (default: mech-ai)
- `CLAUDE_VERSION` - Claude version
- `CLAUDE_MODEL` - Claude model being used
- `GITHUB_TOKEN` - GitHub token availability
- `MECH_API_KEY` - Mech API key availability
- `OPENAI_API_KEY` - OpenAI API key availability

**Output:** Creates session in backend and stores session info in temp file

### 2. `pre-tool-use.js`
**Called when:** Before Claude uses any tool
**Purpose:** Captures tool selection reasoning and decision process

**Environment Variables:**
- `CLAUDE_TOOL_NAME` - Name of the tool being used
- `CLAUDE_TOOL_INPUT` - JSON string of tool input
- `CLAUDE_REASONING` - Reasoning behind tool selection

**Output:** Logs pre-tool event and stores reasoning step

### 3. `post-tool-use.js`
**Called when:** After Claude uses any tool
**Purpose:** Captures tool output, results, and file modifications

**Environment Variables:**
- `CLAUDE_TOOL_NAME` - Name of the tool used
- `CLAUDE_TOOL_OUTPUT` - JSON string of tool output
- `CLAUDE_TOOL_SUCCESS` - Boolean indicating tool success
- `CLAUDE_TOOL_ERROR` - Error message if tool failed
- `CLAUDE_TOOL_EXECUTION_TIME` - Tool execution time in milliseconds

**Output:** Logs post-tool event, stores reasoning step, updates session statistics

### 4. `session-stop.js`
**Called when:** Claude Code session ends
**Purpose:** Closes session and provides summary statistics

**Environment Variables:**
- `CLAUDE_STOP_REASON` - Reason for session ending
- `CLAUDE_SESSION_SUMMARY` - Session summary

**Output:** Ends session in backend, shows final statistics, cleans up temp files

## Setup and Configuration

### 1. Environment Variables
Create a `.env` file in your project root:

```bash
# Backend Configuration
MECH_UNIFIED_BACKEND_URL=http://localhost:3001
MECH_PROJECT_ID=your-project-id

# API Keys
GITHUB_TOKEN=your-github-token
MECH_API_KEY=your-mech-api-key
OPENAI_API_KEY=your-openai-api-key

# Claude Configuration
CLAUDE_VERSION=1.0.0
CLAUDE_MODEL=claude-3-opus
```

### 2. Claude Code Configuration
Configure Claude Code to use these hooks by setting up hook scripts in your Claude Code settings:

```json
{
  "hooks": {
    "sessionStart": "node scripts/claude-hooks/session-start.js",
    "preToolUse": "node scripts/claude-hooks/pre-tool-use.js",
    "postToolUse": "node scripts/claude-hooks/post-tool-use.js",
    "sessionStop": "node scripts/claude-hooks/session-stop.js"
  }
}
```

### 3. Make Scripts Executable
```bash
chmod +x scripts/claude-hooks/*.js
```

## API Endpoints Used

The hooks interact with these unified backend endpoints:

- `POST /api/v2/sessions/start` - Register new session
- `PATCH /api/v2/sessions/{sessionId}/state` - Update session state
- `POST /api/v2/sessions/{sessionId}/end` - End session
- `GET /api/v2/sessions/{sessionId}/stats` - Get session statistics
- `POST /api/v2/claude/hook` - Log hook events
- `POST /api/v2/reasoning` - Store reasoning steps

## Data Flow

1. **Session Start**: Creates session record with agent info, environment, and metadata
2. **Pre-Tool Use**: Captures reasoning and tool selection decisions
3. **Post-Tool Use**: Records tool results, file modifications, and updates statistics
4. **Session Stop**: Finalizes session with summary and cleanup

## Troubleshooting

### Common Issues

1. **Backend not reachable**: Check `MECH_UNIFIED_BACKEND_URL` and ensure the unified backend is running
2. **Missing session info**: Ensure `session-start.js` ran successfully and created the temp file
3. **Permission errors**: Make sure scripts are executable (`chmod +x`)
4. **Environment variables not set**: Check `.env` file and variable names

### Debug Mode
Set `DEBUG=1` to enable verbose logging:
```bash
DEBUG=1 node scripts/claude-hooks/session-start.js
```

### Manual Testing
You can test the hooks manually:
```bash
# Test session start
node scripts/claude-hooks/session-start.js

# Test with environment variables
CLAUDE_TOOL_NAME=read_file CLAUDE_TOOL_INPUT='{"path":"test.txt"}' node scripts/claude-hooks/pre-tool-use.js
```

## Security Notes

- Hook scripts communicate with the backend over HTTP/HTTPS
- API keys and tokens are passed via environment variables
- Session information is temporarily stored in OS temp directory
- No sensitive data is logged to console output
- All API communications include request IDs for tracking

## Monitoring

The unified backend provides comprehensive logging and monitoring:
- All hook events are logged with structured metadata
- Session statistics are tracked in real-time
- Error handling and recovery mechanisms
- Performance metrics for tool usage and reasoning

For more information about the unified backend API, see the main project documentation.