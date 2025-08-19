# Claude Code Hooks Setup Guide

## Overview

Claude Code hooks allow you to intercept and respond to various events during your Claude Code sessions. This guide provides a complete setup process and troubleshooting tips based on real-world testing.

## How Memories are Tied to Projects

Every action you take in Claude Code is automatically linked to your project through:

1. **Automatic Git Detection** - Uses your git repository to generate a unique project ID
2. **Project ID in Every Memory** - All memories include a `projectId` field
3. **Session Continuity** - Sessions maintain project context across restarts
4. **Isolated Storage** - Each project's memories are stored separately

See [Memory System Documentation](docs/MEMORY_SYSTEM_DOCUMENTATION.md) for detailed information.

## Prerequisites

- Claude Code CLI v1.0.56 or later
- Node.js installed
- Project directory (preferably a git repository)

## Quick Setup

### 1. Run the Automated Setup Script

```bash
# From your project root
node setup-claude-hooks.js
```

This script will:
- Auto-detect your project from git information
- Create the `.claude` directory structure
- Generate `settings.json` with all hook configurations
- Create or update the hook script with project linking
- Set proper permissions
- Validate the setup

### 2. Manual Setup (Alternative)

If you prefer manual setup or need to customize:

#### Create Directory Structure
```bash
mkdir -p .claude/hooks
```

#### Create Hook Script
Create `.claude/hooks/mech-hook.js` with your hook logic. Ensure it:
- Reads JSON from stdin
- Outputs JSON response to stdout
- Has execute permissions: `chmod +x .claude/hooks/mech-hook.js`

#### Create Settings File
Create `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PostToolUse Write $CLAUDE_FILE_PATH",
          "timeout": 30000
        }]
      },
      {
        "matcher": "Edit",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PostToolUse Edit $CLAUDE_FILE_PATH",
          "timeout": 30000
        }]
      },
      {
        "matcher": "MultiEdit",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PostToolUse MultiEdit $CLAUDE_FILE_PATH",
          "timeout": 30000
        }]
      },
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PostToolUse Bash \"$CLAUDE_COMMAND\"",
          "timeout": 60000
        }]
      },
      {
        "matcher": "Read",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PostToolUse Read $CLAUDE_FILE_PATH",
          "timeout": 30000
        }]
      },
      {
        "matcher": "Task",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PostToolUse Task \"$CLAUDE_TASK_DESCRIPTION\"",
          "timeout": 60000
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PreToolUse Write $CLAUDE_FILE_PATH",
          "timeout": 10000
        }]
      },
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PreToolUse Bash \"$CLAUDE_COMMAND\"",
          "timeout": 10000
        }]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js UserPromptSubmit prompt \"$CLAUDE_USER_PROMPT\"",
          "timeout": 10000
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js Stop session ''",
          "timeout": 30000
        }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js SubagentStop subagent ''",
          "timeout": 30000
        }]
      }
    ],
    "Notification": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js Notification notification \"$CLAUDE_NOTIFICATION\"",
          "timeout": 10000
        }]
      }
    ],
    "PreCompact": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/mech-hook.js PreCompact compact ''",
          "timeout": 30000
        }]
      }
    ]
  }
}
```

## Hook Event Types

### Working Events
These events are confirmed to trigger correctly:

1. **PostToolUse** - Triggers after tool execution
   - ✅ Write, Edit, MultiEdit, Bash, Read, Task
   
2. **PreToolUse** - Triggers before tool execution
   - ✅ Write, Bash
   
3. **Notification** - Permission and idle notifications
   - ✅ Working

4. **SubagentStop** - When Task tool completes
   - ✅ Working

### Events with Issues
These events may require backend updates:

1. **UserPromptSubmit** - Backend expects "Message" eventType
2. **Stop** - Works but may need session context
3. **SessionStart** - Requires sessionId and projectId

## Environment Variables

### Project Identification
```bash
# Auto-detected from git (recommended)
# No action needed - automatically uses git repository info

# OR manually set project ID
export MECH_PROJECT_ID=your-project-id

# Backend URL (required)
export MECH_BACKEND_URL=http://localhost:3001
```

The project ID determines where all your memories are stored:
- **Git repos**: Automatically generates consistent ID from remote URL
- **Non-git projects**: Use `MECH_PROJECT_ID` environment variable
- **Default**: Falls back to 'mech-ai' if not specified

### Include in Hook Commands
```json
"command": "MECH_BACKEND_URL=http://localhost:3001 MECH_PROJECT_ID=my-project node .claude/hooks/mech-hook.js ..."
```

## Validation

### Check Hook Status
```bash
# Run the diagnostic script
node diagnose-hooks.js
```

### Monitor Hook Activity
```bash
# Watch hook log in real-time
tail -f .claude/hook.log
```

### Test Specific Hook
```bash
# Test a hook manually
echo '{"event":"PostToolUse","tool":{"name":"Write"}}' | node .claude/hooks/mech-hook.js PostToolUse Write test.txt
```

## Troubleshooting

### Hooks Not Triggering

1. **Check Claude Code is running in project directory**
   ```bash
   pwd  # Should show your project root
   ```

2. **Verify settings.json exists and is valid**
   ```bash
   cat .claude/settings.json | jq .  # Should parse without errors
   ```

3. **Ensure hook script has execute permissions**
   ```bash
   ls -la .claude/hooks/mech-hook.js  # Should show -rwxr-xr-x
   ```

4. **Restart Claude Code session**
   - Hooks may not load until a new session starts
   - Exit and restart Claude Code in the project directory

### Hook Failures

1. **Check hook.log for errors**
   ```bash
   grep "❌" .claude/hook.log
   ```

2. **Validate backend is running** (if required)
   ```bash
   curl http://localhost:3001/health
   ```

3. **Test hook script directly**
   ```bash
   node .claude/hooks/mech-hook.js test
   ```

## Best Practices

1. **Always use absolute paths** in hook scripts
2. **Set appropriate timeouts** - longer for network operations
3. **Handle errors gracefully** - return proper JSON responses
4. **Log to a file** for debugging
5. **Test hooks** before deploying

## Session Startup Checklist

When starting a new Claude Code session:

1. Navigate to project directory
2. Run `node validate-hooks.js` to check setup
3. Start your backend services if needed
4. Begin your Claude Code session
5. Monitor `.claude/hook.log` for activity

## Hook Response Format

Hooks should return JSON in this format:

```json
{
  "decision": "approve|block|default",
  "reason": "Optional explanation",
  "continue": true|false,
  "suppressOutput": true|false
}
```

Exit codes:
- 0: Success (continue normally)
- 2: Block execution

## Security Considerations

1. **Never log sensitive data** in hooks
2. **Validate input** from Claude Code
3. **Use environment variables** for secrets
4. **Limit hook permissions** to necessary operations

## Additional Resources

- [Official Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Hooks Guide](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)
- Test scripts: `test-claude-hooks.js`, `test-claude-hooks-integration.js`

## Quick Reference

```bash
# Setup
node setup-claude-hooks.js

# Validate
node validate-hooks.js

# Monitor
tail -f .claude/hook.log

# Test
node test-claude-hooks.js

# Diagnose
node diagnose-hooks.js
```