# AI Agent Testing Framework

**Version**: 1.0.0  
**Created**: 2025-01-27  
**Purpose**: Standardize how AI agents create test plans, execute tests, and report findings

## 📋 Overview

This framework provides a standardized approach for AI agents to:
1. **Plan** - Outline test scenarios with clear objectives
2. **Execute** - Run tests systematically with evidence
3. **Report** - Document findings in a consistent format
4. **Handoff** - Transfer knowledge between agents effectively

## 🏗️ Test Plan Structure

### 1. Test Definition Template

```markdown
# [Feature/Component] Test Plan
**Test ID**: [UNIQUE-ID]
**Created By**: [Agent Name]
**Date**: [ISO Date]
**Feature**: [What is being tested]
**Dependencies**: [Required services, data, or conditions]

## Objectives
- [ ] Primary objective 1
- [ ] Primary objective 2
- [ ] Secondary objective 1

## Test Scenarios
### Scenario 1: [Name]
**Purpose**: [Why this test matters]
**Preconditions**: [What must be true before testing]
**Test Steps**:
1. [Specific action]
2. [Expected observation]
3. [Validation method]

**Success Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Evidence Required**:
- Screenshots/Logs of [specific element]
- API response showing [specific data]
- Console output demonstrating [specific behavior]
```

### 2. Test Execution Tracking

```markdown
## Test Execution Log
**Executor**: [Agent Name]
**Start Time**: [Timestamp]
**Environment**: [URL/Version/Config]

### Pre-Test Validation
- [ ] Environment accessible
- [ ] Dependencies verified
- [ ] Test data prepared
- [ ] Known issues reviewed

### Execution Timeline
| Time | Action | Result | Evidence |
|------|--------|--------|----------|
| 10:00:00 | Started login flow | Success | screenshot_001.png |
| 10:00:15 | Entered credentials | Success | - |
| 10:00:30 | Clicked submit | Failed | error_log_001.txt |
```

## 📊 Findings Report Structure

### 1. Executive Summary Template

```markdown
# Test Report: [Feature Name]
**Report ID**: TR-[YYYYMMDD]-[001]
**Test Plan ID**: [Reference to test plan]
**Executed By**: [Agent Name]
**Duration**: [Total time]
**Overall Status**: PASS/FAIL/PARTIAL

## Summary
- **Tests Executed**: [X/Y]
- **Pass Rate**: [X%]
- **Critical Issues**: [Count]
- **Recommendations**: [Count]

## Key Findings
1. **[Finding Category]**: [Brief description]
   - Impact: HIGH/MEDIUM/LOW
   - Evidence: [Reference]
```

### 2. Detailed Findings Format

```markdown
## Finding: [FIND-001] [Title]
**Severity**: CRITICAL/HIGH/MEDIUM/LOW
**Category**: Functional/Performance/Security/UX
**Status**: OPEN/VERIFIED/FALSE_POSITIVE

### Description
[Clear explanation of what was found]

### Evidence
- **Screenshot**: [Path/Reference]
- **Logs**: 
  ```
  [Relevant log excerpt]
  ```
- **Steps to Reproduce**:
  1. [Step 1]
  2. [Step 2]

### Impact Analysis
- **User Impact**: [How users are affected]
- **Business Impact**: [Business consequences]
- **Technical Impact**: [System implications]

### Recommendation
[Specific actionable recommendation]
```

## 🤝 Agent Handoff Protocol

### 1. Handoff Checklist

```markdown
# Test Handoff: [From Agent] → [To Agent]
**Handoff ID**: HO-[YYYYMMDD]-[001]
**Date**: [ISO Date]
**Context**: [Why handoff is needed]

## Completed Work
- [x] Test scenarios 1-5 executed
- [x] Critical bug FIND-001 documented
- [ ] Performance tests (blocked by issue X)

## Artifacts Provided
- Test execution logs: `/path/to/logs/`
- Screenshots: `/path/to/screenshots/`
- Test data: `/path/to/test-data/`
- Environment config: `config.json`

## Context for Next Agent
### Current State
[Description of where testing stands]

### Blockers
1. [Blocker 1] - [Suggested workaround]
2. [Blocker 2] - [Dependencies needed]

### Recommended Next Steps
1. [Priority 1 action]
2. [Priority 2 action]
3. [Optional enhancement]

## Access Information
- **Test Environment**: [URL]
- **Credentials**: Always in `.env` file
  - `TESTER_EMAIL` - Test user email
  - `TESTER_PASSWORD` - Test user password
- **API Keys**: [Secure reference]
- **Special Instructions**: [Any quirks or tips]
```

### 2. Handoff Acknowledgment

```markdown
# Handoff Acknowledgment
**Original Handoff**: HO-[YYYYMMDD]-[001]
**Receiving Agent**: [Name]
**Acknowledged**: [Timestamp]

## Handoff Review
- [x] Artifacts received and accessible
- [x] Context understood
- [x] Blockers acknowledged
- [ ] Questions for clarification

## Questions/Clarifications
1. [Question about specific finding]
2. [Need more context on X]

## Planned Approach
[Brief description of how receiving agent will proceed]
```

## 🔑 Standard Test Credentials

### Environment Variables
All test credentials must be stored in the `.env` file:
```bash
# Required test user credentials
TESTER_EMAIL=test@example.com
TESTER_PASSWORD=secure_test_password

# Optional test-specific variables
TEST_PROJECT_ID=project_id_here
TEST_API_KEY=api_key_if_needed
```

### Credential Access Pattern
```javascript
// Example: Accessing test credentials in scripts
const testEmail = process.env.TESTER_EMAIL;
const testPassword = process.env.TESTER_PASSWORD;

// For Playwright/automated tests
await page.fill('[name="email"]', process.env.TESTER_EMAIL);
await page.fill('[name="password"]', process.env.TESTER_PASSWORD);
```

### Security Notes
- Never hardcode credentials in test files
- Always use environment variables
- Don't commit `.env` files to version control
- Document which env vars are required in README

## 📁 File Organization

### Standard Directory Structure
```
/tests/
├── /[YYYYMMDD]-[feature-name]/
│   ├── test-plan.md
│   ├── execution-log.md
│   ├── findings-report.md
│   ├── /evidence/
│   │   ├── screenshots/
│   │   ├── logs/
│   │   └── data/
│   └── handoff.md (if applicable)
├── /shared-resources/
│   ├── test-data/
│   └── tools/
└── testing-index.md
```

### Naming Conventions
- Test Plans: `TP-[YYYYMMDD]-[feature]-plan.md`
- Reports: `TR-[YYYYMMDD]-[feature]-report.md`
- Findings: `FIND-[3-digit-number]-[brief-description]`
- Evidence: `[type]-[3-digit-number]-[description].[ext]`

## 🔄 Test Categories

### 1. Functional Testing
- **Focus**: Features work as designed
- **Evidence**: Screenshots, API responses
- **Success Metric**: All acceptance criteria met

### 2. Integration Testing
- **Focus**: Components work together
- **Evidence**: End-to-end flow documentation
- **Success Metric**: Complete workflows succeed

### 3. Performance Testing
- **Focus**: Speed and resource usage
- **Evidence**: Metrics, profiler outputs
- **Success Metric**: Meets performance targets

### 4. Security Testing
- **Focus**: Vulnerabilities and access control
- **Evidence**: Penetration test results
- **Success Metric**: No critical vulnerabilities

### 5. Usability Testing
- **Focus**: User experience quality
- **Evidence**: Task completion times, error rates
- **Success Metric**: Intuitive and efficient

## 📈 Metrics & Reporting

### Standard Metrics to Track
```markdown
## Test Metrics
- **Coverage**: [X]% of features tested
- **Automation**: [X]% automated vs manual
- **Defect Density**: [X] issues per feature
- **Mean Time to Detect**: [X] minutes
- **False Positive Rate**: [X]%
- **Regression Rate**: [X]% of fixes cause new issues
```

### Trend Reporting
```markdown
## Testing Trends
### Week-over-Week
- Test Execution: ↑ 15%
- Pass Rate: ↓ 3%
- Critical Issues: → Stable

### Recommendations Based on Trends
1. [Trend observation] → [Recommended action]
2. [Pattern identified] → [Preventive measure]
```

## 🚀 Best Practices

### For Test Planning Agents
1. **Be Specific**: Vague tests lead to inconsistent results
2. **Include Context**: Why each test matters
3. **Define Evidence**: What proof is needed
4. **Set Clear Criteria**: Unambiguous pass/fail conditions

### For Test Execution Agents
1. **Document Everything**: Even unexpected observations
2. **Capture Evidence**: Screenshots, logs, data
3. **Follow the Plan**: Deviations should be noted
4. **Report Immediately**: Don't wait for critical issues

### For Reporting Agents
1. **Lead with Impact**: Business impact before technical details
2. **Be Actionable**: Every finding needs a recommendation
3. **Provide Evidence**: Support every claim
4. **Prioritize Clearly**: Use consistent severity ratings

### For Handoff Situations
1. **Over-Communicate**: Too much context is better than too little
2. **Organize Artifacts**: Make resources easy to find
3. **Test Access**: Verify credentials work
4. **Set Expectations**: Clear next steps

## 📝 Templates

### Quick Test Template
```markdown
# Quick Test: [Feature]
**Objective**: [One line description]
**Steps**:
1. [Action] → [Expected Result]
2. [Action] → [Expected Result]
**Result**: PASS/FAIL
**Notes**: [Any observations]
```

### Bug Report Template
```markdown
# Bug: [Title]
**Severity**: P1/P2/P3
**Found in**: [Test scenario]
**Description**: [What's wrong]
**Impact**: [Who/what is affected]
**Workaround**: [If any]
**Fix Suggestion**: [If known]
```

## 🔗 Integration with CI/CD

### Automated Test Triggers
```yaml
# Example: Trigger test agent on PR
on:
  pull_request:
    types: [opened, synchronize]
  
jobs:
  ai-test:
    runs-on: ubuntu-latest
    steps:
      - name: Execute AI Test Agent
        run: |
          ai-agent test \
            --plan ./tests/current-plan.md \
            --report ./tests/reports/
```

### Results Integration
- Format findings as GitHub issues
- Update test dashboards
- Notify relevant teams
- Track in project management tools

## 📚 Appendix

### Severity Definitions
- **CRITICAL**: System unusable, data loss, security breach
- **HIGH**: Major feature broken, significant UX issue
- **MEDIUM**: Minor feature issue, workaround exists
- **LOW**: Cosmetic, enhancement opportunity

### Evidence Types
- **Screenshot**: Visual proof of UI state
- **Log**: System output or error messages
- **Video**: Complex interactions or intermittent issues
- **Data**: API responses, database states
- **Metrics**: Performance measurements

### Status Definitions
- **PASS**: All criteria met
- **FAIL**: One or more criteria not met
- **PARTIAL**: Some criteria met, some blocked
- **BLOCKED**: Cannot test due to external factor
- **SKIPPED**: Intentionally not tested

---

This framework ensures consistent, high-quality testing across all AI agents, enabling efficient collaboration and reliable results.