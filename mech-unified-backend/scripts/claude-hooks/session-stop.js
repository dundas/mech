#!/usr/bin/env node

/**
 * Claude Code Hook: Session Stop
 * This script is called when a Claude Code session ends
 * It closes the session and provides a summary
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

function generateSessionSummary(sessionInfo) {
  const duration = new Date() - new Date(sessionInfo.startTime);
  const durationMinutes = Math.round(duration / 60000);
  
  return {
    sessionId: sessionInfo.sessionId,
    projectId: sessionInfo.projectId,
    duration: duration,
    durationHuman: `${durationMinutes} minutes`,
    endTime: new Date().toISOString(),
    reason: process.env.CLAUDE_STOP_REASON || 'session_completed',
    summary: process.env.CLAUDE_SESSION_SUMMARY || 'Session completed successfully'
  };
}

async function endSession() {
  try {
    const sessionInfo = loadSessionInfo();
    if (!sessionInfo) {
      console.error('❌ No session info available');
      process.exit(1);
    }

    const summary = generateSessionSummary(sessionInfo);
    
    const hookData = {
      sessionId: sessionInfo.sessionId,
      projectId: sessionInfo.projectId,
      eventType: 'Stop',
      metadata: {
        ...summary,
        timestamp: new Date().toISOString(),
        workingDirectory: process.cwd(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    console.log(`🛑 Ending Claude Code session...`);
    console.log(`📊 Session duration: ${summary.durationHuman}`);
    console.log(`📋 Session ID: ${summary.sessionId}`);
    
    const response = await makeRequest(`${BACKEND_URL}/api/v2/claude/hook`, hookData);
    
    if (response.status === 200) {
      console.log('✅ Session stop event logged');
      
      // End the session in the backend
      const endData = {
        summary: summary.summary
      };
      
      const endResponse = await makeRequest(
        `${BACKEND_URL}/api/v2/sessions/${sessionInfo.sessionId}/end`,
        endData,
        'POST'
      );
      
      if (endResponse.status === 200) {
        console.log('✅ Session ended successfully');
        console.log('📈 Final session statistics:');
        
        // Get final session stats
        const statsResponse = await makeRequest(
          `${BACKEND_URL}/api/v2/sessions/${sessionInfo.sessionId}/stats`,
          {},
          'GET'
        );
        
        if (statsResponse.status === 200) {
          const stats = statsResponse.data.stats;
          console.log(`   • Tools used: ${stats.toolInvocations || 0}`);
          console.log(`   • Files modified: ${stats.filesModified || 0}`);
          console.log(`   • Reasoning steps: ${stats.reasoningSteps || 0}`);
          console.log(`   • Errors encountered: ${stats.errorsEncountered || 0}`);
          console.log(`   • Tokens used: ${stats.tokensUsed || 0}`);
        }
        
        // Clean up session file
        try {
          const tempFile = path.join(os.tmpdir(), 'claude-session.json');
          fs.unlinkSync(tempFile);
          console.log('🗑️  Session file cleaned up');
        } catch (error) {
          console.warn('⚠️  Could not clean up session file:', error.message);
        }
        
        console.log('🎉 Claude Code session ended successfully');
      } else {
        console.error('❌ Failed to end session');
        console.error('Status:', endResponse.status);
        console.error('Response:', endResponse.data);
      }
    } else {
      console.error('❌ Failed to log session stop event');
      console.error('Status:', response.status);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error ending session:', error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  endSession();
}

module.exports = { endSession };