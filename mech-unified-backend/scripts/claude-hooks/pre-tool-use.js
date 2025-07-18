#!/usr/bin/env node

/**
 * Claude Code Hook: Pre-Tool Use
 * This script is called before Claude uses a tool
 * It captures the reasoning and tool selection process
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

async function processPreToolUse() {
  try {
    const sessionInfo = loadSessionInfo();
    if (!sessionInfo) {
      console.error('❌ No session info available');
      process.exit(1);
    }

    // Get tool information from environment variables set by Claude Code
    const toolName = process.env.CLAUDE_TOOL_NAME || 'unknown';
    const toolInput = process.env.CLAUDE_TOOL_INPUT || '{}';
    const reasoning = process.env.CLAUDE_REASONING || 'Tool selection reasoning not available';
    
    const hookData = {
      sessionId: sessionInfo.sessionId,
      projectId: sessionInfo.projectId,
      eventType: 'PreToolUse',
      toolName: toolName,
      toolInput: JSON.parse(toolInput),
      reasoning: reasoning,
      metadata: {
        timestamp: new Date().toISOString(),
        workingDirectory: process.cwd(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    console.log(`🛠️  Pre-tool use: ${toolName}`);
    console.log(`💭 Reasoning: ${reasoning.substring(0, 100)}...`);
    
    const response = await makeRequest(`${BACKEND_URL}/api/v2/claude/hook`, hookData);
    
    if (response.status === 200) {
      console.log('✅ Pre-tool use event logged');
      
      // Also store reasoning step
      const reasoningData = {
        sessionId: sessionInfo.sessionId,
        projectId: sessionInfo.projectId,
        type: 'decision',
        content: {
          raw: reasoning,
          summary: `Selected tool: ${toolName}`,
          confidence: 0.9,
          keywords: [toolName, 'tool_selection', 'decision'],
          entities: {
            files: [],
            functions: [],
            variables: [],
            concepts: [toolName]
          }
        },
        context: {
          precedingSteps: [],
          toolsUsed: [toolName],
          filesReferenced: [],
          filesModified: [],
          codeBlocks: [],
          errors: [],
          decisions: [{
            question: 'Which tool should I use?',
            choice: toolName,
            alternatives: [],
            rationale: reasoning
          }]
        },
        metadata: {
          timestamp: new Date(),
          duration: 0,
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
    } else {
      console.error('❌ Failed to log pre-tool use event');
      console.error('Status:', response.status);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error processing pre-tool use:', error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  processPreToolUse();
}

module.exports = { processPreToolUse };