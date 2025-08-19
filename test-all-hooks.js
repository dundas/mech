#!/usr/bin/env node

/**
 * Test script for all Claude Code hooks
 * This script helps verify that each hook type is working correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logFile = path.join(__dirname, '.claude', 'hook.log');
const testResultsFile = path.join(__dirname, 'hook-test-results.txt');

// Clear previous test results
fs.writeFileSync(testResultsFile, `Hook Test Results - ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`);

function log(message) {
  console.log(message);
  fs.appendFileSync(testResultsFile, message + '\n');
}

function getRecentHookLogs(seconds = 5) {
  try {
    const logs = fs.readFileSync(logFile, 'utf8').split('\n');
    const now = new Date();
    const cutoff = new Date(now - seconds * 1000);
    
    return logs.filter(line => {
      const match = line.match(/\[([\d-T:.Z]+)\]/);
      if (match) {
        const logTime = new Date(match[1]);
        return logTime > cutoff;
      }
      return false;
    });
  } catch (error) {
    return [];
  }
}

function checkHookTriggered(eventType, toolName, timeout = 5000) {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const recentLogs = getRecentHookLogs(10);
      const found = recentLogs.some(log => 
        log.includes(`Hook triggered: ${eventType}`) && 
        log.includes(toolName)
      );
      
      if (found || Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(found);
      }
    }, 500);
  });
}

async function testHooks() {
  log('Starting hook tests...\n');
  
  // Test 1: Read hook
  log('Test 1: Testing Read hook (PostToolUse)');
  log('Action: Reading this test script file');
  // In a real Claude session, you would use the Read tool here
  log('Expected: PostToolUse hook should trigger for Read tool');
  log('Result: Check .claude/hook.log for "PostToolUse - Read"\n');
  
  // Test 2: Write hook  
  log('Test 2: Testing Write hook (PreToolUse and PostToolUse)');
  log('Action: Creating a new test file');
  // In a real Claude session, you would use the Write tool here
  log('Expected: PreToolUse then PostToolUse hooks should trigger');
  log('Result: Check .claude/hook.log for "PreToolUse - Write" and "PostToolUse - Write"\n');
  
  // Test 3: Edit hook
  log('Test 3: Testing Edit hook (PostToolUse)');
  log('Action: Editing an existing file');
  // In a real Claude session, you would use the Edit tool here
  log('Expected: PostToolUse hook should trigger for Edit tool');
  log('Result: Check .claude/hook.log for "PostToolUse - Edit"\n');
  
  // Test 4: Bash hook
  log('Test 4: Testing Bash hook (PreToolUse and PostToolUse)');
  log('Action: Running a bash command');
  // In a real Claude session, you would use the Bash tool here
  log('Expected: PreToolUse then PostToolUse hooks should trigger');
  log('Result: Check .claude/hook.log for "PreToolUse - Bash" and "PostToolUse - Bash"\n');
  
  // Test 5: Task hook
  log('Test 5: Testing Task hook (PostToolUse and SubagentStop)');
  log('Action: Using the Task tool to launch a subagent');
  // In a real Claude session, you would use the Task tool here
  log('Expected: PostToolUse for Task and SubagentStop when complete');
  log('Result: Check .claude/hook.log for "PostToolUse - Task" and "SubagentStop"\n');
  
  // Test 6: UserPromptSubmit
  log('Test 6: Testing UserPromptSubmit hook');
  log('Action: This hook triggers when you submit a prompt to Claude');
  log('Expected: UserPromptSubmit hook should have triggered at the start');
  log('Result: Check .claude/hook.log for "UserPromptSubmit"\n');
  
  // Test 7: SessionStart
  log('Test 7: Testing SessionStart hook');
  log('Action: This hook triggers when a new Claude session starts');
  log('Expected: SessionStart should have triggered at session start');
  log('Result: Check .claude/hook.log for "SessionStart"\n');
  
  // Test 8: Stop hook
  log('Test 8: Testing Stop hook');
  log('Action: This hook triggers when Claude finishes responding');
  log('Expected: Stop hook will trigger after Claude completes');
  log('Result: Check .claude/hook.log for "Stop"\n');
  
  log('\nManual Testing Instructions:');
  log('1. Read a file using Claude - triggers PostToolUse Read');
  log('2. Create a new file - triggers PreToolUse and PostToolUse Write');
  log('3. Edit a file - triggers PostToolUse Edit');
  log('4. Run a bash command - triggers PreToolUse and PostToolUse Bash');
  log('5. Use Task tool - triggers PostToolUse Task and SubagentStop');
  log('6. Submit any prompt - triggers UserPromptSubmit');
  log('7. Complete this session - triggers Stop hook');
  
  log('\nTo monitor hooks in real-time:');
  log('tail -f .claude/hook.log');
  
  log('\nTo check hook execution status:');
  log('grep "✅ Hook sent successfully" .claude/hook.log | tail -20');
  log('grep "❌ Hook failed" .claude/hook.log | tail -20');
}

testHooks().catch(console.error);