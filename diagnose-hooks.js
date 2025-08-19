#!/usr/bin/env node

/**
 * Diagnose Claude Code hooks configuration and execution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Claude Code Hooks Diagnostic\n');

// Check Claude Code version
try {
  const version = execSync('claude --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Claude Code version: ${version}`);
} catch (e) {
  console.log('❌ Claude Code CLI not found');
}

// Check settings files
const settingsLocations = [
  { path: '.claude/settings.json', type: 'Project' },
  { path: '.claude/settings.local.json', type: 'Local' },
  { path: path.join(process.env.HOME, '.config/claude/settings.json'), type: 'User' },
  { path: path.join(process.env.HOME, '.config/claude/settings.local.json'), type: 'User Local' }
];

console.log('\n📁 Settings files:');
for (const { path: settingsPath, type } of settingsLocations) {
  if (fs.existsSync(settingsPath)) {
    console.log(`✅ ${type}: ${settingsPath}`);
    try {
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (content.hooks) {
        const hookCount = Object.keys(content.hooks).length;
        console.log(`   - Contains ${hookCount} hook event types`);
      }
    } catch (e) {
      console.log(`   ⚠️  Error parsing: ${e.message}`);
    }
  } else {
    console.log(`❌ ${type}: ${settingsPath} (not found)`);
  }
}

// Check hook scripts
console.log('\n📄 Hook scripts:');
const hooksDir = '.claude/hooks';
if (fs.existsSync(hooksDir)) {
  const files = fs.readdirSync(hooksDir);
  for (const file of files) {
    const filePath = path.join(hooksDir, file);
    const stats = fs.statSync(filePath);
    const executable = (stats.mode & parseInt('111', 8)) !== 0;
    console.log(`${executable ? '✅' : '⚠️ '} ${file} ${executable ? '(executable)' : '(not executable)'}`);
  }
} else {
  console.log('❌ Hooks directory not found');
}

// Check hook log
console.log('\n📊 Recent hook activity:');
const hookLog = '.claude/hook.log';
if (fs.existsSync(hookLog)) {
  const lines = fs.readFileSync(hookLog, 'utf8').split('\n').filter(l => l);
  const recent = lines.slice(-5);
  console.log(`Found ${lines.length} log entries. Last 5:`);
  recent.forEach(line => {
    if (line.includes('✅')) {
      console.log(`  ✅ ${line.match(/Hook sent successfully: (.+)/)?.[1] || line}`);
    } else if (line.includes('❌')) {
      console.log(`  ❌ ${line.match(/Hook failed: (.+?) -/)?.[1] || 'Failed'}`);
    } else if (line.includes('Hook triggered:')) {
      console.log(`  🔄 ${line.match(/Hook triggered: (.+)/)?.[1] || line}`);
    }
  });
} else {
  console.log('❌ Hook log not found');
}

// Check if hooks are enabled in the environment
console.log('\n🔧 Environment:');
console.log(`Working directory: ${process.cwd()}`);
console.log(`MECH_BACKEND_URL: ${process.env.MECH_BACKEND_URL || 'Not set (will use default)'}`);

// Test hook execution path
console.log('\n🧪 Hook execution test:');
try {
  // Check if settings are properly loaded
  const projectSettings = '.claude/settings.json';
  if (fs.existsSync(projectSettings)) {
    const settings = JSON.parse(fs.readFileSync(projectSettings, 'utf8'));
    
    // Find a PostToolUse Write hook
    const writeHook = settings.hooks?.PostToolUse?.find(h => h.matcher === 'Write');
    if (writeHook && writeHook.hooks?.[0]) {
      console.log('✅ Found Write hook configuration');
      console.log(`   Command: ${writeHook.hooks[0].command}`);
      
      // Extract the hook script path
      const match = writeHook.hooks[0].command.match(/node\s+([^\s]+)/);
      if (match && fs.existsSync(match[1])) {
        console.log(`✅ Hook script exists: ${match[1]}`);
      } else {
        console.log('❌ Hook script not found');
      }
    } else {
      console.log('❌ No Write hook configured');
    }
  }
} catch (e) {
  console.log(`❌ Error testing hooks: ${e.message}`);
}

console.log('\n💡 Recommendations:');
console.log('1. Ensure Claude Code is running in the project directory');
console.log('2. Check that settings.json is properly formatted');
console.log('3. Verify hook scripts have execute permissions');
console.log('4. Monitor .claude/hook.log for execution details');
console.log('5. Check that MECH_BACKEND_URL points to a running backend if needed');