#!/usr/bin/env node

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const BACKEND_URL = process.env.MECH_BACKEND_URL || 'http://localhost:3001';
const HOOK_ENDPOINT = `${BACKEND_URL}/api/v2/claude/hooks`;

// Project ID generation function based on documentation standards
function generateProjectId(workingDirectory) {
  // Check for environment variable override first
  if (process.env.MECH_PROJECT_ID) {
    return process.env.MECH_PROJECT_ID;
  }
  
  try {
    // Try to get git remote URL (preferred method)
    const gitRemoteUrl = execSync('git config --get remote.origin.url', { 
      cwd: workingDirectory, 
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    
    if (gitRemoteUrl) {
      // Generate project ID from git remote URL (24 chars alphanumeric)
      const hash = Buffer.from(gitRemoteUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
      return hash.substring(0, 24);
    }
  } catch (error) {
    // Git command failed, fall through to directory path method
  }
  
  // Fallback: generate from directory path
  const hash = Buffer.from(workingDirectory).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return hash.substring(0, 24);
}

// Get hook data from Claude Code
// Claude Code passes JSON via stdin or as arguments
let hookData = null;

// Try to read from stdin first (Claude Code pipes JSON data)
try {
  const stdinData = fs.readFileSync(0, 'utf8').trim();
  if (stdinData) {
    hookData = JSON.parse(stdinData);
  }
} catch (e) {
  // No stdin data or invalid JSON, try arguments
}

// If no stdin data, try command line arguments
if (!hookData) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Try to parse as JSON first
    if (args[0].startsWith('{')) {
      try {
        hookData = JSON.parse(args[0]);
      } catch (e) {
        // Fall through to argument parsing
      }
    }
    
    // If not JSON, parse as individual arguments
    if (!hookData) {
      hookData = {
        hook_event_name: args[0] || 'Unknown',
        tool_name: args[1] || 'unknown',
        session_id: args[2] || '',
        cwd: process.cwd(),
        // Additional args might contain more data
        additionalArgs: args.slice(3)
      };
    }
  }
}

async function sendHook(data) {
  try {
    // Ensure data is defined
    if (!data) {
      console.warn('No hook data provided');
      return { success: false, error: 'No hook data provided' };
    }
    
    // Map Claude Code hook data to our backend format
    const sessionId = data.session_id || `session-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
    const eventType = data.hook_event_name || 'Unknown';
    const toolName = data.tool_name || 'unknown';
    const workingDirectory = data.cwd || process.cwd();
    
    // Build payload with actual Claude Code data
    const payload = {
      files: [],
      parameters: {},
      // Include actual tool input/output from Claude Code
      ...(data.tool_input && { toolInput: data.tool_input }),
      ...(data.tool_response && { toolOutput: data.tool_response }),
      ...(data.prompt && { message: data.prompt }), // User prompt for UserPromptSubmit
      ...(data.message && { message: data.message }), // Notification message
      ...(data.reasoning && { reasoning: data.reasoning }),
      // Include transcript path for reference
      ...(data.transcript_path && { transcriptPath: data.transcript_path }),
      // Include any additional args from fallback parsing
      ...(data.additionalArgs && data.additionalArgs.length > 0 ? { additionalArgs: data.additionalArgs } : {})
    };
    
    // Handle tool rejection events - they might have different structure
    if (eventType === 'ToolExecutionRejected' || (data.rejection && data.rejection === true)) {
      payload.rejected = true;
      payload.rejectionReason = data.reason || data.message || 'Permission denied';
    }
    
    // Ensure required fields are present
    const hookPayload = {
      sessionId,
      eventType,
      toolName,
      operation: `${eventType}-${toolName}`,
      timestamp: new Date().toISOString(),
      payload,
      // Include tool input/output at top level for compatibility
      ...(data.tool_input && { toolInput: data.tool_input }),
      ...(data.tool_response && { toolOutput: data.tool_response }),
      ...(data.reasoning && { reasoning: data.reasoning }),
      // Include message at top level if it exists (for rejection events)
      ...(data.message && { message: data.message }),
      metadata: {
        projectId: generateProjectId(workingDirectory),
        workingDirectory,
        userId: process.env.USER || 'unknown',
        transcriptPath: data.transcript_path,
        claudeSessionId: data.session_id
      }
    };

    console.log(`Sending hook to ${HOOK_ENDPOINT}:`, JSON.stringify(hookPayload, null, 2));

    const response = await makeHttpRequest(HOOK_ENDPOINT, hookPayload);
    console.log('Hook sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Failed to send hook:', error.message);
    // Don't exit with error to avoid blocking Claude Code
    return { success: false, error: error.message };
  }
}

function makeHttpRequest(url, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          resolve({ success: true, raw: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Main execution
async function main() {
  // If no hook data provided, this might be a test or configuration check
  if (!hookData) {
    console.log('Mech hook script is ready');
    console.log(`Backend URL: ${BACKEND_URL}`);
    console.log(`Hook endpoint: ${HOOK_ENDPOINT}`);
    return;
  }

  await sendHook(hookData);
}

// Handle different execution contexts
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendHook };