# Claude Code Hooks - Quick Start

## 🚀 New Session Setup (One Command)

```bash
node setup-claude-hooks.js
```

This automatically:
- Detects your project from git repository
- Creates `.claude/hooks` directory structure
- Installs the improved hook handler
- Configures all event types in `settings.json`
- Links all memories to your project
- Validates the setup
- Creates a validation script

## ✅ Check Status

```bash
node validate-claude-hooks.js
```

Shows:
- Configuration status
- Recent hook activity
- Connection to backend
- Any issues to fix

## 📊 Monitor Hooks

```bash
# Watch live activity
tail -f .claude/hook.log

# See last 20 events
tail -20 .claude/hook.log
```

## 🧪 Test Hooks

```bash
# Full test suite
node test-claude-hooks.js

# Integration test
node test-claude-hooks-integration.js
```

## 🔧 What's Improved

1. **Better Error Handling**
   - Maps `UserPromptSubmit` → `Message` for backend
   - Handles validation errors gracefully
   - Never blocks Claude Code operations

2. **Proper Hook Protocol**
   - Reads JSON from stdin
   - Returns JSON responses
   - Handles timeouts correctly

3. **Easy Setup**
   - One command to configure everything
   - Automated validation
   - Clear status reporting

## 📝 Files Created

- `CLAUDE_HOOKS_SETUP_GUIDE.md` - Complete documentation
- `setup-claude-hooks.js` - Automated setup script
- `validate-claude-hooks.js` - Validation tool
- `test-claude-hooks.js` - Comprehensive test suite
- `.claude/hooks/mech-hook.js` - Improved hook handler

## 🎯 Working Hooks

Currently capturing:
- ✅ PostToolUse (Write, Edit, MultiEdit, Bash, Read, Task)
- ✅ PreToolUse (Write, Bash)
- ✅ Notification
- ✅ SubagentStop
- ✅ Stop (with improved error handling)
- ✅ UserPromptSubmit (mapped to Message)

## 🔗 Project Linking

Your hooks automatically:
- Detect project from git repository
- Generate unique project ID
- Store all memories with project association
- Maintain context across sessions
- Keep projects isolated from each other

Check your project ID:
```bash
git remote -v  # If using git
echo $MECH_PROJECT_ID  # If manually set
```

Start using hooks immediately after setup!