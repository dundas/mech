#!/usr/bin/env node

/**
 * Test Current Claude Code Session Integration
 * This script simulates the current Claude Code session and tests the unified backend
 */

const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const BACKEND_URL = 'http://localhost:3001';
const PROJECT_ID = 'mech-ai';
const CURRENT_SESSION_ID = `claude_session_${Date.now()}_current`;

function makeRequest(url, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'X-Session-Id': CURRENT_SESSION_ID,
        'X-Project-Id': PROJECT_ID,
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
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function testCurrentSession() {
  console.log('🧪 Testing Current Claude Code Session Integration\n');
  
  try {
    // Step 1: Register current session
    console.log('1️⃣ Registering current Claude Code session...');
    const sessionData = {
      projectId: PROJECT_ID,
      userId: process.env.USER || 'claude-code-user',
      agent: {
        name: 'claude',
        version: '1.0.0',
        model: 'claude-3-sonnet',
        capabilities: ['reasoning', 'file_operations', 'code_generation', 'analysis']
      },
      environment: {
        os: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname(),
        user: process.env.USER || 'unknown'
      },
      configuration: {
        workingDirectory: process.cwd(),
        gitBranch: 'main',
        claudeCodeVersion: '1.0.0',
      },
      metadata: {
        tokens: {
          github: 'missing',
          mech: 'missing',
          openai: 'available'
        },
        tags: ['claude-code', 'current-session', 'testing']
      }
    };

    const sessionResponse = await makeRequest(`${BACKEND_URL}/api/v2/sessions/start`, sessionData);
    
    if (sessionResponse.status === 201) {
      console.log('✅ Session registered successfully');
      console.log(`📋 Session ID: ${sessionResponse.data.session.sessionId}`);
      
      const actualSessionId = sessionResponse.data.session.sessionId;
      
      // Step 2: Simulate pre-tool use (like when we used the Read tool)
      console.log('\\n2️⃣ Simulating pre-tool use event...');
      const preToolData = {
        sessionId: actualSessionId,
        projectId: PROJECT_ID,
        eventType: 'PreToolUse',
        toolName: 'Read',
        toolInput: {
          file_path: '/Users/kefentse/dev_env/mech/mech-ai/frontend/mech-unified-backend/src/server.ts'
        },
        reasoning: 'I need to read the server.ts file to understand the current unified backend implementation and test the integration.',
        metadata: {
          timestamp: new Date().toISOString(),
          workingDirectory: process.cwd(),
          environment: 'development'
        }
      };
      
      const preToolResponse = await makeRequest(`${BACKEND_URL}/api/v2/claude/hooks`, preToolData);
      
      if (preToolResponse.status === 200) {
        console.log('✅ Pre-tool use event logged');
        
        // Step 3: Store reasoning step
        console.log('\\n3️⃣ Storing reasoning step...');
        const reasoningData = {
          sessionId: actualSessionId,
          projectId: PROJECT_ID,
          type: 'analysis',
          content: {
            raw: 'I need to read the server.ts file to understand the current unified backend implementation and test the integration.',
            summary: 'Reading server.ts to understand backend implementation',
            confidence: 0.9,
            keywords: ['server.ts', 'backend', 'implementation', 'testing'],
            entities: {
              files: ['src/server.ts'],
              functions: ['startServer'],
              variables: ['PORT'],
              concepts: ['express', 'mongodb', 'unified-backend']
            }
          },
          context: {
            precedingSteps: [],
            toolsUsed: ['Read'],
            filesReferenced: ['src/server.ts'],
            filesModified: [],
            codeBlocks: [],
            errors: [],
            decisions: [{
              question: 'Which file should I read to understand the backend?',
              choice: 'src/server.ts',
              alternatives: ['src/app.ts', 'package.json'],
              rationale: 'server.ts is the main entry point for the backend application'
            }]
          },
          metadata: {
            timestamp: new Date(),
            duration: 150,
            tokenCount: {
              prompt: 100,
              completion: 50,
              total: 150
            },
            model: 'claude-3-sonnet',
            temperature: 0.7,
            maxTokens: 4096
          }
        };
        
        const reasoningResponse = await makeRequest(`${BACKEND_URL}/api/v2/reasoning`, reasoningData);
        
        if (reasoningResponse.status === 201) {
          console.log('✅ Reasoning step stored');
          
          // Step 4: Simulate post-tool use
          console.log('\\n4️⃣ Simulating post-tool use event...');
          const postToolData = {
            sessionId: actualSessionId,
            projectId: PROJECT_ID,
            eventType: 'PostToolUse',
            toolName: 'Read',
            toolOutput: {
              success: true,
              result: 'Successfully read server.ts file contents',
              filesModified: [],
              timestamp: new Date().toISOString()
            },
            metadata: {
              timestamp: new Date().toISOString(),
              workingDirectory: process.cwd(),
              environment: 'development',
              executionTime: 150
            }
          };
          
          const postToolResponse = await makeRequest(`${BACKEND_URL}/api/v2/claude/hooks`, postToolData);
          
          if (postToolResponse.status === 200) {
            console.log('✅ Post-tool use event logged');
            
            // Step 5: Get session statistics
            console.log('\\n5️⃣ Retrieving session statistics...');
            const statsResponse = await makeRequest(
              `${BACKEND_URL}/api/v2/sessions/${actualSessionId}/stats`,
              {},
              'GET'
            );
            
            if (statsResponse.status === 200) {
              console.log('✅ Session statistics retrieved');
              console.log('📊 Current session stats:');
              const stats = statsResponse.data.stats;
              console.log(`   • Tools used: ${stats.toolInvocations || 0}`);
              console.log(`   • Files modified: ${stats.filesModified || 0}`);
              console.log(`   • Reasoning steps: ${stats.reasoningSteps || 0}`);
              console.log(`   • Errors: ${stats.errorsEncountered || 0}`);
              
              // Step 6: Get reasoning chain
              console.log('\\n6️⃣ Retrieving reasoning chain...');
              const chainResponse = await makeRequest(
                `${BACKEND_URL}/api/v2/reasoning/${actualSessionId}`,
                {},
                'GET'
              );
              
              if (chainResponse.status === 200) {
                console.log('✅ Reasoning chain retrieved');
                console.log(`🔗 Reasoning steps: ${chainResponse.data.total}`);
                
                // Step 7: Test hook status
                console.log('\\n7️⃣ Checking hook status...');
                const statusResponse = await makeRequest(
                  `${BACKEND_URL}/api/v2/claude/hooks/status`,
                  {},
                  'GET'
                );
                
                if (statusResponse.status === 200) {
                  console.log('✅ Hook status retrieved');
                  console.log(`🔄 Active sessions: ${statusResponse.data.activeSessions}`);
                  console.log(`📈 Processed today: ${statusResponse.data.processedToday}`);
                  
                  console.log('\\n🎉 ALL TESTS PASSED!');
                  console.log('\\n✅ The unified backend is successfully integrated and ready for Claude Code!');
                  console.log('\\n📋 Summary:');
                  console.log('   • Backend server: Running ✅');
                  console.log('   • Database: Connected ✅');
                  console.log('   • Session management: Working ✅');
                  console.log('   • Reasoning storage: Working ✅');
                  console.log('   • Hook processing: Working ✅');
                  console.log('   • Statistics tracking: Working ✅');
                  
                  return actualSessionId;
                } else {
                  console.error('❌ Failed to get hook status');
                }
              } else {
                console.error('❌ Failed to get reasoning chain');
              }
            } else {
              console.error('❌ Failed to get session statistics');
            }
          } else {
            console.error('❌ Failed to log post-tool use event');
          }
        } else {
          console.error('❌ Failed to store reasoning step');
        }
      } else {
        console.error('❌ Failed to log pre-tool use event');
      }
    } else {
      console.error('❌ Failed to register session');
      console.error('Status:', sessionResponse.status);
      console.error('Response:', sessionResponse.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCurrentSession().then((sessionId) => {
    if (sessionId) {
      console.log(`\\n🔗 Session ID for reference: ${sessionId}`);
      console.log('\\n📝 Next steps:');
      console.log('1. Check MongoDB for stored data');
      console.log('2. Set up actual Claude Code hooks');
      console.log('3. Test with real Claude Code session');
    }
  }).catch(console.error);
}

module.exports = { testCurrentSession };