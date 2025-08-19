#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🧪 Testing Claude Code Hooks...\n');

try {
  process.env.MECH_BACKEND_URL = 'http://localhost:3001';
  execSync('node .claude/hooks/mech-hook.js TestEvent TestTool test-file.txt', {
    stdio: 'inherit'
  });
  console.log('\n✅ Hook test successful!');
} catch (e) {
  console.log('\n❌ Hook test failed:', e.message);
}
