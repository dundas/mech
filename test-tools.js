#!/usr/bin/env node

/**
 * Test script for MECH AI tools via test endpoint
 */

const http = require('http');

const TEST_API = 'http://localhost:5500/api/test/chat';

async function testTool(toolName, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ tool: toolName, params });
    
    const options = {
      hostname: 'localhost',
      port: 5500,
      path: '/api/test/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing MECH AI Tools\n');

  // Test 1: Check if test endpoint is available
  console.log('1️⃣ Checking test endpoint...');
  try {
    const res = await new Promise((resolve, reject) => {
      http.get('http://localhost:5500/api/test/chat', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }).on('error', reject);
    });
    
    if (res.status === 200) {
      console.log('✅ Test endpoint is available');
      console.log('   Response:', res.data);
    } else {
      console.log('❌ Test endpoint returned:', res.status);
      return;
    }
  } catch (err) {
    console.log('❌ Could not connect to test endpoint:', err.message);
    console.log('   Make sure frontend is running: cd mech-ai/frontend && npm run dev');
    return;
  }

  // Test 2: Read file tool
  console.log('\n2️⃣ Testing read_file tool...');
  try {
    const result = await testTool('read_file', { 
      path: '/Users/kefentse/dev_env/mech/mech-ai/frontend/package.json' 
    });
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ read_file tool works');
      const content = JSON.parse(result.data.result.content);
      console.log(`   Read package.json: ${content.name} v${content.version}`);
    } else {
      console.log('❌ read_file failed:', result.data);
    }
  } catch (err) {
    console.log('❌ read_file error:', err.message);
  }

  // Test 3: List files tool
  console.log('\n3️⃣ Testing list_files tool...');
  try {
    const result = await testTool('list_files', { 
      directory: '/Users/kefentse/dev_env/mech/mech-ai/frontend/lib/tools' 
    });
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ list_files tool works');
      console.log('   Found files:', result.data.result.files);
    } else {
      console.log('❌ list_files failed:', result.data);
    }
  } catch (err) {
    console.log('❌ list_files error:', err.message);
  }

  // Test 4: Search code tool
  console.log('\n4️⃣ Testing search_code tool...');
  console.log('   Note: This requires the indexer service to be running');
  try {
    const result = await testTool('search_code', { query: 'chat' });
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ search_code tool works');
      const results = result.data.result.results || [];
      console.log(`   Found ${results.length} results`);
      if (results.length > 0) {
        console.log(`   First result: ${results[0].file}`);
      }
    } else {
      console.log('❌ search_code failed:', result.data);
      console.log('   Make sure indexer is running: cd mech-indexer && npm run api:simple');
    }
  } catch (err) {
    console.log('❌ search_code error:', err.message);
  }

  // Test 5: Write file tool (approval flow)
  console.log('\n5️⃣ Testing write_file tool (approval simulation)...');
  try {
    const result = await testTool('write_file', { 
      path: '/tmp/test-mech.txt',
      content: 'Hello from MECH AI test suite!'
    });
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ write_file tool works');
      console.log('   Status:', result.data.result.status);
      console.log('   Diff preview:');
      console.log(result.data.result.diff.split('\\n').map(line => '   ' + line).join('\n'));
    } else {
      console.log('❌ write_file failed:', result.data);
    }
  } catch (err) {
    console.log('❌ write_file error:', err.message);
  }

  console.log('\n✨ Test suite complete!');
  console.log('\nNext steps:');
  console.log('1. Ensure all services are running');
  console.log('2. Test the actual chat interface in the browser');
  console.log('3. Try the self-improvement prompts from MVP_EXAMPLE_INTERACTION.md');
}

// Run tests
runTests().catch(console.error);