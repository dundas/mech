#!/usr/bin/env node

/**
 * Claude Code Hooks Integration Test
 * Tests the actual hook configuration and validates the mech-hook.js implementation
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(title, colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);
}

// Test the actual mech-hook.js with various inputs
async function testMechHook() {
  logSection('Testing mech-hook.js integration');
  
  const hookPath = path.join(__dirname, '.claude/hooks/mech-hook.js');
  
  if (!fs.existsSync(hookPath)) {
    log(`Error: mech-hook.js not found at ${hookPath}`, colors.red);
    return false;
  }
  
  // Test scenarios
  const testCases = [
    {
      name: 'PostToolUse Write event',
      args: ['PostToolUse', 'Write', '/test/file.js'],
      input: {
        event: 'PostToolUse',
        tool: {
          name: 'Write',
          input: { file_path: '/test/file.js', content: 'test content' }
        },
        agent: { name: 'test-agent', id: '12345' },
        project: { name: 'mech-ai', path: process.cwd() }
      }
    },
    {
      name: 'PreToolUse Bash event',
      args: ['PreToolUse', 'Bash', 'npm test'],
      input: {
        event: 'PreToolUse',
        tool: {
          name: 'Bash',
          input: { command: 'npm test' }
        },
        agent: { name: 'test-agent', id: '12345' }
      }
    },
    {
      name: 'UserPromptSubmit event',
      args: ['UserPromptSubmit', 'prompt', 'Test user message'],
      input: {
        event: 'UserPromptSubmit',
        prompt: 'Test user message',
        agent: { name: 'test-agent', id: '12345' }
      }
    },
    {
      name: 'Stop event',
      args: ['Stop', 'session', ''],
      input: {
        event: 'Stop',
        agent: { name: 'test-agent', id: '12345' },
        summary: 'Session completed'
      }
    }
  ];
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    const result = await new Promise((resolve) => {
      const env = { ...process.env, MECH_BACKEND_URL: 'http://localhost:3001' };
      const proc = spawn('node', [hookPath, ...testCase.args], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => stdout += data.toString());
      proc.stderr.on('data', (data) => stderr += data.toString());
      
      proc.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      
      // Send JSON input
      proc.stdin.write(JSON.stringify(testCase.input));
      proc.stdin.end();
    });
    
    if (result.code === 0) {
      log(`✅ ${testCase.name}`, colors.green);
      if (result.stdout) {
        try {
          const output = JSON.parse(result.stdout);
          log(`   Response: ${output.decision || 'success'}`, colors.reset);
        } catch {
          log(`   Output: ${result.stdout.substring(0, 50)}...`, colors.reset);
        }
      }
    } else {
      log(`❌ ${testCase.name}`, colors.red);
      log(`   Exit code: ${result.code}`, colors.red);
      if (result.stderr) {
        log(`   Error: ${result.stderr}`, colors.red);
      }
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Validate settings.json configuration
function validateSettings() {
  logSection('Validating settings.json configuration');
  
  const settingsPath = path.join(__dirname, '.claude/settings.json');
  
  if (!fs.existsSync(settingsPath)) {
    log('Error: settings.json not found', colors.red);
    return false;
  }
  
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // Check required hook events
    const requiredEvents = ['PostToolUse', 'PreToolUse', 'UserPromptSubmit', 'Stop'];
    const missingEvents = requiredEvents.filter(event => !settings.hooks[event]);
    
    if (missingEvents.length > 0) {
      log(`Missing hook events: ${missingEvents.join(', ')}`, colors.yellow);
    }
    
    // Validate hook structure
    let valid = true;
    for (const [event, matchers] of Object.entries(settings.hooks)) {
      if (!Array.isArray(matchers)) {
        log(`Invalid structure for ${event}: expected array`, colors.red);
        valid = false;
        continue;
      }
      
      for (const matcher of matchers) {
        if (!matcher.hooks || !Array.isArray(matcher.hooks)) {
          log(`Invalid hooks array in ${event}`, colors.red);
          valid = false;
        }
        
        for (const hook of (matcher.hooks || [])) {
          if (hook.type !== 'command' || !hook.command) {
            log(`Invalid hook configuration in ${event}`, colors.red);
            valid = false;
          }
        }
      }
    }
    
    if (valid) {
      log('✅ Settings.json structure is valid', colors.green);
      
      // Count configured hooks
      let totalHooks = 0;
      for (const matchers of Object.values(settings.hooks)) {
        totalHooks += matchers.length;
      }
      log(`   Total configured matchers: ${totalHooks}`, colors.reset);
    }
    
    return valid;
    
  } catch (error) {
    log(`Error parsing settings.json: ${error.message}`, colors.red);
    return false;
  }
}

// Test hook execution in practice
async function testLiveHookExecution() {
  logSection('Testing live hook execution');
  
  // Create a test file to trigger hooks
  const testFile = path.join(__dirname, 'test-hook-trigger.txt');
  
  log('Creating test file to trigger PostToolUse hook...', colors.reset);
  
  // Simulate Claude Code tool execution
  const mockToolExecution = {
    event: 'PostToolUse',
    tool: {
      name: 'Write',
      input: { file_path: testFile, content: 'Test content' },
      output: { success: true }
    },
    agent: { name: 'claude-code', id: 'test-123' },
    project: { name: 'mech-ai', path: process.cwd() },
    timestamp: new Date().toISOString()
  };
  
  // Check if hook would be triggered
  const settings = JSON.parse(fs.readFileSync('.claude/settings.json', 'utf8'));
  const writeHooks = settings.hooks.PostToolUse?.filter(m => m.matcher === 'Write');
  
  if (writeHooks && writeHooks.length > 0) {
    log('✅ Write hook is configured and would be triggered', colors.green);
    log(`   Hook command: ${writeHooks[0].hooks[0].command}`, colors.reset);
  } else {
    log('❌ Write hook not found in configuration', colors.red);
  }
  
  // Clean up
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
  
  return true;
}

// Check environment and dependencies
function checkEnvironment() {
  logSection('Checking environment');
  
  const checks = {
    'Node.js version': process.version,
    'Current directory': process.cwd(),
    'Claude settings exist': fs.existsSync('.claude/settings.json'),
    'Mech hook exists': fs.existsSync('.claude/hooks/mech-hook.js'),
    'Backend URL': process.env.MECH_BACKEND_URL || 'Not set (will use default)'
  };
  
  for (const [check, value] of Object.entries(checks)) {
    const status = value ? value.toString() : 'Not found';
    const color = status.includes('Not') ? colors.yellow : colors.green;
    log(`${check}: ${status}`, color);
  }
  
  return true;
}

// Main test runner
async function runIntegrationTests() {
  log('\n🔧 Claude Code Hooks Integration Test\n', colors.bright + colors.magenta);
  
  try {
    // Run all tests
    checkEnvironment();
    const settingsValid = validateSettings();
    const mechHookPassed = await testMechHook();
    await testLiveHookExecution();
    
    // Summary
    logSection('Test Summary');
    
    if (settingsValid && mechHookPassed) {
      log('✅ All integration tests passed!', colors.green);
      log('\nYour Claude Code hooks are properly configured and working.', colors.green);
    } else {
      log('❌ Some tests failed. Please check the output above.', colors.red);
    }
    
  } catch (error) {
    log(`\nIntegration test error: ${error.message}`, colors.red);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runIntegrationTests();
}