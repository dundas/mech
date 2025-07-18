#!/usr/bin/env node

/**
 * Claude Code Hook: Post-Tool Use
 * This script is called after Claude uses a tool
 * It captures the tool output and results
 */

const { makeRequest } = require('./session-start');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BACKEND_URL = process.env.MECH_UNIFIED_BACKEND_URL || 'http://localhost:3001';

function loadSessionInfo() {
  try {
    const tempFile = path.join(os.tmpdir(), 'claude-session.json');
    const sessionData = fs.readFileSync(tempFile, 'utf8');
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('⚠️  Could not load session info:', error.message);
    return null;
  }
}

function extractFilesFromToolOutput(output) {
  const files = [];
  
  if (typeof output === 'string') {
    // Look for file paths in the output
    const filePattern = /(?:modified|created|updated|wrote|saved)\s+([^\s]+\.[\w]+)/gi;
    let match;
    while ((match = filePattern.exec(output)) !== null) {
      files.push(match[1]);
    }
  } else if (output && typeof output === 'object') {
    // Check for files in structured output
    if (output.files) {
      files.push(...output.files);
    }
    if (output.filesModified) {
      files.push(...output.filesModified);
    }
    if (output.file_path) {
      files.push(output.file_path);
    }
  }
  
  return [...new Set(files)]; // Remove duplicates
}

async function processPostToolUse() {
  try {
    const sessionInfo = loadSessionInfo();
    if (!sessionInfo) {
      console.error('❌ No session info available');
      process.exit(1);
    }

    // Get tool information from environment variables set by Claude Code
    const toolName = process.env.CLAUDE_TOOL_NAME || 'unknown';
    const toolOutput = process.env.CLAUDE_TOOL_OUTPUT || '{}';
    const toolSuccess = process.env.CLAUDE_TOOL_SUCCESS === 'true';
    const toolError = process.env.CLAUDE_TOOL_ERROR || null;
    
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(toolOutput);
    } catch (e) {
      parsedOutput = toolOutput;
    }
    
    const filesModified = extractFilesFromToolOutput(parsedOutput);
    
    const hookData = {
      sessionId: sessionInfo.sessionId,
      projectId: sessionInfo.projectId,
      eventType: 'PostToolUse',
      toolName: toolName,
      toolOutput: {
        success: toolSuccess,
        result: parsedOutput,
        error: toolError,
        filesModified: filesModified,
        timestamp: new Date().toISOString()
      },
      metadata: {
        timestamp: new Date().toISOString(),
        workingDirectory: process.cwd(),
        environment: process.env.NODE_ENV || 'development',
        executionTime: process.env.CLAUDE_TOOL_EXECUTION_TIME || 0
      }
    };

    console.log(`🔧 Post-tool use: ${toolName}`);
    console.log(`${toolSuccess ? '✅' : '❌'} Tool ${toolSuccess ? 'succeeded' : 'failed'}`);
    if (filesModified.length > 0) {
      console.log(`📝 Files modified: ${filesModified.join(', ')}`);
    }
    
    const response = await makeRequest(`${BACKEND_URL}/api/v2/claude/hook`, hookData);
    
    if (response.status === 200) {
      console.log('✅ Post-tool use event logged');
      
      // Store reasoning step for tool execution
      const reasoningData = {
        sessionId: sessionInfo.sessionId,
        projectId: sessionInfo.projectId,
        type: 'execution',
        content: {
          raw: JSON.stringify(parsedOutput),
          summary: `Tool ${toolName} ${toolSuccess ? 'completed successfully' : 'failed'}`,
          confidence: toolSuccess ? 0.95 : 0.5,
          keywords: [toolName, 'tool_execution', toolSuccess ? 'success' : 'failure'],
          entities: {
            files: filesModified,
            functions: [],
            variables: [],
            concepts: [toolName]
          }
        },
        context: {
          precedingSteps: [],
          toolsUsed: [toolName],
          filesReferenced: filesModified,
          filesModified: filesModified,
          codeBlocks: [],
          errors: toolError ? [{
            message: toolError,
            type: 'tool_error',
            resolved: false
          }] : [],
          decisions: []
        },
        metadata: {
          timestamp: new Date(),
          duration: parseInt(process.env.CLAUDE_TOOL_EXECUTION_TIME) || 0,
          tokenCount: {
            prompt: 0,
            completion: 0,
            total: 0
          },
          model: 'claude',
          temperature: 0.7,
          maxTokens: 4096
        }
      };
      
      const reasoningResponse = await makeRequest(`${BACKEND_URL}/api/v2/reasoning`, reasoningData);
      
      if (reasoningResponse.status === 201) {
        console.log('✅ Reasoning step stored');
      } else {
        console.warn('⚠️  Failed to store reasoning step');
      }
      
      // Update session statistics
      const statsUpdate = {
        statistics: {
          toolInvocations: 1,
          filesModified: filesModified.length,
          errorsEncountered: toolError ? 1 : 0
        }
      };
      
      const statsResponse = await makeRequest(
        `${BACKEND_URL}/api/v2/sessions/${sessionInfo.sessionId}/state`,
        statsUpdate,
        'PATCH'
      );
      
      if (statsResponse.status === 200) {
        console.log('✅ Session statistics updated');
      } else {
        console.warn('⚠️  Failed to update session statistics');
      }
    } else {
      console.error('❌ Failed to log post-tool use event');
      console.error('Status:', response.status);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error processing post-tool use:', error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  processPostToolUse();
}

module.exports = { processPostToolUse };