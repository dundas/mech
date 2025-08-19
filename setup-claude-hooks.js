#!/usr/bin/env node

/**
 * Claude Code Hooks Automated Setup Script
 * 
 * This script automatically configures Claude Code hooks for your project.
 * Run this whenever you start a new Claude Code session.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(50)}`, colors.cyan);
  log(title, colors.bright + colors.cyan);
  log('='.repeat(50) + '\n', colors.cyan);
}

// Default hook script template
const hookScriptTemplate = `#!/usr/bin/env node

/**
 * Claude Code Hook Handler for Mech AI
 * Processes various Claude Code events and sends them to the backend
 */

const fs = require('fs');
const http = require('http');

// Configuration
const BACKEND_URL = process.env.MECH_BACKEND_URL || 'http://localhost:3001';
const PROJECT_ID = process.env.MECH_PROJECT_ID || 'mech-ai';
const LOG_FILE = path.join(__dirname, '../../hook.log');

// Parse command line arguments
const [eventType, toolName, ...args] = process.argv.slice(2);
const additionalInfo = args.join(' ');

// Read input from stdin
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = input ? JSON.parse(input) : {};
    processHook(data);
  } catch (error) {
    logToFile(\`Error parsing input: \${error.message}\`);
    // Return success to not block Claude Code
    console.log(JSON.stringify({
      decision: 'approve',
      continue: true
    }));
    process.exit(0);
  }
});

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logEntry = \`[\${timestamp}] \${message}\\n\`;
  fs.appendFileSync(LOG_FILE, logEntry);
}

function processHook(data) {
  // Log the hook trigger
  logToFile(\`Hook triggered: \${eventType} - \${toolName} - \${additionalInfo}\`);
  
  // Map UserPromptSubmit to Message for backend compatibility
  const mappedEventType = eventType === 'UserPromptSubmit' ? 'Message' : eventType;
  
  // Prepare payload
  const payload = {
    eventType: mappedEventType,
    toolName,
    additionalInfo,
    projectId: PROJECT_ID,
    sessionId: data.agent?.id || 'unknown',
    agentName: data.agent?.name || 'claude-code',
    timestamp: new Date().toISOString(),
    data: {
      ...data,
      files: data.files || [],
      tool: data.tool || {},
      prompt: data.prompt || additionalInfo
    }
  };
  
  // Skip sending to backend if it's a test event
  if (eventType === 'test') {
    console.log(JSON.stringify({
      decision: 'approve',
      reason: 'Test hook executed successfully'
    }));
    process.exit(0);
  }
  
  // Send to backend
  const url = new URL(\`\${BACKEND_URL}/api/claude/hook\`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        logToFile(\`✅ Hook sent successfully: \${eventType} - \${toolName}\`);
      } else {
        logToFile(\`❌ Hook failed: \${res.statusCode} - \${responseData}\`);
      }
      
      // Always approve to not block Claude Code
      console.log(JSON.stringify({
        decision: 'approve',
        continue: true
      }));
      process.exit(0);
    });
  });
  
  req.on('error', (error) => {
    logToFile(\`❌ Hook network error: \${error.message}\`);
    // Still approve on error to not block Claude Code
    console.log(JSON.stringify({
      decision: 'approve',
      continue: true
    }));
    process.exit(0);
  });
  
  req.write(JSON.stringify(payload));
  req.end();
}

// Handle timeout
setTimeout(() => {
  logToFile('Hook timeout - approving to continue');
  console.log(JSON.stringify({
    decision: 'approve',
    continue: true
  }));
  process.exit(0);
}, 5000);
`;

// Settings.json template
const settingsTemplate = {
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PostToolUse Write $CLAUDE_FILE_PATH",
          "timeout": 30000
        }]
      },
      {
        "matcher": "Edit",
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PostToolUse Edit $CLAUDE_FILE_PATH",
          "timeout": 30000
        }]
      },
      {
        "matcher": "MultiEdit",
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PostToolUse MultiEdit $CLAUDE_FILE_PATH",
          "timeout": 30000
        }]
      },
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PostToolUse Bash \"$CLAUDE_COMMAND\"",
          "timeout": 60000
        }]
      },
      {
        "matcher": "Read",
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PostToolUse Read $CLAUDE_FILE_PATH",
          "timeout": 30000
        }]
      },
      {
        "matcher": "Task",
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PostToolUse Task \"$CLAUDE_TASK_DESCRIPTION\"",
          "timeout": 60000
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PreToolUse Write $CLAUDE_FILE_PATH",
          "timeout": 10000
        }]
      },
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PreToolUse Bash \"$CLAUDE_COMMAND\"",
          "timeout": 10000
        }]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js UserPromptSubmit prompt \"$CLAUDE_USER_PROMPT\"",
          "timeout": 10000
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js Stop session ''",
          "timeout": 30000
        }]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js SubagentStop subagent ''",
          "timeout": 30000
        }]
      }
    ],
    "Notification": [
      {
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js Notification notification \"$CLAUDE_NOTIFICATION\"",
          "timeout": 10000
        }]
      }
    ],
    "PreCompact": [
      {
        "hooks": [{
          "type": "command",
          "command": "MECH_BACKEND_URL=${BACKEND_URL} node .claude/hooks/mech-hook.js PreCompact compact ''",
          "timeout": 30000
        }]
      }
    ]
  }
};

// Main setup function
async function setupClaudeHooks() {
  log('🚀 Claude Code Hooks Setup\n', colors.bright + colors.magenta);
  
  // Get configuration
  const backendUrl = process.env.MECH_BACKEND_URL || 'http://localhost:3001';
  const projectId = process.env.MECH_PROJECT_ID || path.basename(process.cwd());
  
  logSection('Configuration');
  log(`Backend URL: ${backendUrl}`);
  log(`Project ID: ${projectId}`);
  log(`Working Directory: ${process.cwd()}`);
  
  // Step 1: Create directory structure
  logSection('Creating directory structure');
  const claudeDir = path.join(process.cwd(), '.claude');
  const hooksDir = path.join(claudeDir, 'hooks');
  
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
    log('✅ Created .claude directory', colors.green);
  } else {
    log('✅ .claude directory exists', colors.green);
  }
  
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
    log('✅ Created hooks directory', colors.green);
  } else {
    log('✅ Hooks directory exists', colors.green);
  }
  
  // Step 2: Create or update hook script
  logSection('Setting up hook script');
  const hookScriptPath = path.join(hooksDir, 'mech-hook.js');
  const hookScriptContent = hookScriptTemplate.replace(/\${BACKEND_URL}/g, backendUrl);
  
  // Backup existing hook script if it exists
  if (fs.existsSync(hookScriptPath)) {
    const backupPath = `${hookScriptPath}.backup-${Date.now()}`;
    fs.copyFileSync(hookScriptPath, backupPath);
    log(`📁 Backed up existing hook script to: ${path.basename(backupPath)}`, colors.yellow);
  }
  
  fs.writeFileSync(hookScriptPath, hookScriptContent);
  fs.chmodSync(hookScriptPath, '755');
  log('✅ Created/updated mech-hook.js with execute permissions', colors.green);
  
  // Step 3: Create or update settings.json
  logSection('Setting up settings.json');
  const settingsPath = path.join(claudeDir, 'settings.json');
  
  // Replace ${BACKEND_URL} in settings template
  const settingsContent = JSON.stringify(settingsTemplate, null, 2)
    .replace(/\${BACKEND_URL}/g, backendUrl);
  
  // Backup existing settings if they exist
  if (fs.existsSync(settingsPath)) {
    const backupPath = `${settingsPath}.backup-${Date.now()}`;
    fs.copyFileSync(settingsPath, backupPath);
    log(`📁 Backed up existing settings to: ${path.basename(backupPath)}`, colors.yellow);
  }
  
  fs.writeFileSync(settingsPath, settingsContent);
  log('✅ Created/updated settings.json', colors.green);
  
  // Step 4: Clean up old files
  logSection('Cleaning up');
  
  // Remove deprecated TOML files
  const tomlFiles = [
    path.join(claudeDir, 'settings.toml'),
    path.join(process.cwd(), 'example-settings.toml')
  ];
  
  for (const tomlFile of tomlFiles) {
    if (fs.existsSync(tomlFile)) {
      fs.unlinkSync(tomlFile);
      log(`🗑️  Removed deprecated file: ${path.basename(tomlFile)}`, colors.yellow);
    }
  }
  
  // Step 5: Test the setup
  logSection('Testing setup');
  
  try {
    // Test hook script
    const testResult = execSync(
      `echo '{"event":"test","agent":{"name":"test"}}' | node ${hookScriptPath} test test test`,
      { encoding: 'utf8' }
    );
    
    const result = JSON.parse(testResult);
    if (result.decision === 'approve') {
      log('✅ Hook script test passed', colors.green);
    } else {
      log('⚠️  Hook script test returned unexpected result', colors.yellow);
    }
  } catch (error) {
    log('❌ Hook script test failed: ' + error.message, colors.red);
  }
  
  // Step 6: Validate settings
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const hookCount = Object.keys(settings.hooks).length;
    log(`✅ Settings validated: ${hookCount} event types configured`, colors.green);
  } catch (error) {
    log('❌ Settings validation failed: ' + error.message, colors.red);
  }
  
  // Final summary
  logSection('Setup Complete');
  log('✅ Claude Code hooks are configured and ready!', colors.green);
  log('\nNext steps:', colors.cyan);
  log('1. Ensure your backend is running at: ' + backendUrl);
  log('2. Start or restart your Claude Code session');
  log('3. Monitor hooks with: tail -f .claude/hook.log');
  log('4. Test with: node test-claude-hooks.js');
  
  // Create a quick validation script
  const validateScript = `#!/usr/bin/env node
// Quick validation script
const fs = require('fs');
const path = require('path');

console.log('🔍 Claude Hooks Status:\\n');

// Check settings
if (fs.existsSync('.claude/settings.json')) {
  console.log('✅ Settings file exists');
} else {
  console.log('❌ Settings file missing');
}

// Check hook script
if (fs.existsSync('.claude/hooks/mech-hook.js')) {
  console.log('✅ Hook script exists');
} else {
  console.log('❌ Hook script missing');
}

// Check recent activity
if (fs.existsSync('.claude/hook.log')) {
  const log = fs.readFileSync('.claude/hook.log', 'utf8');
  const lines = log.split('\\n').filter(l => l);
  const recent = lines.slice(-5);
  console.log(\`\\n📊 Recent activity (last 5 entries):\`);
  recent.forEach(line => {
    if (line.includes('✅')) console.log('  ✅', line.match(/Hook sent successfully: (.+)/)?.[1] || 'Success');
    else if (line.includes('❌')) console.log('  ❌', line.match(/Hook failed: (.+?) -/)?.[1] || 'Failed');
  });
} else {
  console.log('\\n📊 No hook activity yet');
}
`;
  
  fs.writeFileSync('validate-hooks.js', validateScript);
  fs.chmodSync('validate-hooks.js', '755');
  log('\n📝 Created validate-hooks.js for quick status checks', colors.green);
}

// Run the setup
if (require.main === module) {
  setupClaudeHooks().catch(error => {
    log(`\n❌ Setup failed: ${error.message}`, colors.red);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { setupClaudeHooks };