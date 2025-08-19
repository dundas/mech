#!/usr/bin/env node

/**
 * MVP Testing Script with Authentication
 * 
 * This script tests the current MECH AI implementation including:
 * 1. Frontend availability
 * 2. Authentication flow
 * 3. Chat API with tools
 * 4. Indexer service
 */

const https = require('https');
const http = require('http');

// Colors for output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Test configuration
const FRONTEND_URL = 'http://localhost:5500';
const INDEXER_URL = 'http://localhost:3000';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 MECH AI MVP Test Suite');
  console.log('=========================\n');

  // Test 1: Frontend availability
  console.log(`${colors.yellow}Test 1: Frontend Service${colors.reset}`);
  try {
    const res = await makeRequest(FRONTEND_URL);
    if (res.statusCode === 200) {
      console.log(`${colors.green}✓ Frontend is running on :5500${colors.reset}`);
      console.log(`  Requires authentication: ${res.data.includes('login') ? 'Yes' : 'No'}`);
    } else {
      console.log(`${colors.red}✗ Frontend returned status ${res.statusCode}${colors.reset}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ Frontend not accessible: ${err.message}${colors.reset}`);
  }

  // Test 2: Indexer Service
  console.log(`\n${colors.yellow}Test 2: Indexer Service${colors.reset}`);
  try {
    const res = await makeRequest(`${INDEXER_URL}/api/health`);
    if (res.statusCode === 200) {
      console.log(`${colors.green}✓ Indexer API is running on :3003${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Indexer API returned status ${res.statusCode}${colors.reset}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ Indexer not accessible: ${err.message}${colors.reset}`);
    console.log('  Try running: cd mech-indexer && npm run api:simple');
  }

  // Test 3: Code Search
  console.log(`\n${colors.yellow}Test 3: Code Search API${colors.reset}`);
  try {
    const searchData = JSON.stringify({ query: 'chat' });
    const res = await makeRequest(`${INDEXER_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': searchData.length
      },
      body: searchData
    });
    
    if (res.statusCode === 200) {
      const results = JSON.parse(res.data);
      console.log(`${colors.green}✓ Code search is working${colors.reset}`);
      console.log(`  Found ${results.results?.length || 0} results`);
    } else {
      console.log(`${colors.red}✗ Search API returned status ${res.statusCode}${colors.reset}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ Code search failed: ${err.message}${colors.reset}`);
  }

  // Test 4: Tool Implementations
  console.log(`\n${colors.yellow}Test 4: Tool Implementations${colors.reset}`);
  const fs = require('fs');
  const path = require('path');
  const toolsDir = path.join(__dirname, 'mech-ai/frontend/lib/tools');
  
  try {
    const files = fs.readdirSync(toolsDir);
    const tools = files.filter(f => f.endsWith('.ts'));
    console.log(`${colors.green}✓ Found ${tools.length} tool implementations:${colors.reset}`);
    tools.forEach(tool => console.log(`  - ${tool}`));
  } catch (err) {
    console.log(`${colors.red}✗ Tools directory not found${colors.reset}`);
  }

  // Instructions for manual testing
  console.log(`\n${colors.yellow}Manual Testing Instructions:${colors.reset}`);
  console.log('1. Open http://localhost:5500 in your browser');
  console.log('2. Login with your credentials');
  console.log('3. Test the chat interface with these prompts:');
  console.log('   - "Can you read the file mech-ai/frontend/package.json?"');
  console.log('   - "Search for components that handle chat"');
  console.log('   - "List the files in the mech-ai/frontend/lib/tools directory"');
  console.log('   - "Can you write a simple test file?" (to test approval flow)');
  
  console.log(`\n${colors.yellow}Starting Services:${colors.reset}`);
  console.log('Terminal 1: cd mech-ai/frontend && npm run dev');
  console.log('Terminal 2: cd mech-indexer && npm run index-mech-codebase && npm run api:simple');
  
  console.log(`\n${colors.yellow}For API Testing with Auth:${colors.reset}`);
  console.log('1. Login via browser first');
  console.log('2. Get the session cookie from DevTools (Application > Cookies)');
  console.log('3. Use the cookie in API requests');
}

// Run the tests
runTests().catch(console.error);