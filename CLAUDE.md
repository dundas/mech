# Mech AI Project - Claude Code Integration

## Project Overview
Mech AI is a comprehensive AI-powered development platform that helps developers build, analyze, and deploy applications more efficiently. This project includes:

- **Frontend**: Next.js application with chat interface and development tools
- **Backend Services**: MongoDB-based services for indexing, analysis, and search
- **Claude Code Integration**: Real-time progress tracking and reasoning storage

## Key Components

### Frontend (`mech-ai/frontend/`)
- Next.js 14 with TypeScript
- Chat interface with Claude integration
- Real-time project management
- Authentication and user management

### Backend Services
- **Queue Service**: Task processing and job management (queue.mech.is)
- **Indexer Service**: Vector-based code search and indexing (indexer.mech.is)
- **LLM Service**: AI model integrations and completions (llm.mech.is)
- **Sequences Service**: Workflow orchestration and automation (sequences.mech.is)
- **Storage Service**: File storage and management (storage.mech.is)
- **Reader Service**: Document processing and analysis (reader.mech.is)

### Claude Code Hooks
This project is configured with Claude Code hooks to:
- Track all file changes and modifications
- Store reasoning and decision-making processes
- Automatically index changed files
- Maintain session continuity

## Development Commands

### Frontend Development
```bash
cd mech-ai/frontend
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run linting
```

### Agent Management
```bash
# Check project info (auto-detects from git)
node .claude/hooks/project-info.cjs

# Check agent status
node .claude/hooks/agent-status.cjs

# Reset agents
node .claude/hooks/agent-reset.cjs --cleanup    # Remove inactive agents
node .claude/hooks/agent-reset.cjs --all        # Reset all agents
node .claude/hooks/agent-reset.cjs --current    # Reset current session

# Quick shortcuts
node .claude/hooks/agent-reset-shortcut.cjs clean    # Clean inactive
node .claude/hooks/agent-reset-shortcut.cjs reset    # Reset all
node .claude/hooks/agent-reset-shortcut.cjs current  # Reset current
```

### Service Deployment
```bash
# Deploy individual services to production droplet
./deploy-single-service.sh mech-llms      # Deploy LLM service
./deploy-single-service.sh mech-sequences # Deploy workflow service  
./deploy-single-service.sh mech-reader    # Deploy document processing

# Services are automatically configured with:
# - AMD64 platform compatibility
# - Docker registry push/pull
# - Production environment variables
# - Health checks and monitoring
# - Nginx proxy configuration
```

### Database Management
```bash
# MongoDB operations
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed with test data
npm run db:backup    # Create backup
```

## Project Structure

```
mech-ai/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   ├── lib/                 # Utility libraries
│   └── hooks/               # React hooks
├── mech-indexer/            # Code indexing service
├── mech-analyzer/           # Database analysis service
├── mech-logger/             # Logging service
├── mcp-server-backend/      # MCP protocol server
└── docs/                    # Documentation
```

## Environment Variables
Required for Claude Code integration:
- `MECH_FRONTEND_URL`: Frontend URL (default: http://localhost:5500)
- `MECH_PROJECT_ID`: Project identifier (default: mech-ai)
- `MONGODB_URI`: Database connection string
- `OPENAI_API_KEY`: OpenAI API key for embeddings

## System Configuration
- **Docker Location**: `/Applications/Docker.app/Contents/Resources/bin/docker`
  - Docker is installed as a desktop application
  - Add to PATH: `export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"`
  - Required for building and deploying container images

## Claude Code Integration Features

### Automatic Progress Tracking
- Every file modification is tracked
- Tool usage is logged with reasoning
- Session continuity across restarts

### Reasoning Storage
- All decision-making processes are stored
- Searchable reasoning history
- Context-aware recommendations

### Auto-Indexing
- Changed files are automatically indexed
- Semantic search updated in real-time
- Code relationships maintained

## Testing
```bash
# Run all tests
npm run test

# Test specific components
npm run test:frontend
npm run test:backend
npm run test:integration

# Test Claude Code hooks
./.claude/hooks/test-hooks.sh
```

## Database Collections
- `messages`: Chat messages and conversations
- `threads`: Conversation threads
- `projects`: Project metadata
- `hook_events`: Claude Code hook events
- `reasoning_logs`: Stored reasoning processes
- `claude_sessions`: Session tracking

## Common Operations

### Adding New Features
1. Create feature branch
2. Implement changes with Claude Code assistance
3. Review reasoning logs for decision history
4. Test and deploy

### Debugging
- Check `.claude/progress.log` for hook activity
- Review reasoning logs via `/api/claude-reasoning`
- Monitor database changes through analyzer

### Performance Monitoring
- Frontend: Next.js built-in metrics
- Backend: Custom metrics via logger service
- Database: MongoDB Atlas monitoring

## Getting Help
- Review reasoning logs for past decisions
- Check session summaries in `.claude/`
- Use semantic search to find related code
- Consult documentation in `docs/`

## Security Notes
- All API keys stored in environment variables
- Database access controlled via MongoDB Atlas
- Authentication handled through NextAuth.js
- No sensitive data committed to repository

This project is designed to work seamlessly with Claude Code, providing comprehensive tracking and analysis of your development process.