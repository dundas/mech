#!/usr/bin/env node

const http = require('http');

// Test sending a message hook
async function testMessageHook() {
  const payload = {
    sessionId: `test-session-${Date.now()}`,
    eventType: 'Message',
    toolName: 'user-message',
    operation: 'message',
    timestamp: new Date().toISOString(),
    payload: {
      files: [],
      parameters: {},
      result: {},
      command: 'Test message: Hello from test script!'
    },
    metadata: {
      projectId: 'mech-ai',
      userId: 'test-user',
      workingDirectory: process.cwd()
    }
  };

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v2/claude/hooks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Project-ID': 'mech-ai',
      'X-Session-ID': payload.sessionId
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Response Status: ${res.statusCode}`);
        console.log('Response:', data);
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(data));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Query memory recall to verify message was stored
async function checkMemoryRecall() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/memory-recall/context/mech-ai?userId=test-user',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\n--- Memory Recall Response ---');
        console.log('Status:', res.statusCode);
        const parsed = JSON.parse(data);
        console.log('Sessions found:', parsed.data?.recentSessions?.length || 0);
        if (parsed.data?.recentSessions?.length > 0) {
          console.log('Recent session IDs:');
          parsed.data.recentSessions.forEach(s => {
            console.log(`  - ${s.sessionId} (${s.startTime})`);
          });
        }
        resolve(parsed);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run the test
async function runTest() {
  console.log('=== Testing Message Hooks ===\n');
  
  try {
    console.log('1. Sending test message hook...');
    const hookResult = await testMessageHook();
    console.log('✅ Message hook sent successfully!\n');
    
    console.log('2. Waiting 2 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('3. Checking memory recall...');
    const memoryResult = await checkMemoryRecall();
    
    console.log('\n✅ Test complete!');
    
    // Check if our test session appears
    const testSessionFound = memoryResult.data?.recentSessions?.some(
      s => s.sessionId.includes('test-session')
    );
    
    if (testSessionFound) {
      console.log('✅ Test message was stored and retrieved successfully!');
    } else {
      console.log('⚠️  Test message not found in memory recall (may need more time to process)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check current UserPromptSubmit hooks in log
console.log('Recent UserPromptSubmit hooks from log:\n');
const { execSync } = require('child_process');
try {
  const recentHooks = execSync(
    'tail -20 /Users/kefentse/dev_env/mech/.claude/hook.log | grep -E "(UserPromptSubmit|Message)" | tail -5',
    { encoding: 'utf-8' }
  );
  console.log(recentHooks);
} catch (e) {
  console.log('(No recent message hooks found in log)');
}

runTest();