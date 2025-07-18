#!/usr/bin/env node

/**
 * Claude Code Hook: Session Start
 * This script is called when a new Claude Code session starts
 * It registers the session with the unified backend
 */

const https = require('https');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const BACKEND_URL = process.env.MECH_UNIFIED_BACKEND_URL || 'http://localhost:3001';
const PROJECT_ID = process.env.MECH_PROJECT_ID || 'mech-ai';

function makeRequest(url, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'User-Agent': 'Claude-Code-Hook/1.0',
        'X-Session-Id': process.env.CLAUDE_SESSION_ID || 'unknown',
        'X-Project-Id': PROJECT_ID,
      },
    };

    const req = client.request(options, (res) => {
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

async function registerSession() {
  try {
    const sessionData = {
      projectId: PROJECT_ID,
      userId: process.env.USER || 'unknown',
      agent: {
        name: 'claude',
        version: process.env.CLAUDE_VERSION || '1.0.0',
        model: process.env.CLAUDE_MODEL || 'claude-3-opus',
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
        gitBranch: process.env.GIT_BRANCH || 'unknown',
        claudeCodeVersion: process.env.CLAUDE_CODE_VERSION || 'unknown',
      },
      metadata: {
        tokens: {
          github: process.env.GITHUB_TOKEN ? 'available' : 'missing',
          mech: process.env.MECH_API_KEY ? 'available' : 'missing',
          openai: process.env.OPENAI_API_KEY ? 'available' : 'missing'
        },
        tags: ['claude-code', 'session-start']
      }
    };

    console.log('🔗 Registering Claude Code session with unified backend...');
    
    const response = await makeRequest(`${BACKEND_URL}/api/v2/sessions/start`, sessionData);
    
    if (response.status === 201) {
      console.log('✅ Session registered successfully');
      console.log(`📋 Session ID: ${response.data.session.sessionId}`);
      console.log(`🎯 Project ID: ${response.data.session.projectId}`);
      
      // Store session ID for other hooks
      process.env.CLAUDE_SESSION_ID = response.data.session.sessionId;
      
      // Write session info to temp file for other hooks
      const sessionInfo = {
        sessionId: response.data.session.sessionId,
        projectId: response.data.session.projectId,
        startTime: new Date().toISOString(),
        backendUrl: BACKEND_URL
      };
      
      const tempFile = path.join(os.tmpdir(), 'claude-session.json');
      fs.writeFileSync(tempFile, JSON.stringify(sessionInfo, null, 2));
      
      console.log(`💾 Session info saved to: ${tempFile}`);
    } else {
      console.error('❌ Failed to register session');
      console.error('Status:', response.status);
      console.error('Response:', response.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error registering session:', error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  registerSession();
}

module.exports = { registerSession, makeRequest };