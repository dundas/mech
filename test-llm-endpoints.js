#!/usr/bin/env node

/**
 * Test script for LLM service endpoints
 * Tests both local and production endpoints
 */

const axios = require('axios');

// Configuration
const ENVIRONMENTS = {
  local: 'http://localhost:3008',
  production: 'https://llm.mech.is'
};

// Test data for each endpoint
const TEST_DATA = {
  analyze: {
    model: 'gpt-4o',
    prompt: 'What is in this image?',
    attachments: [{
      type: 'image',
      url: 'https://via.placeholder.com/150',
      mimeType: 'image/jpeg'
    }]
  },
  complete: {
    model: 'gpt-3.5-turbo',
    prompt: 'Complete this sentence: The quick brown fox',
    parameters: {
      temperature: 0.7,
      maxTokens: 50
    }
  },
  think: {
    model: 'o3-mini',
    prompt: 'Solve this logic puzzle: If all roses are flowers and some flowers fade quickly, can we conclude that some roses fade quickly?',
    parameters: {
      temperature: 0.3
    }
  }
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function testEndpoint(env, endpoint, data) {
  const url = `${ENVIRONMENTS[env]}/api/${endpoint}`;
  console.log(`\n${colors.blue}Testing ${endpoint} endpoint: ${url}${colors.reset}`);
  
  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`${colors.green}✓ Success:${colors.reset}`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Response structure:`, Object.keys(response.data));
    
    if (response.data.content) {
      console.log(`  Content preview:`, 
        JSON.stringify(response.data.content).substring(0, 100) + '...');
    }
    
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Failed:${colors.reset}`);
    
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Error:`, error.response.data);
      
      // Check if it's a 404 - route not found
      if (error.response.status === 404) {
        console.log(`  ${colors.yellow}Issue: Route not registered properly${colors.reset}`);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`  ${colors.yellow}Error: Service not running on ${url}${colors.reset}`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log(`  ${colors.yellow}Error: Request timed out${colors.reset}`);
    } else {
      console.log(`  Error:`, error.message);
    }
    
    return false;
  }
}

async function testHealth(env) {
  const url = `${ENVIRONMENTS[env]}/health`;
  console.log(`\n${colors.blue}Testing health endpoint: ${url}${colors.reset}`);
  
  try {
    const response = await axios.get(url, { timeout: 5000 });
    console.log(`${colors.green}✓ Service is healthy${colors.reset}`);
    console.log(`  Response:`, response.data);
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Health check failed${colors.reset}`);
    if (error.code === 'ECONNREFUSED') {
      console.log(`  Service is not running on ${ENVIRONMENTS[env]}`);
    } else {
      console.log(`  Error:`, error.message);
    }
    return false;
  }
}

async function testExplainEndpoint(env) {
  const url = `${ENVIRONMENTS[env]}/api/explain`;
  console.log(`\n${colors.blue}Testing explain endpoint: ${url}${colors.reset}`);
  
  try {
    const response = await axios.get(url, { timeout: 5000 });
    console.log(`${colors.green}✓ API documentation available${colors.reset}`);
    console.log(`  Available endpoints:`, Object.keys(response.data.endpoints || {}));
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Explain endpoint failed${colors.reset}`);
    return false;
  }
}

async function runTests(env) {
  console.log(`\n${colors.yellow}========== Testing ${env.toUpperCase()} environment ==========${colors.reset}`);
  
  // Test health first
  const isHealthy = await testHealth(env);
  if (!isHealthy && env === 'local') {
    console.log(`\n${colors.yellow}Tip: Start the service locally with:${colors.reset}`);
    console.log('  cd mech-llms && npm run dev');
    return;
  }
  
  // Test explain endpoint
  await testExplainEndpoint(env);
  
  // Test each endpoint
  const results = {
    analyze: await testEndpoint(env, 'analyze', TEST_DATA.analyze),
    complete: await testEndpoint(env, 'complete', TEST_DATA.complete),
    think: await testEndpoint(env, 'think', TEST_DATA.think)
  };
  
  // Summary
  console.log(`\n${colors.yellow}========== Summary ==========${colors.reset}`);
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  if (passed === total) {
    console.log(`${colors.green}All endpoints working! (${passed}/${total})${colors.reset}`);
  } else {
    console.log(`${colors.red}Some endpoints failing: ${passed}/${total} passed${colors.reset}`);
    
    // Provide debugging suggestions
    console.log(`\n${colors.yellow}Debugging suggestions:${colors.reset}`);
    console.log('1. Check if routes are properly registered in server.ts');
    console.log('2. Verify TypeScript compilation: npm run build');
    console.log('3. Check server logs for errors');
    console.log('4. Ensure all route files export default router');
  }
}

async function main() {
  const env = process.argv[2] || 'local';
  
  if (!ENVIRONMENTS[env]) {
    console.log(`${colors.red}Invalid environment: ${env}${colors.reset}`);
    console.log('Usage: node test-llm-endpoints.js [local|production]');
    process.exit(1);
  }
  
  await runTests(env);
  
  // If local tests fail, offer to test production
  if (env === 'local') {
    console.log(`\n${colors.blue}To test production, run:${colors.reset}`);
    console.log('  node test-llm-endpoints.js production');
  }
}

// Run tests
main().catch(console.error);