# Multi-Agent System Quick Reference

## Agent Commands

### To Launch All Agents
```bash
./.claude/launch-agents.sh
```

### To Check System Status
```bash
cat .claude/SECURITY_STATUS.md
cat .claude/DEPLOYMENT_STATUS.md  
cat .claude/QUALITY_STATUS.md
cat .claude/DOCUMENTATION_STATUS.md
```

### To Update Status (for agents)
```bash
# Example: Security Agent updating status
echo "Last security scan: $(date)" >> .claude/SECURITY_STATUS.md
```

## Agent Roles Summary

### 🔒 Security & Infrastructure Agent
- Manages credentials and security
- Provisions infrastructure
- Handles DNS and networking
- **File**: `agents/security-infrastructure-agent.md`

### 🚀 Service Deployment Agent  
- Builds and deploys services
- Manages containers and orchestration
- Handles scaling and updates
- **File**: `agents/service-deployment-agent.md`

### 🧪 Quality & Validation Agent
- Tests and validates services
- Monitors performance and health
- Enforces quality standards
- **File**: `agents/quality-validation-agent.md`

### 📚 Documentation & Operations Agent
- Maintains documentation
- Facilitates operations
- Manages knowledge transfer
- **File**: `agents/documentation-operations-agent.md`

## Current System State
- **Infrastructure**: Vultr server 207.148.31.73
- **Services**: 8/8 deployed and operational
- **Security**: All credentials rotated and secure
- **Quality**: All health checks passing

## Emergency Procedures
1. **Security Incident**: Security Agent takes lead
2. **Service Outage**: Deployment Agent takes lead  
3. **Quality Failure**: Quality Agent can halt operations
4. **Documentation Issue**: Documentation Agent coordinates

## Coordination Files
- `MULTI_AGENT_COORDINATION.md` - Main coordination protocol
- `*_STATUS.md` - Individual agent status tracking
- `agents/*.md` - Detailed agent role definitions
