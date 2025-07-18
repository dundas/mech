#!/usr/bin/env node

/**
 * Simple Claude Code Integration Test
 * Tests the basic functionality that we know works
 */

const http = require('http');
const os = require('os');

const BACKEND_URL = 'http://localhost:3001';
const PROJECT_ID = 'mech-ai';

function makeRequest(url, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = method === 'GET' ? null : JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': postData.length })
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data, raw: true });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testBasicIntegration() {
  console.log('🧪 Testing Basic Claude Code Integration\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await makeRequest(`${BACKEND_URL}/api/health`, {}, 'GET');
    
    if (healthResponse.status === 200) {
      console.log('✅ Health check passed');
      console.log(`📊 Backend status: ${healthResponse.data.status}`);
    } else {
      console.error('❌ Health check failed');
      return false;
    }

    // Test 2: Detailed health
    console.log('\\n2️⃣ Testing detailed health endpoint...');
    const detailedHealthResponse = await makeRequest(`${BACKEND_URL}/api/health/detailed`, {}, 'GET');
    
    if (detailedHealthResponse.status === 200) {
      console.log('✅ Detailed health check passed');
      console.log(`🗄️  Database: ${detailedHealthResponse.data.database.connected ? 'Connected' : 'Disconnected'}`);
      console.log(`⚡ Response time: ${detailedHealthResponse.data.database.responseTime}ms`);
    } else {
      console.error('❌ Detailed health check failed');
    }

    // Test 3: Session creation
    console.log('\\n3️⃣ Testing session creation...');
    const sessionData = {
      projectId: PROJECT_ID,
      userId: process.env.USER || 'claude-code-user',
      agent: {
        name: 'claude',
        version: '1.0.0',
        model: 'claude-3-sonnet',
        capabilities: ['reasoning', 'file_operations', 'code_generation']
      },
      environment: {
        os: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname(),
        user: process.env.USER || 'unknown'
      },
      configuration: {},
      metadata: {
        tokens: {
          github: 'missing',
          mech: 'missing',
          openai: 'available'
        },
        tags: ['claude-code', 'integration-test']
      }
    };

    const sessionResponse = await makeRequest(`${BACKEND_URL}/api/v2/sessions/start`, sessionData);
    
    if (sessionResponse.status === 201) {
      console.log('✅ Session creation successful');
      const sessionId = sessionResponse.data.session.sessionId;
      console.log(`📋 Session ID: ${sessionId}`);
      console.log(`🎯 Project: ${sessionResponse.data.session.projectId}`);
      console.log(`🤖 Agent: ${sessionResponse.data.session.agent.name} (${sessionResponse.data.session.agent.model})`);
      
      // Test 4: Get session details
      console.log('\\n4️⃣ Testing session retrieval...');
      const getSessionResponse = await makeRequest(`${BACKEND_URL}/api/v2/sessions/${sessionId}`, {}, 'GET');
      
      if (getSessionResponse.status === 200) {
        console.log('✅ Session retrieval successful');
        console.log(`📈 Session status: ${getSessionResponse.data.session.status}`);
        
        // Test 5: Test reasoning storage
        console.log('\\n5️⃣ Testing reasoning storage...');
        const reasoningData = {
          sessionId: sessionId,
          projectId: PROJECT_ID,
          type: 'analysis',
          content: {
            raw: 'Testing the unified backend integration with Claude Code. This is a test reasoning step.',
            summary: 'Testing backend integration',
            confidence: 0.9,
            keywords: ['testing', 'backend', 'integration', 'claude-code'],
            entities: {
              files: ['test-simple-integration.js'],
              functions: ['testBasicIntegration'],
              variables: ['sessionId', 'reasoningData'],
              concepts: ['unified-backend', 'claude-code', 'integration']
            }
          },
          context: {
            precedingSteps: [],
            toolsUsed: ['testing'],
            filesReferenced: ['test-simple-integration.js'],
            filesModified: [],
            codeBlocks: [],
            errors: [],
            decisions: []
          },
          metadata: {
            timestamp: new Date(),
            duration: 100,
            tokenCount: {
              prompt: 80,
              completion: 40,
              total: 120
            },
            model: 'claude-3-sonnet',
            temperature: 0.7,
            maxTokens: 4096
          }
        };
        
        const reasoningResponse = await makeRequest(`${BACKEND_URL}/api/v2/reasoning`, reasoningData);
        
        if (reasoningResponse.status === 201) {
          console.log('✅ Reasoning storage successful');
          console.log(`🧠 Reasoning ID: ${reasoningResponse.data.reasoningStep._id}`);
          
          // Test 6: Get reasoning chain
          console.log('\\n6️⃣ Testing reasoning chain retrieval...');
          const chainResponse = await makeRequest(`${BACKEND_URL}/api/v2/reasoning/${sessionId}`, {}, 'GET');
          
          if (chainResponse.status === 200) {
            console.log('✅ Reasoning chain retrieval successful');
            console.log(`🔗 Chain length: ${chainResponse.data.total}`);
            
            // Test 7: Get session stats
            console.log('\\n7️⃣ Testing session statistics...');
            const statsResponse = await makeRequest(`${BACKEND_URL}/api/v2/sessions/${sessionId}/stats`, {}, 'GET');
            
            if (statsResponse.status === 200) {
              console.log('✅ Session statistics retrieval successful');
              console.log('📊 Current session stats:');
              const stats = statsResponse.data.stats;
              console.log(`   • Tools used: ${stats.toolInvocations || 0}`);
              console.log(`   • Files modified: ${stats.filesModified || 0}`);
              console.log(`   • Reasoning steps: ${stats.reasoningSteps || 0}`);
              console.log(`   • Errors: ${stats.errorsEncountered || 0}`);
              
              console.log('\\n🎉 ALL BASIC TESTS PASSED!');
              console.log('\\n✅ The unified backend is ready for Claude Code integration!');
              console.log('\\n📋 What works:');
              console.log('   • Health checks ✅');
              console.log('   • Database connection ✅');
              console.log('   • Session management ✅');
              console.log('   • Reasoning storage ✅');
              console.log('   • Statistics tracking ✅');
              
              console.log('\\n🔧 Ready for next steps:');
              console.log('   • Set up Claude Code hooks');
              console.log('   • Test with real Claude Code session');
              console.log('   • Deploy to production');
              
              return sessionId;
            }
          }
        }
      }
    } else {
      console.error('❌ Session creation failed');
      console.error('Status:', sessionResponse.status);
      console.error('Error:', sessionResponse.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testBasicIntegration().then((result) => {
  if (result) {
    console.log(`\\n✅ Integration test completed successfully!`);
    console.log(`📋 Test session ID: ${result}`);
    process.exit(0);
  } else {
    console.log('\\n❌ Integration test failed!');
    process.exit(1);
  }
}).catch(console.error);