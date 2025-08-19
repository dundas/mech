#!/usr/bin/env node

/**
 * Simple test script to verify LLM service explain endpoints
 */

const https = require('https');
const http = require('http');

// Test endpoints
const ENDPOINTS = [
  { name: 'Health Check', url: 'https://llm.mech.is/health', method: 'GET' },
  { name: 'Main Explain', url: 'https://llm.mech.is/api/explain', method: 'GET' },
  { name: 'Chat Endpoint', url: 'https://llm.mech.is/api/chat', method: 'POST', 
    body: { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'Hi' }] } },
  { name: 'Complete Endpoint', url: 'https://llm.mech.is/api/complete', method: 'POST',
    body: { model: 'gpt-3.5-turbo', prompt: 'Hello' } },
  { name: 'Think Endpoint', url: 'https://llm.mech.is/api/think', method: 'POST',
    body: { model: 'o3-mini', prompt: 'Think about this' } },
  { name: 'Analyze Endpoint', url: 'https://llm.mech.is/api/analyze', method: 'POST',
    body: { model: 'gpt-4o', prompt: 'Analyze', attachments: [{ type: 'image', url: 'test.jpg', mimeType: 'image/jpeg' }] } }
];

function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.url);
    const module = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };
    
    console.log(`\n📍 Testing ${endpoint.name}: ${endpoint.method} ${endpoint.url}`);
    
    const req = module.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
        
        if (res.statusCode === 404) {
          console.log('   ❌ Endpoint not found - route not registered');
          
          // Try to parse error message
          try {
            const error = JSON.parse(data);
            if (error.hints) {
              console.log('   💡 Hints:', error.hints);
            }
          } catch (e) {
            // Not JSON
          }
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('   ✅ Endpoint is working');
          
          // Show available endpoints for explain
          if (endpoint.name === 'Main Explain') {
            try {
              const response = JSON.parse(data);
              if (response.endpoints) {
                console.log('   Available endpoints:');
                Object.entries(response.endpoints).forEach(([name, info]) => {
                  console.log(`     - ${name}: ${info.path}`);
                });
              }
            } catch (e) {
              // Not JSON
            }
          }
        } else {
          console.log('   ⚠️  Unexpected status');
          try {
            const error = JSON.parse(data);
            console.log('   Error:', error.error || error.message || error);
          } catch (e) {
            console.log('   Response:', data.substring(0, 200));
          }
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Request failed: ${error.message}`);
      resolve();
    });
    
    req.on('timeout', () => {
      console.log('   ⏱️  Request timed out');
      req.destroy();
      resolve();
    });
    
    // Send body for POST requests
    if (endpoint.method === 'POST' && endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🔍 LLM Service Endpoint Test');
  console.log('============================');
  
  for (const endpoint of ENDPOINTS) {
    await makeRequest(endpoint);
  }
  
  console.log('\n\n📋 Summary');
  console.log('==========');
  console.log('If endpoints are returning 404, the issue is likely:');
  console.log('1. Routes not properly registered in the compiled JavaScript');
  console.log('2. TypeScript compilation issues');
  console.log('3. Docker image not rebuilt with latest code');
  console.log('\nTo fix:');
  console.log('1. Run: ./fix-llm-service-deployment.sh');
  console.log('2. Or manually rebuild and redeploy the service');
}

runTests().catch(console.error);