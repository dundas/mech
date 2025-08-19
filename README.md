# Mech Platform

A comprehensive AI-powered development platform with automated deployment, monitoring, and multi-agent orchestration.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/dundas/mech.git
cd mech

# Deploy a service
./deploy-single-service.sh mech-llms

# Run all tests
./test-all-services.sh
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_COMPLETE_GUIDE.md)
- [Infrastructure Setup](INFRASTRUCTURE_SETUP.md)
- [Troubleshooting](TROUBLESHOOTING_GUIDE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Claude Code Integration](CLAUDE.md)

## 🏗️ Architecture

The platform consists of 8 core services:

| Service | Port | Domain | Purpose |
|---------|------|--------|---------|
| mech-queue | 3002 | queue.mech.is | Task processing and job management |
| mech-llms | 3008 | llm.mech.is | AI model integrations |
| mech-storage | 3007 | storage.mech.is | File storage and management |
| mech-indexer | 3005 | indexer.mech.is | Code indexing and search |
| mech-sequences | 3004 | sequences.mech.is | Workflow orchestration |
| mech-search | 3009 | search.mech.is | Vector search functionality |
| mech-reader | 3001 | reader.mech.is | Document processing |
| mech-memories | 3010 | memories.mech.is | Agent memory management |

## 🔧 Features

### Claude Code Integration
- Real-time progress tracking
- Reasoning storage and retrieval
- Auto-indexing of changed files
- Session continuity across restarts

### Deployment Automation
- Single-command service deployment
- Docker containerization
- Automated health checks
- Service orchestration

### Security
- Credential rotation procedures
- Encryption services
- Authentication middleware
- Security audit documentation

### Testing & Monitoring
- Comprehensive test suites
- Health check endpoints
- Performance monitoring
- Auto-recovery scripts

## 🚀 Deployment

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- MongoDB
- Redis

### Deploy to Production

```bash
# Deploy single service
./deploy-single-service.sh SERVICE_NAME

# Deploy all services
./deploy-all-services-production.sh

# Monitor health
./test-all-services.sh
```

## 🔐 Security

Before deploying:
1. Update all credentials in `.env` files
2. Rotate any exposed secrets (see [CREDENTIAL_ROTATION_GUIDE.md](CREDENTIAL_ROTATION_GUIDE.md))
3. Configure firewall rules (see [INFRASTRUCTURE_SETUP.md](INFRASTRUCTURE_SETUP.md))

## 📖 Documentation Structure

```
├── Deployment Guides
│   ├── DEPLOYMENT_COMPLETE_GUIDE.md
│   ├── INFRASTRUCTURE_SETUP.md
│   ├── NEW_SERVICE_PLAYBOOK.md
│   └── TROUBLESHOOTING_GUIDE.md
├── API Documentation
│   ├── docs/API_DOCUMENTATION.md
│   ├── docs/API_REFERENCE.md
│   └── docs/SERVICE_ENDPOINTS.md
├── Claude Code Integration
│   ├── CLAUDE.md
│   ├── CLAUDE_HOOKS_SETUP_GUIDE.md
│   └── .claude/agents/
└── Security
    ├── SECURITY_GUIDE.md
    ├── CREDENTIAL_ROTATION_GUIDE.md
    └── SECURITY_REMEDIATION_SUMMARY.md
```

## 🤝 Contributing

See [docs/CONTRIBUTION_GUIDE.md](docs/CONTRIBUTION_GUIDE.md) for development guidelines.

## 📝 License

MIT

## 🔗 Links

- Production: https://mech.is
- API Gateway: https://api.mech.is
- Documentation: https://docs.mech.is
- Status: https://status.mech.is

## 🏆 Status

All services are operational and tested in production:
- ✅ Claude Code integration complete
- ✅ Deployment automation working
- ✅ Security measures in place
- ✅ Testing framework operational
- ✅ Documentation comprehensive

---

Built with Claude Code integration for AI-powered development.