# Claude Code Hooks Testing Guide

## Overview
This repository includes comprehensive test scripts for Claude Code hooks based on the official documentation:
- https://docs.anthropic.com/en/docs/claude-code/hooks
- https://docs.anthropic.com/en/docs/claude-code/hooks-guide

## Test Scripts

### 1. `test-claude-hooks.js`
A comprehensive test suite that validates all hook types and scenarios:
- Creates mock hooks for testing
- Tests all event types (PreToolUse, PostToolUse, UserPromptSubmit, etc.)
- Validates JSON input/output handling
- Tests blocking hooks and error scenarios
- Cleans up invalid settings files

Run with:
```bash
node test-claude-hooks.js
```

### 2. `test-claude-hooks-integration.js`
Tests the actual Claude hook integration with your project:
- Validates settings.json configuration
- Tests the mech-hook.js implementation
- Checks environment setup
- Simulates real hook execution scenarios

Run with:
```bash
node test-claude-hooks-integration.js
```

## Settings Configuration

Claude Code now uses JSON format for settings (not TOML). The configuration is stored in `.claude/settings.json` with the following structure:

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolName",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "timeout": 30000
          }
        ]
      }
    ]
  }
}
```

## Hook Events

1. **PreToolUse** - Before tool execution (can block)
2. **PostToolUse** - After tool execution
3. **UserPromptSubmit** - When user submits a prompt
4. **Stop** - When assistant finishes responding
5. **SubagentStop** - When subagent completes
6. **Notification** - For permission requests
7. **PreCompact** - Before context compaction

## Cleaned Up Files

The following invalid/deprecated files have been removed:
- `.claude/settings.toml` (TOML format is deprecated)
- `example-settings.toml`
- Empty `.claude` directories in subprojects

## Hook Implementation

The main hook implementation is in `.claude/hooks/mech-hook.js` which:
- Receives JSON input via stdin
- Processes various event types
- Integrates with the Mech AI backend
- Returns appropriate responses for Claude Code

## Testing Your Hooks

1. **Basic functionality test**:
   ```bash
   node test-claude-hooks.js
   ```

2. **Integration test**:
   ```bash
   node test-claude-hooks-integration.js
   ```

3. **Manual hook test**:
   ```bash
   echo '{"event":"PostToolUse","tool":{"name":"Write"}}' | node .claude/hooks/mech-hook.js PostToolUse Write test.txt
   ```

## Troubleshooting

- Ensure Node.js is installed
- Check that `.claude/settings.json` exists and is valid JSON
- Verify hook scripts have execute permissions
- Check `MECH_BACKEND_URL` environment variable if using backend integration
- Review `.claude/hook.log` for execution history