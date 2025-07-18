#!/usr/bin/env node

/**
 * Setup Frontend Claude Code Hooks
 * This script configures the frontend to use the unified backend hooks
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_PATH = path.join(__dirname, '../../');
const CLAUDE_DIR = path.join(FRONTEND_PATH, '.claude');
const HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks');

function createDirectories() {
  try {
    if (!fs.existsSync(CLAUDE_DIR)) {
      fs.mkdirSync(CLAUDE_DIR, { recursive: true });
      console.log('✅ Created .claude directory');
    }
    
    if (!fs.existsSync(HOOKS_DIR)) {
      fs.mkdirSync(HOOKS_DIR, { recursive: true });
      console.log('✅ Created hooks directory');
    }
  } catch (error) {
    console.error('❌ Error creating directories:', error.message);
    process.exit(1);
  }
}

function copyHookScripts() {
  try {
    const hookScripts = [
      'session-start.js',
      'pre-tool-use.js',
      'post-tool-use.js',
      'session-stop.js'
    ];
    
    const sourceDir = path.join(__dirname, 'claude-hooks');
    
    for (const script of hookScripts) {
      const sourcePath = path.join(sourceDir, script);
      const destPath = path.join(HOOKS_DIR, script);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        // Make executable
        fs.chmodSync(destPath, 0o755);
        console.log(`✅ Copied ${script}`);
      } else {
        console.warn(`⚠️  Source script not found: ${sourcePath}`);
      }
    }
  } catch (error) {
    console.error('❌ Error copying hook scripts:', error.message);
    process.exit(1);
  }
}

function createClaudeConfig() {
  try {
    const config = {
      hooks: {
        sessionStart: "node .claude/hooks/session-start.js",
        preToolUse: "node .claude/hooks/pre-tool-use.js",
        postToolUse: "node .claude/hooks/post-tool-use.js",
        sessionStop: "node .claude/hooks/session-stop.js"
      },
      reasoning: {
        enabled: true,
        backend: "unified",
        storage: "mongodb"
      },
      session: {
        tracking: true,
        checkpoints: true,
        statistics: true
      }
    };
    
    const configPath = path.join(CLAUDE_DIR, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Created Claude Code configuration');
  } catch (error) {
    console.error('❌ Error creating Claude config:', error.message);
    process.exit(1);
  }
}

function createEnvironmentFile() {
  try {
    const envContent = `# Mech AI Unified Backend Configuration
MECH_UNIFIED_BACKEND_URL=http://localhost:3001
MECH_PROJECT_ID=mech-ai

# API Keys (update with your actual keys)
GITHUB_TOKEN=your-github-token
MECH_API_KEY=your-mech-api-key
OPENAI_API_KEY=your-openai-api-key

# Claude Configuration
CLAUDE_VERSION=1.0.0
CLAUDE_MODEL=claude-3-opus
CLAUDE_CODE_VERSION=latest

# Git Configuration (auto-detected)
GIT_BRANCH=main

# Environment
NODE_ENV=development
DEBUG=0
`;
    
    const envPath = path.join(FRONTEND_PATH, '.env.claude');
    
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Created .env.claude file');
      console.log('⚠️  Please update API keys in .env.claude');
    } else {
      console.log('⚠️  .env.claude already exists, skipping creation');
    }
  } catch (error) {
    console.error('❌ Error creating environment file:', error.message);
    process.exit(1);
  }
}

function createTestScript() {
  try {
    const testScript = `#!/usr/bin/env node

/**
 * Test Claude Code Hooks
 * This script tests the hook integration with the unified backend
 */

const { spawn } = require('child_process');
const path = require('path');

function runHook(hookName, env = {}) {
  return new Promise((resolve, reject) => {
    const hookPath = path.join(__dirname, 'hooks', \`\${hookName}.js\`);
    
    const child = spawn('node', [hookPath], {
      env: { ...process.env, ...env },
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(\`Hook \${hookName} failed with code \${code}\`));
      }
    });
  });
}

async function testHooks() {
  console.log('🧪 Testing Claude Code hooks...');
  
  try {
    // Test session start
    console.log('\\n1. Testing session start...');
    await runHook('session-start');
    
    // Test pre-tool use
    console.log('\\n2. Testing pre-tool use...');
    await runHook('pre-tool-use', {
      CLAUDE_TOOL_NAME: 'read_file',
      CLAUDE_TOOL_INPUT: JSON.stringify({ path: 'test.txt' }),
      CLAUDE_REASONING: 'I need to read the contents of test.txt to understand the file structure'
    });
    
    // Test post-tool use
    console.log('\\n3. Testing post-tool use...');
    await runHook('post-tool-use', {
      CLAUDE_TOOL_NAME: 'read_file',
      CLAUDE_TOOL_OUTPUT: JSON.stringify({ content: 'Test file content' }),
      CLAUDE_TOOL_SUCCESS: 'true',
      CLAUDE_TOOL_EXECUTION_TIME: '150'
    });
    
    // Test session stop
    console.log('\\n4. Testing session stop...');
    await runHook('session-stop', {
      CLAUDE_STOP_REASON: 'test_completed',
      CLAUDE_SESSION_SUMMARY: 'Hook testing completed successfully'
    });
    
    console.log('\\n✅ All hooks tested successfully!');
  } catch (error) {
    console.error('\\n❌ Hook testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testHooks();
}

module.exports = { testHooks };
`;
    
    const testPath = path.join(CLAUDE_DIR, 'test-hooks.js');
    fs.writeFileSync(testPath, testScript);
    fs.chmodSync(testPath, 0o755);
    console.log('✅ Created hook test script');
  } catch (error) {
    console.error('❌ Error creating test script:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🚀 Setting up Claude Code hooks for Mech AI frontend...');
  
  // Check if frontend directory exists
  if (!fs.existsSync(FRONTEND_PATH)) {
    console.error(`❌ Frontend directory not found: ${FRONTEND_PATH}`);
    console.error('Please run this script from the mech-unified-backend directory');
    process.exit(1);
  }
  
  createDirectories();
  copyHookScripts();
  createClaudeConfig();
  createEnvironmentFile();
  createTestScript();
  
  console.log('\\n✅ Claude Code hooks setup completed!');
  console.log('\\nNext steps:');
  console.log('1. Update API keys in .env.claude');
  console.log('2. Start the unified backend: npm run dev');
  console.log('3. Test the hooks: node .claude/test-hooks.js');
  console.log('4. Start using Claude Code with integrated reasoning storage!');
}

if (require.main === module) {
  main();
}