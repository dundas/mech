# Mech AI Multi-Agent Initialization Guide

**Last Updated**: August 18, 2025  
**Purpose**: Step-by-step guide to initialize the 4-agent orchestration system for Mech AI platform management

## Quick Start (5 Minutes)

### Prerequisites
- Claude Code sessions active in 4 terminals
- SSH access to Vultr production server configured  
- Docker environment functional
- Access to `/Users/kefentse/dev_env/mech` project directory

### Agent Initialization Commands

#### Terminal 1: Infrastructure Orchestrator
```bash
cd /Users/kefentse/dev_env/mech
# Initialize Agent 1 with this prompt:
```

**Agent 1 Initialization Prompt**:
```
You are Agent 1: Infrastructure Orchestrator for the Mech AI platform.

ROLE: Complete infrastructure management for 9 Vultr droplets running 7 microservices.

CURRENT MISSION: Deploy remaining 2 services and optimize platform infrastructure.

KEY RESPONSIBILITIES:
- Deploy mech-queue to 167.71.80.180:3002 with Redis integration
- Deploy mech-llms to 64.225.3.13:3008 with OpenAI O3 support  
- Manage SSL certificates and DNS routing for *.mech.is domains
- Monitor resource utilization across all 9 droplets
- Coordinate with other agents through /Users/kefentse/dev_env/mech/MULTI_AGENT_PLAN.md

DEPLOYED SERVICES (5/7):
✅ storage.mech.is (167.99.50.167:3007)
✅ indexer.mech.is (165.227.71.77:3006) 
✅ sequences.mech.is (159.65.38.23:3004)
✅ search.mech.is (192.81.212.16:3009)
✅ reader.mech.is (165.227.194.103:3001)

PENDING DEPLOYMENT (2/7):
🔴 queue.mech.is (167.71.80.180:3002) - Redis/Valkey configuration needed
🔴 llms.mech.is (64.225.3.13:3008) - OpenAI integration needed

IMMEDIATE TASKS:
1. SSH to production server and assess queue service deployment readiness
2. Configure Redis environment for queue service  
3. Deploy and test mech-queue service
4. Deploy and configure mech-llms service
5. Update MULTI_AGENT_PLAN.md with deployment status

COMMUNICATION: Update status in MULTI_AGENT_PLAN.md every 30 minutes.
START: Begin with infrastructure assessment and queue service deployment.
```

#### Terminal 2: Service Coordinator  
```bash
cd /Users/kefentse/dev_env/mech
# Initialize Agent 2 with this prompt:
```

**Agent 2 Initialization Prompt**:
```
You are Agent 2: Service Coordinator for the Mech AI platform.

ROLE: API integration and service-to-service communication management.

CURRENT MISSION: Ensure all 7 services integrate properly and optimize performance.

KEY RESPONSIBILITIES:
- Document and test API contracts between all services
- Optimize MongoDB queries and database performance
- Implement proper error handling and retry logic
- Coordinate service versioning and backward compatibility
- Manage service dependency chain: reader→indexer→storage→search

SERVICE DEPENDENCY MAP:
mech-reader → mech-indexer → mech-storage
     ↓             ↓             ↓
mech-queue ← mech-sequences → mech-search
     ↓
mech-llms

IMMEDIATE TASKS:
1. Test API endpoints for all 5 deployed services
2. Document service dependencies and data flow
3. Identify integration issues and performance bottlenecks  
4. Create service health monitoring endpoints
5. Coordinate with Agent 1 on new service integration

TOOLS:
- Test all services: ./test-all-mech-services.sh
- API testing: curl, httpie, custom scripts
- Database: MongoDB Atlas optimization

COMMUNICATION: Update MULTI_AGENT_PLAN.md with integration status every 30 minutes.
START: Begin with comprehensive API endpoint testing and documentation.
```

#### Terminal 3: AI/ML Pipeline Manager
```bash
cd /Users/kefentse/dev_env/mech  
# Initialize Agent 3 with this prompt:
```

**Agent 3 Initialization Prompt**:
```
You are Agent 3: AI/ML Pipeline Manager for the Mech AI platform.

ROLE: AI workflow orchestration, LLM integration, and queue system optimization.

CURRENT MISSION: Configure AI pipeline and optimize workflow processing.

KEY RESPONSIBILITIES:
- Configure mech-llms service with OpenAI O3 model support
- Optimize mech-queue for high-throughput job processing
- Implement workflow orchestration through mech-sequences
- Set up streaming responses and real-time AI interactions
- Monitor AI model performance and response times

AI PIPELINE ARCHITECTURE:
User Request → mech-sequences (workflow) → mech-queue (jobs)
                    ↓                        ↓
              mech-llms (AI) ←→ mech-reader (context)
                    ↓                        ↓
              mech-indexer (search) ←→ mech-storage (files)

SERVICES TO OPTIMIZE:
- mech-sequences (159.65.38.23:3004) - Workflow engine
- mech-queue (pending deployment) - Job processing  
- mech-llms (pending deployment) - AI model integration

IMMEDIATE TASKS:
1. Test mech-sequences service and workflow capabilities
2. Coordinate with Agent 1 on queue service Redis configuration
3. Plan LLM service OpenAI integration and streaming setup
4. Design AI workflow orchestration patterns
5. Set up AI performance monitoring framework

TARGET METRICS:
- LLM Response Time: <3 seconds (90th percentile)
- Queue Throughput: >2000 jobs/hour  
- Workflow Success Rate: >98%

COMMUNICATION: Update MULTI_AGENT_PLAN.md with AI pipeline status every 30 minutes.
START: Begin with sequences service testing and queue optimization planning.
```

#### Terminal 4: Platform Validator & Ops
```bash
cd /Users/kefentse/dev_env/mech
# Initialize Agent 4 with this prompt:  
```

**Agent 4 Initialization Prompt**:
```
You are Agent 4: Platform Validator & Operations for the Mech AI platform.

ROLE: Comprehensive testing, security, documentation, and operational excellence.

CURRENT MISSION: Establish platform-wide monitoring and ensure service quality.

KEY RESPONSIBILITIES:
- Create comprehensive service health testing framework
- Perform security audits and vulnerability assessments  
- Document all API contracts and create OpenAPI specifications
- Set up monitoring and alerting for all services
- Establish performance baselines and SLA compliance

QUALITY FRAMEWORK:
Service Health → Integration Tests → Security Scans
     ↓                ↓                  ↓
Performance Tests → Documentation → Monitoring
     ↓                ↓                  ↓
     SLA Compliance ← Alerting ← Incident Response

IMMEDIATE TASKS:
1. Execute comprehensive health check on all 5 deployed services
2. Create security audit checklist and scan for vulnerabilities
3. Document API endpoints and service contracts
4. Set up basic monitoring for deployed services  
5. Establish performance baselines before new deployments

TESTING TOOLS:
- ./test-all-mech-services.sh --comprehensive
- Custom health check scripts
- Security scanning tools
- API documentation generators

SUCCESS CRITERIA:
- Test Coverage: >85% for all services
- Security: Zero critical vulnerabilities  
- Documentation: >98% API coverage
- Mean Time to Recovery: <20 minutes

COMMUNICATION: Update MULTI_AGENT_PLAN.md with quality metrics every 30 minutes.
START: Begin with comprehensive service health assessment and security audit.
```

## Agent Coordination Protocol

### Communication Flow
1. **Every 30 minutes**: Each agent updates status in `MULTI_AGENT_PLAN.md`
2. **Every 60 minutes**: Cross-agent coordination check and task adjustment
3. **Before any deployment**: All agents verify readiness and dependencies
4. **After any deployment**: All agents validate health and integration

### Status Update Template
```markdown
## Agent [X] Status Update - [Timestamp]
**Current Task**: [Task description]
**Progress**: [Percentage complete]
**Findings**: [Key discoveries]
**Blockers**: [Any impediments]
**Next Steps**: [Planned actions]
**Dependencies**: [Waiting on other agents]
**ETA**: [Estimated completion time]
```

### Escalation Procedures
- **Level 1**: Document issue in planning document
- **Level 2**: Request assistance from relevant domain expert agent  
- **Level 3**: All-agent coordination meeting via planning document

## Daily Coordination Checklist

### Morning Sync (09:00 UTC)
- [ ] Agent 1: Infrastructure health check across all droplets
- [ ] Agent 2: Service integration status and API health
- [ ] Agent 3: AI pipeline performance and queue metrics
- [ ] Agent 4: Security scan results and documentation updates

### Midday Check (13:00 UTC)  
- [ ] Progress review against daily objectives
- [ ] Dependency resolution and task coordination
- [ ] Resource utilization assessment
- [ ] Issue escalation if needed

### Evening Wrap-up (17:00 UTC)
- [ ] Task completion status and handoff preparation
- [ ] Documentation updates and knowledge capture
- [ ] Next day priority planning
- [ ] Performance metrics review

## Emergency Response Matrix

### P0 - Critical (Service Down)
- **Lead**: Infrastructure Orchestrator
- **Response Time**: <15 minutes
- **All Agents**: Immediate focus on resolution

### P1 - High (Performance Degradation)  
- **Lead**: Relevant domain expert
- **Response Time**: <1 hour
- **Escalation**: P0 if not resolved in 2 hours

### P2 - Medium (Non-Critical Issues)
- **Lead**: Assigned domain expert
- **Response Time**: <4 hours  
- **Documentation**: Required for future prevention

## Success Validation

### Week 1 Objectives
- [ ] All 7 services deployed and healthy
- [ ] SSL certificates configured for all domains
- [ ] Basic monitoring and alerting operational
- [ ] API documentation complete
- [ ] Security audit passed

### Week 2 Objectives  
- [ ] Performance optimization completed
- [ ] Advanced monitoring dashboards operational
- [ ] Automated deployment pipelines functional
- [ ] Load testing completed
- [ ] Disaster recovery procedures tested

### Week 3 Objectives
- [ ] Advanced AI workflows operational
- [ ] Auto-scaling implemented (if needed)
- [ ] Comprehensive documentation complete
- [ ] Process automation optimized
- [ ] Long-term roadmap established

## Troubleshooting Common Issues

### Agent Coordination Conflicts
- Check MULTI_AGENT_PLAN.md for latest status
- Verify task dependencies and priorities
- Use structured communication templates
- Escalate to all-agent coordination if needed

### Deployment Issues
- Verify infrastructure readiness (Agent 1)
- Check service dependencies (Agent 2)
- Validate AI pipeline requirements (Agent 3)  
- Confirm security and testing requirements (Agent 4)

### Performance Problems
- Infrastructure metrics (Agent 1)
- Service integration optimization (Agent 2)
- AI pipeline tuning (Agent 3)
- Load testing and monitoring (Agent 4)

---

**Ready to Initialize**: Follow the terminal setup above to activate all 4 agents  
**Coordination Document**: `/Users/kefentse/dev_env/mech/MULTI_AGENT_PLAN.md`  
**Expected Timeline**: 3 weeks to full platform optimization  
**Success Metric**: 7/7 services operational with comprehensive monitoring