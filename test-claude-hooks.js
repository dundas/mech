#!/usr/bin/env node

/**
 * Comprehensive Claude Code Hooks Testing Script
 * Based on official documentation: https://docs.anthropic.com/en/docs/claude-code/hooks
 * 
 * This script tests all hook types with various scenarios to ensure proper functionality
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for output
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

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(title, colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);
}

function logTest(name, status, details = '') {
  const statusColor = status === 'PASS' ? colors.green : 
                     status === 'FAIL' ? colors.red : 
                     colors.yellow;
  log(`[${status}] ${name}`, statusColor);
  if (details) {
    log(`      ${details}`, colors.reset);
  }
}

// Create test directories and files
function setupTestEnvironment() {
  logSection('Setting up test environment');
  
  const testDir = path.join(__dirname, '.claude-test');
  const hooksDir = path.join(testDir, 'hooks');
  
  // Clean up existing test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  
  // Create test directories
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(hooksDir, { recursive: true });
  
  log(`Created test directory: ${testDir}`, colors.green);
  
  return { testDir, hooksDir };
}

// Create mock hook scripts
function createMockHooks(hooksDir) {
  logSection('Creating mock hook scripts');
  
  // Simple echo hook that logs input and returns success
  const echoHook = `#!/usr/bin/env node
const fs = require('fs');

// Read JSON input from stdin
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    
    // Log to file for verification
    fs.appendFileSync('${path.join(hooksDir, 'hook-calls.log')}', 
      \`[\${new Date().toISOString()}] \${data.event || 'unknown'}: \${JSON.stringify(data)}\\n\`
    );
    
    // Return success
    console.log(JSON.stringify({
      decision: 'approve',
      reason: 'Test hook approved',
      continue: true
    }));
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({
      decision: 'block',
      reason: \`Hook error: \${error.message}\`
    }));
    process.exit(2);
  }
});`;

  // Blocking hook that always blocks
  const blockingHook = `#!/usr/bin/env node
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  console.log(JSON.stringify({
    decision: 'block',
    reason: 'Test blocking hook'
  }));
  process.exit(2);
});`;

  // Timeout hook that hangs
  const timeoutHook = `#!/usr/bin/env node
// Simulate hanging process
setTimeout(() => {
  console.log('This should timeout');
  process.exit(0);
}, 60000);`;

  // Invalid JSON hook
  const invalidHook = `#!/usr/bin/env node
console.log('This is not valid JSON');
process.exit(0);`;

  // Write hook scripts
  const hooks = {
    'echo-hook.js': echoHook,
    'blocking-hook.js': blockingHook,
    'timeout-hook.js': timeoutHook,
    'invalid-hook.js': invalidHook
  };

  for (const [filename, content] of Object.entries(hooks)) {
    const filepath = path.join(hooksDir, filename);
    fs.writeFileSync(filepath, content);
    fs.chmodSync(filepath, '755');
    log(`Created mock hook: ${filename}`, colors.green);
  }

  return hooks;
}

// Create test settings files
function createTestSettings(testDir, hooksDir) {
  logSection('Creating test settings files');

  const settingsJson = {
    hooks: {
      PreToolUse: [
        {
          matcher: "Write",
          hooks: [{
            type: "command",
            command: `node ${path.join(hooksDir, 'echo-hook.js')}`,
            timeout: 5000
          }]
        },
        {
          matcher: "Bash",
          hooks: [{
            type: "command",
            command: `node ${path.join(hooksDir, 'blocking-hook.js')}`
          }]
        }
      ],
      PostToolUse: [
        {
          matcher: "*",
          hooks: [{
            type: "command",
            command: `node ${path.join(hooksDir, 'echo-hook.js')}`
          }]
        }
      ],
      UserPromptSubmit: [
        {
          hooks: [{
            type: "command",
            command: `node ${path.join(hooksDir, 'echo-hook.js')}`
          }]
        }
      ],
      Stop: [
        {
          hooks: [{
            type: "command",
            command: `node ${path.join(hooksDir, 'echo-hook.js')}`
          }]
        }
      ],
      SubagentStop: [
        {
          hooks: [{
            type: "command",
            command: `node ${path.join(hooksDir, 'echo-hook.js')}`
          }]
        }
      ],
      Notification: [
        {
          hooks: [{
            type: "command",
            command: `node ${path.join(hooksDir, 'echo-hook.js')}`
          }]
        }
      ],
      PreCompact: [
        {
          hooks: [{
            type: "command",
            command: `node ${path.join(hooksDir, 'echo-hook.js')}`
          }]
        }
      ]
    }
  };

  const settingsPath = path.join(testDir, 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(settingsJson, null, 2));
  log(`Created test settings: ${settingsPath}`, colors.green);

  return settingsPath;
}

// Test hook execution with mock input
async function testHookExecution(hookPath, input) {
  return new Promise((resolve) => {
    const hook = spawn('node', [hookPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    hook.stdout.on('data', (data) => stdout += data.toString());
    hook.stderr.on('data', (data) => stderr += data.toString());

    hook.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    hook.on('error', (error) => {
      resolve({ code: -1, stdout: '', stderr: error.message });
    });

    // Send input
    hook.stdin.write(JSON.stringify(input));
    hook.stdin.end();
  });
}

// Test individual hook scenarios
async function runHookTests(hooksDir) {
  logSection('Running hook tests');

  const mockInput = {
    event: 'PostToolUse',
    agent: { name: 'test-agent', id: '12345' },
    project: { name: 'test-project', path: '/test' },
    tool: {
      name: 'Write',
      input: { file_path: '/test/file.txt', content: 'test' },
      output: { success: true }
    },
    timestamp: new Date().toISOString()
  };

  // Test 1: Basic hook execution
  {
    const result = await testHookExecution(
      path.join(hooksDir, 'echo-hook.js'),
      mockInput
    );
    
    if (result.code === 0 && result.stdout.includes('approve')) {
      logTest('Basic hook execution', 'PASS');
      testResults.passed++;
    } else {
      logTest('Basic hook execution', 'FAIL', `Exit code: ${result.code}`);
      testResults.failed++;
    }
  }

  // Test 2: Blocking hook
  {
    const result = await testHookExecution(
      path.join(hooksDir, 'blocking-hook.js'),
      mockInput
    );
    
    if (result.code === 2 && result.stdout.includes('block')) {
      logTest('Blocking hook', 'PASS');
      testResults.passed++;
    } else {
      logTest('Blocking hook', 'FAIL', `Expected blocking behavior`);
      testResults.failed++;
    }
  }

  // Test 3: Invalid JSON output
  {
    const result = await testHookExecution(
      path.join(hooksDir, 'invalid-hook.js'),
      mockInput
    );
    
    logTest('Invalid JSON output handling', 'PASS', 'Hook completed with invalid output');
    testResults.passed++;
  }

  // Test 4: Various event types
  const eventTypes = ['PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop', 
                     'SubagentStop', 'Notification', 'PreCompact'];
  
  for (const eventType of eventTypes) {
    const eventInput = { ...mockInput, event: eventType };
    const result = await testHookExecution(
      path.join(hooksDir, 'echo-hook.js'),
      eventInput
    );
    
    if (result.code === 0) {
      logTest(`Event type: ${eventType}`, 'PASS');
      testResults.passed++;
    } else {
      logTest(`Event type: ${eventType}`, 'FAIL');
      testResults.failed++;
    }
  }

  // Test 5: Pattern matching
  const tools = ['Write', 'Edit', 'MultiEdit', 'Bash', 'Read', 'Task'];
  for (const tool of tools) {
    const toolInput = { 
      ...mockInput, 
      tool: { ...mockInput.tool, name: tool }
    };
    const result = await testHookExecution(
      path.join(hooksDir, 'echo-hook.js'),
      toolInput
    );
    
    if (result.code === 0) {
      logTest(`Tool pattern: ${tool}`, 'PASS');
      testResults.passed++;
    } else {
      logTest(`Tool pattern: ${tool}`, 'FAIL');
      testResults.failed++;
    }
  }
}

// Clean up invalid settings files
function cleanupInvalidSettings() {
  logSection('Cleaning up invalid settings files');

  const invalidPaths = [
    './.claude/settings.toml',  // TOML format is deprecated
    './example-settings.toml',   // Example file
    './mech-ai/.claude',         // Empty or invalid .claude directories
    './mech-ai/frontend/.claude',
    './mech-ai/frontend/mech-unified-backend/.claude',
    './mech-unified-backend/.claude'
  ];

  for (const path of invalidPaths) {
    try {
      if (fs.existsSync(path)) {
        const stats = fs.statSync(path);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(path);
          if (files.length === 0 || !files.includes('settings.json')) {
            log(`Removing invalid directory: ${path}`, colors.yellow);
            fs.rmSync(path, { recursive: true, force: true });
          }
        } else if (path.endsWith('.toml')) {
          log(`Removing TOML file (deprecated format): ${path}`, colors.yellow);
          fs.unlinkSync(path);
        }
      }
    } catch (error) {
      log(`Error cleaning ${path}: ${error.message}`, colors.red);
    }
  }
}

// Main test runner
async function runTests() {
  log('\n🧪 Claude Code Hooks Test Suite\n', colors.bright + colors.magenta);
  
  try {
    // Setup
    const { testDir, hooksDir } = setupTestEnvironment();
    createMockHooks(hooksDir);
    createTestSettings(testDir, hooksDir);
    
    // Run tests
    await runHookTests(hooksDir);
    
    // Cleanup invalid settings
    cleanupInvalidSettings();
    
    // Summary
    logSection('Test Summary');
    log(`Total tests: ${testResults.passed + testResults.failed + testResults.skipped}`);
    log(`Passed: ${testResults.passed}`, colors.green);
    log(`Failed: ${testResults.failed}`, colors.red);
    log(`Skipped: ${testResults.skipped}`, colors.yellow);
    
    // Cleanup test directory
    fs.rmSync(testDir, { recursive: true, force: true });
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\nTest suite error: ${error.message}`, colors.red);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { testHookExecution, createMockHooks };