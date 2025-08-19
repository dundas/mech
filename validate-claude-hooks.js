#!/usr/bin/env node

/**
 * Claude Code Hooks Validation Script
 * 
 * Comprehensive validation and status checking for Claude Code hooks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
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

// Validation checks
const checks = {
  claudeVersion: {
    name: 'Claude Code Version',
    check: () => {
      try {
        const version = execSync('claude --version', { encoding: 'utf8' }).trim();
        return { status: 'pass', message: version };
      } catch (e) {
        return { status: 'fail', message: 'Claude CLI not found in PATH' };
      }
    }
  },
  
  projectDirectory: {
    name: 'Project Directory',
    check: () => {
      const hasGit = fs.existsSync('.git');
      const hasPackageJson = fs.existsSync('package.json');
      return {
        status: hasGit || hasPackageJson ? 'pass' : 'warn',
        message: `${process.cwd()} ${hasGit ? '(git repo)' : ''}`
      };
    }
  },
  
  claudeDirectory: {
    name: '.claude Directory',
    check: () => {
      const exists = fs.existsSync('.claude');
      return {
        status: exists ? 'pass' : 'fail',
        message: exists ? 'Directory exists' : 'Directory missing - run setup-claude-hooks.js'
      };
    }
  },
  
  settingsFile: {
    name: 'Settings File',
    check: () => {
      const settingsPath = '.claude/settings.json';
      if (!fs.existsSync(settingsPath)) {
        return { status: 'fail', message: 'settings.json not found' };
      }
      
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const eventCount = Object.keys(settings.hooks || {}).length;
        
        if (eventCount === 0) {
          return { status: 'fail', message: 'No hooks configured' };
        }
        
        // Count total matchers
        let totalMatchers = 0;
        for (const events of Object.values(settings.hooks)) {
          totalMatchers += events.length;
        }
        
        return {
          status: 'pass',
          message: `${eventCount} event types, ${totalMatchers} matchers configured`
        };
      } catch (e) {
        return { status: 'fail', message: `Invalid JSON: ${e.message}` };
      }
    }
  },
  
  hookScript: {
    name: 'Hook Script',
    check: () => {
      const scriptPath = '.claude/hooks/mech-hook.js';
      if (!fs.existsSync(scriptPath)) {
        return { status: 'fail', message: 'mech-hook.js not found' };
      }
      
      const stats = fs.statSync(scriptPath);
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      
      if (!isExecutable) {
        return { status: 'warn', message: 'Script exists but not executable' };
      }
      
      return { status: 'pass', message: 'Script exists and is executable' };
    }
  },
  
  hookLog: {
    name: 'Hook Activity',
    check: () => {
      const logPath = '.claude/hook.log';
      if (!fs.existsSync(logPath)) {
        return { status: 'warn', message: 'No hook log found - hooks may not have triggered yet' };
      }
      
      const log = fs.readFileSync(logPath, 'utf8');
      const lines = log.split('\n').filter(l => l);
      
      if (lines.length === 0) {
        return { status: 'warn', message: 'Hook log is empty' };
      }
      
      // Count successes and failures
      const successes = lines.filter(l => l.includes('✅')).length;
      const failures = lines.filter(l => l.includes('❌')).length;
      
      // Get last activity time
      const lastLine = lines[lines.length - 1];
      const timestampMatch = lastLine.match(/\[([\d\-T:.Z]+)\]/);
      let recency = '';
      
      if (timestampMatch) {
        const lastTime = new Date(timestampMatch[1]);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastTime) / 60000);
        
        if (diffMinutes < 1) {
          recency = ' (just now)';
        } else if (diffMinutes < 60) {
          recency = ` (${diffMinutes} minutes ago)`;
        } else {
          const hours = Math.floor(diffMinutes / 60);
          recency = ` (${hours} hour${hours > 1 ? 's' : ''} ago)`;
        }
      }
      
      return {
        status: 'pass',
        message: `${lines.length} total events, ${successes} successful, ${failures} failed${recency}`
      };
    }
  },
  
  backendConnection: {
    name: 'Backend Connection',
    check: async () => {
      const backendUrl = process.env.MECH_BACKEND_URL || 'http://localhost:3001';
      
      try {
        // Quick check if backend is responsive
        const http = require('http');
        const url = new URL(`${backendUrl}/health`);
        
        return new Promise((resolve) => {
          const req = http.get(url, { timeout: 2000 }, (res) => {
            if (res.statusCode === 200 || res.statusCode === 404) {
              resolve({
                status: 'pass',
                message: `Backend reachable at ${backendUrl}`
              });
            } else {
              resolve({
                status: 'warn',
                message: `Backend returned ${res.statusCode}`
              });
            }
          });
          
          req.on('error', () => {
            resolve({
              status: 'warn',
              message: `Backend not reachable at ${backendUrl}`
            });
          });
          
          req.on('timeout', () => {
            req.destroy();
            resolve({
              status: 'warn',
              message: `Backend timeout at ${backendUrl}`
            });
          });
        });
      } catch (e) {
        return {
          status: 'warn',
          message: `Backend check failed: ${e.message}`
        };
      }
    }
  },
  
  deprecatedFiles: {
    name: 'Deprecated Files',
    check: () => {
      const deprecated = [
        '.claude/settings.toml',
        'example-settings.toml'
      ];
      
      const found = deprecated.filter(f => fs.existsSync(f));
      
      if (found.length > 0) {
        return {
          status: 'warn',
          message: `Found ${found.length} deprecated file(s): ${found.join(', ')}`
        };
      }
      
      return { status: 'pass', message: 'No deprecated files found' };
    }
  }
};

// Recent activity analysis
function analyzeRecentActivity() {
  const logPath = '.claude/hook.log';
  if (!fs.existsSync(logPath)) {
    return null;
  }
  
  const log = fs.readFileSync(logPath, 'utf8');
  const lines = log.split('\n').filter(l => l);
  const recent = lines.slice(-10);
  
  const summary = {
    events: {},
    failures: []
  };
  
  recent.forEach(line => {
    // Extract event type
    const eventMatch = line.match(/Hook triggered: (\w+)/);
    if (eventMatch) {
      const event = eventMatch[1];
      summary.events[event] = (summary.events[event] || 0) + 1;
    }
    
    // Check for failures
    if (line.includes('❌')) {
      const failMatch = line.match(/Hook failed: (\d+) - (.+)/);
      if (failMatch) {
        const error = JSON.parse(failMatch[2]);
        summary.failures.push({
          code: failMatch[1],
          message: error.error?.message || 'Unknown error'
        });
      }
    }
  });
  
  return summary;
}

// Main validation function
async function validateHooks() {
  log('🔍 Claude Code Hooks Validation\n', colors.bright + colors.magenta);
  
  logSection('System Checks');
  
  let allPassed = true;
  
  // Run all checks
  for (const [key, check] of Object.entries(checks)) {
    const result = await check.check();
    
    const icon = result.status === 'pass' ? '✅' :
                result.status === 'warn' ? '⚠️ ' : '❌';
    const color = result.status === 'pass' ? colors.green :
                 result.status === 'warn' ? colors.yellow : colors.red;
    
    log(`${icon} ${check.name}`, color);
    log(`   ${result.message}`, colors.dim);
    
    if (result.status === 'fail') {
      allPassed = false;
    }
  }
  
  // Recent activity
  logSection('Recent Hook Activity');
  
  const activity = analyzeRecentActivity();
  if (activity) {
    log('Last 10 events:', colors.cyan);
    for (const [event, count] of Object.entries(activity.events)) {
      log(`  ${event}: ${count} time(s)`, colors.reset);
    }
    
    if (activity.failures.length > 0) {
      log('\nRecent failures:', colors.yellow);
      const uniqueFailures = [...new Set(activity.failures.map(f => f.message))];
      uniqueFailures.forEach(message => {
        log(`  • ${message}`, colors.yellow);
      });
    }
  } else {
    log('No activity recorded yet', colors.dim);
  }
  
  // Quick test
  logSection('Quick Hook Test');
  
  const scriptPath = '.claude/hooks/mech-hook.js';
  if (fs.existsSync(scriptPath)) {
    try {
      const testResult = execSync(
        `echo '{"event":"test","agent":{"name":"validator"}}' | node ${scriptPath} test validation check`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      
      const result = JSON.parse(testResult);
      if (result.decision === 'approve') {
        log('✅ Hook script responds correctly', colors.green);
      } else {
        log('⚠️  Hook script returned unexpected response', colors.yellow);
      }
    } catch (e) {
      log('❌ Hook script test failed', colors.red);
    }
  }
  
  // Summary
  logSection('Summary');
  
  if (allPassed) {
    log('✅ All checks passed! Your hooks are properly configured.', colors.green);
  } else {
    log('❌ Some checks failed. Please run:', colors.red);
    log('   node setup-claude-hooks.js', colors.yellow);
  }
  
  log('\nUseful commands:', colors.cyan);
  log('  Setup hooks:    node setup-claude-hooks.js');
  log('  Test hooks:     node test-claude-hooks.js');
  log('  Monitor logs:   tail -f .claude/hook.log');
  log('  Documentation:  cat CLAUDE_HOOKS_SETUP_GUIDE.md');
}

// Run validation
if (require.main === module) {
  validateHooks().catch(error => {
    log(`\n❌ Validation error: ${error.message}`, colors.red);
    console.error(error.stack);
    process.exit(1);
  });
}