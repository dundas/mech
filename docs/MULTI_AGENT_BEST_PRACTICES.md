# Multi-Agent Development Best Practices for Mech AI

## Overview

This document outlines best practices for employing multiple AI agents on the Mech AI project, combining proven multi-agent orchestration patterns with project-specific requirements for our microservices architecture.

## Core Principles

### 1. Agent Specialization by Service Domain
Unlike generic multi-agent setups, we organize agents around our service architecture:

- **Service-Specific Agents**: Each major service (reader, indexer, storage, llm, sequences) gets a dedicated agent
- **Cross-Cutting Agents**: Infrastructure, security, and integration agents handle concerns across services
- **Domain Expertise**: Agents develop deep knowledge of their assigned services

### 2. Structured Communication Protocol
Agents communicate through:
- **Central Planning Document**: `MULTI_AGENT_PLAN.md` in project root
- **Service-Specific Docs**: `<service>/AGENT_NOTES.md` for service-specific context
- **Hook Integration**: Claude Code hooks automatically track agent activities

## Recommended Agent Configuration

### Primary Service Agents

#### Agent 1: Infrastructure Architect
```
Role: Infrastructure & Deployment Specialist
Focus: Vultr deployment, Docker configurations, Nginx routing
Responsibilities:
- Monitor deployment health
- Optimize resource usage
- Handle SSL/TLS configuration
- Manage container registry
Primary Services: mech-machines, deployment scripts
```

#### Agent 2: Core Services Developer
```
Role: Core Service Implementation
Focus: reader, indexer, storage services
Responsibilities:
- Feature implementation
- Service integration
- API development
- Performance optimization
Primary Services: mech-reader, mech-indexer, mech-storage
```

#### Agent 3: AI/ML Services Engineer
```
Role: AI Service Specialist
Focus: llm, sequences, queue services
Responsibilities:
- LLM integration management
- Workflow orchestration
- Queue optimization
- Model performance
Primary Services: mech-llms, mech-sequences, mech-queue
```

#### Agent 4: Quality & Security Validator
```
Role: Testing, Security & Documentation
Focus: Cross-service validation
Responsibilities:
- Security audits
- Integration testing
- Documentation updates
- Compliance checks
Primary Services: All services (validation role)
```

### Supporting Agents (As Needed)

#### Agent 5: Frontend Integration Specialist
```
Role: Frontend/Backend Integration
Focus: mech-ai/frontend and API contracts
Responsibilities:
- API integration
- Real-time features
- User experience
```

#### Agent 6: Database & Memory Specialist
```
Role: Data Layer Management
Focus: MongoDB, Redis, memory services
Responsibilities:
- Schema optimization
- Query performance
- Data consistency
```

## Project-Specific Best Practices

### 1. Service Deployment Workflow

**Before Any Deployment:**
```bash
# Agent must verify:
1. Check current service status: ./test-all-services.sh
2. Review deployment target: cat .env.production
3. Confirm Docker registry access
4. Check droplet resources
```

**Deployment Protocol:**
```bash
# Single agent owns deployment at a time
# Use deployment lock file: touch .deployment.lock
# Clear after deployment: rm .deployment.lock
```

### 2. Service Development Guidelines

**For New Features:**
1. **Planning Agent** creates feature spec in `docs/features/`
2. **Service Agent** implements in isolated branch
3. **Validator Agent** writes tests before merge
4. **Infrastructure Agent** handles deployment

**For Bug Fixes:**
1. **Any Agent** can identify and document bug
2. **Service Owner Agent** implements fix
3. **Validator Agent** confirms fix and adds regression test

### 3. Communication Patterns

**Service Integration Changes:**
```markdown
## Integration Change Request
**From**: Agent 2 (Core Services)
**To**: Agent 3 (AI Services)
**Service**: mech-reader → mech-llms
**Change**: New endpoint /api/v2/extract requires different auth header
**Impact**: Update LLM service client by EOD
**Branch**: feature/reader-v2-api
```

**Deployment Notifications:**
```markdown
## Deployment Notice
**Agent**: Infrastructure Architect
**Service**: mech-indexer
**Version**: 1.2.3
**Time**: 2024-12-09 15:00 UTC
**Changes**: Performance improvements, new vector model
**Rollback Plan**: Previous image tagged as 1.2.2
```

### 4. Vultr-Specific Considerations

**Resource Management:**
- Monitor droplet resources before deploying new services
- Coordinate memory-intensive operations (avoid concurrent indexing + LLM operations)
- Use deployment windows during low-traffic periods

**Network Configuration:**
- Document all port assignments in `service-configs/ports.md`
- Update Nginx configurations through Infrastructure Agent only
- Test SSL certificates before switching DNS

### 5. Enhanced Coordination Features

**Daily Sync Protocol:**
```markdown
## Daily Sync - [Date]
### Infrastructure Status
- Droplet Health: [CPU/Memory/Disk]
- Service Uptime: [List]
- Pending Deployments: [Queue]

### Active Development
- Agent 1: [Current Task]
- Agent 2: [Current Task]
- Agent 3: [Current Task]
- Agent 4: [Current Task]

### Blockers
- [List any inter-agent dependencies]

### Today's Priorities
1. [Highest priority task]
2. [Second priority]
3. [Third priority]
```

**Emergency Response:**
```markdown
## INCIDENT: [Service] Down
**Detected By**: [Agent]
**Time**: [Timestamp]
**Impact**: [User-facing impact]
**Response Team**: 
  - Infrastructure Agent (lead)
  - Service Owner Agent
**Status Updates**: Every 15 minutes
```

### 6. Code Quality Standards

**Service-Specific Standards:**
- Each service maintains `.agent-standards.md`
- Include code style, testing requirements, deployment checklist
- Agents must review before making changes

**Cross-Service Standards:**
- API versioning: `/api/v{n}/`
- Error formats: Consistent error response structure
- Logging: Structured JSON logs with correlation IDs
- Health checks: `/health` endpoint required

### 7. Advanced Multi-Agent Patterns

**Parallel Development:**
```bash
# Each agent works on separate feature branch
agent1/infra-ssl-setup
agent2/reader-pdf-optimization  
agent3/llm-streaming-response
agent4/security-audit-q4

# Merge coordination through planning doc
```

**Service Mesh Navigation:**
```markdown
## Service Dependency Map
mech-reader → mech-queue → mech-llms
mech-indexer → mech-storage
mech-sequences → mech-queue → all-services
```

**Knowledge Transfer:**
```markdown
## Agent Handoff Template
**From Agent**: [Name/Role]
**To Agent**: [Name/Role]
**Context**: [What was being worked on]
**Current State**: [Where things stand]
**Next Steps**: [What needs to be done]
**Key Files**: [Important files to review]
**Gotchas**: [Any tricky parts to watch for]
```

### 8. Monitoring and Observability

**Agent Responsibilities:**
- Infrastructure Agent: System metrics, uptime monitoring
- Service Agents: Service-specific metrics, error rates
- Validator Agent: End-to-end monitoring, SLA compliance

**Required Monitoring:**
```yaml
Per Service:
  - Request rate
  - Error rate  
  - Response time (p50, p95, p99)
  - Active connections
  - Memory/CPU usage

Cross-Service:
  - End-to-end latency
  - Service dependency health
  - Queue depths
  - Database connection pools
```

### 9. Security Protocols

**Credential Management:**
- Only Infrastructure Agent modifies production credentials
- Use `.env.example` files for documentation
- Rotate API keys quarterly (tracked in planning doc)

**Security Reviews:**
- Validator Agent performs weekly security scans
- Document findings in `security/weekly-reports/`
- Critical issues get immediate attention from all agents

### 10. Continuous Improvement

**Retrospectives:**
- Weekly agent retrospective in planning doc
- Document what worked/didn't work
- Adjust agent roles based on project needs

**Knowledge Base:**
- Each agent maintains service runbooks
- Document common issues and solutions
- Share debugging techniques

## Getting Started

### Initial Setup (5 minutes)

1. **Create Agent Memory Files:**
```bash
# Save this document to memory
cp docs/MULTI_AGENT_BEST_PRACTICES.md .claude/memory/
cp docs/MULTI_AGENT_BEST_PRACTICES.md .claude/usermemory/
```

2. **Initialize Planning Document:**
```bash
# In project root
echo "# Mech AI Multi-Agent Plan" > MULTI_AGENT_PLAN.md
echo "Generated: $(date)" >> MULTI_AGENT_PLAN.md
```

3. **Launch Agents:**
```bash
# Terminal 1: Infrastructure
claude --no-prompt
> You are Agent 1 - Infrastructure Architect for Mech AI. Initialize MULTI_AGENT_PLAN.md with current infrastructure status.

# Terminal 2: Core Services  
claude --no-prompt
> You are Agent 2 - Core Services Developer for Mech AI. Review MULTI_AGENT_PLAN.md and check mech-reader, mech-indexer, mech-storage status.

# Terminal 3: AI Services
claude --no-prompt  
> You are Agent 3 - AI Services Engineer for Mech AI. Review MULTI_AGENT_PLAN.md and check mech-llms, mech-sequences, mech-queue status.

# Terminal 4: Validator
claude --no-prompt
> You are Agent 4 - Quality & Security Validator for Mech AI. Review MULTI_AGENT_PLAN.md and run initial service health checks.
```

### Quick Commands

**Check Agent Status:**
```bash
node .claude/hooks/agent-status.cjs
```

**Reset Agents:**
```bash
node .claude/hooks/agent-reset.cjs --all
```

**View Agent Activity:**
```bash
tail -f .claude/progress.log
```

## Advanced Patterns

### 1. Canary Deployments
- Deploy to single container first
- Monitor for 30 minutes
- Roll out to remaining containers

### 2. Blue-Green Deployments
- Maintain two environments
- Switch Nginx routing
- Keep previous version warm

### 3. Feature Flags
- Use environment variables
- Test in production safely
- Gradual rollout capability

### 4. Chaos Engineering
- Validator Agent runs failure scenarios
- Test service resilience
- Document recovery procedures

## Metrics for Success

Track these KPIs to measure multi-agent effectiveness:

1. **Deployment Frequency**: Target 5+ deployments/week
2. **Mean Time to Recovery**: Target < 30 minutes
3. **Cross-Service Bug Rate**: Target < 5/month
4. **Documentation Coverage**: Target 100% for public APIs
5. **Test Coverage**: Target > 80% for critical paths

## Troubleshooting

### Common Issues

**Agent Conflicts:**
- Check deployment lock
- Review planning document
- Coordinate through chat message

**Service Dependencies:**
- Verify service health
- Check network connectivity  
- Review error logs

**Resource Constraints:**
- Monitor droplet metrics
- Stagger resource-intensive operations
- Consider service optimization

## Conclusion

This multi-agent approach is specifically tailored for the Mech AI project's microservices architecture. By combining specialized agents with clear communication protocols and project-specific workflows, we can achieve faster development cycles, better quality, and improved operational reliability.

Remember: The key to success is adaptation. Adjust agent roles and responsibilities based on current project needs and team feedback.