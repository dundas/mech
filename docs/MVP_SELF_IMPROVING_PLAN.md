# MECH AI - Self-Improving MVP Implementation Plan

> **Document Version**: 1.0.0  
> **Last Updated**: 2025-01-26  
> **Status**: MVP Focus - Self-Improvement First  

## 🎯 MVP Goal: Self-Improving System

The primary goal is to create a minimal system that can work on improving itself. This means focusing ONLY on the features needed for the AI to:
1. Read its own codebase
2. Understand its architecture
3. Make improvements to itself
4. Test those improvements
5. Deploy changes safely

## 📚 Essential Documentation References

### Core Implementation Guides
- **[CLINE_PATTERNS_FOR_MECH.md](./CLINE_PATTERNS_FOR_MECH.md)** - Tool patterns and approval flows
- **[AI_AGENT_ENHANCED_WORKFLOW.md](./AI_AGENT_ENHANCED_WORKFLOW.md)** - AI integration patterns (Section 3: Technical Implementation)
- **[API_REFERENCE.md](./API_REFERENCE.md)** - API endpoints for tools (Section 2: Core Endpoints)
- **[UI_COMPONENTS.md](./UI_COMPONENTS.md)** - Chat interface components (Section 1: Chat Components)
- **[MVP_EXAMPLE_INTERACTION.md](./MVP_EXAMPLE_INTERACTION.md)** - Complete examples of MVP interactions and UI mockup

### Service Integration Docs
- **[INDEXER_SERVICE.md](./INDEXER_SERVICE.md)** - Code search implementation
- **[REPOSITORY_EXECUTION.md](./REPOSITORY_EXECUTION.md)** - WebContainer integration (Section 2: WebContainer Service)
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Development environment setup

## 🚀 Fastest Path to Self-Improving MVP (2-3 Weeks)

### Week 1: Core Infrastructure for Self-Improvement

#### Day 1-2: Basic Chat + Code Reading
**Goal**: AI can chat with user and read its own code

1. **Verify/Fix Frontend Chat Interface**
   - Ensure basic chat is working at localhost:5500
   - Simple message exchange with backend
   - No fancy features - just text in/out
   - **Reference**: [UI_COMPONENTS.md](./UI_COMPONENTS.md) - Section 1.1: Chat Component
   - **Existing Code**: `mech-ai/frontend/components/chat.tsx`

2. **Implement File Reading Tool**
   ```typescript
   // Minimal tool implementation based on Cline pattern
   tools = {
     read_file: async (path: string) => {
       // Read from MECH's own codebase
       return fs.readFileSync(path, 'utf-8')
     }
   }
   ```
   - **Reference**: [CLINE_PATTERNS_FOR_MECH.md](./CLINE_PATTERNS_FOR_MECH.md) - Tool Definition Pattern
   - **Reference**: [API_REFERENCE.md](./API_REFERENCE.md) - Section 2.1: Tool Endpoints
   - **Example**: [MVP_EXAMPLE_INTERACTION.md](./MVP_EXAMPLE_INTERACTION.md) - Example 1: AI Reading Its Own Code
   - **Implement in**: `mech-ai/frontend/app/api/chat/route.ts`

3. **Connect to AI Provider**
   - Use existing API setup (Anthropic/OpenAI)
   - Basic prompt with tool use capability
   - No complex context management yet
   - **Reference**: [AI_AGENT_ENHANCED_WORKFLOW.md](./AI_AGENT_ENHANCED_WORKFLOW.md) - Section 3.1: AI Service Setup
   - **Existing Code**: `mech-ai/frontend/lib/ai/providers.ts`

#### Day 3-4: Code Search & Understanding
**Goal**: AI can search and understand its codebase

1. **Integrate Mech-Indexer (Minimal)**
   - Point it at MECH's own directory
   - Index all .ts, .tsx, .js files
   - Simple search API endpoint
   - **Reference**: [INDEXER_SERVICE.md](./INDEXER_SERVICE.md) - Quick Start section
   - **Existing Code**: `mech-indexer/src/indexers/CodebaseIndexer.ts`
   - **Run**: `cd mech-indexer && npm run index-mech-codebase`

2. **Add Search Tool**
   ```typescript
   tools = {
     search_code: async (query: string) => {
       // Use mech-indexer to search
       return indexer.search(query)
     }
   }
   ```
   - **Reference**: [INDEXER_SERVICE.md](./INDEXER_SERVICE.md) - API Endpoints
   - **API**: `POST http://localhost:3003/api/search`
   - **Integrate in**: `mech-ai/frontend/app/api/chat/route.ts`

3. **Add List Files Tool**
   ```typescript
   tools = {
     list_files: async (dir: string) => {
       // List files in MECH codebase
       return fs.readdirSync(dir)
     }
   }
   ```
   - **Reference**: [CLINE_PATTERNS_FOR_MECH.md](./CLINE_PATTERNS_FOR_MECH.md) - File Operations
   - **Pattern**: Follow Cline's `list_files` implementation

#### Day 5: Code Writing Capability
**Goal**: AI can propose and write code changes

1. **Add Write File Tool with Approval**
   ```typescript
   tools = {
     write_file: async (path: string, content: string) => {
       // Show diff to user
       // Get approval
       // Write file
       return writeFileWithApproval(path, content)
     }
   }
   ```
   - **Reference**: [CLINE_PATTERNS_FOR_MECH.md](./CLINE_PATTERNS_FOR_MECH.md) - Approval Flow Pattern
   - **Reference**: [UI_COMPONENTS.md](./UI_COMPONENTS.md) - Section 1.4: Approval Components
   - **Pattern**: Follow Cline's approval system in `cline/src/core/task/index.ts`

2. **Simple Approval UI**
   - Show proposed changes in chat
   - Approve/Reject buttons
   - Basic diff viewer
   - **Reference**: [UI_COMPONENTS.md](./UI_COMPONENTS.md) - Diff Viewer Component
   - **Example**: [MVP_EXAMPLE_INTERACTION.md](./MVP_EXAMPLE_INTERACTION.md) - Example 2: AI Improving Itself (see Approval UI)
   - **Existing Code**: `mech-ai/frontend/components/diffview.tsx`
   - **Pattern**: Adapt Cline's diff presentation

### Week 2: Self-Testing & Execution

#### Day 6-7: Code Execution
**Goal**: AI can run its own code

1. **Minimal WebContainer Integration**
   - Just enough to run `npm install` and `npm run dev`
   - No complex features
   - **Reference**: [REPOSITORY_EXECUTION.md](./REPOSITORY_EXECUTION.md) - Section 2: WebContainer Service
   - **Existing Code**: `mech-ai/frontend/lib/services/repository-execution-service.ts`
   - **Reference**: [ARCHITECTURAL_VALIDATION.md](./ARCHITECTURAL_VALIDATION.md) - WebContainer validation

2. **Add Execute Command Tool**
   ```typescript
   tools = {
     execute_command: async (cmd: string) => {
       // Run in WebContainer or local
       return webContainer.exec(cmd)
     }
   }
   ```
   - **Reference**: [REPOSITORY_EXECUTION.md](./REPOSITORY_EXECUTION.md) - Command Execution
   - **Pattern**: Follow Cline's `execute_command` with approval
   - **Security**: Sandbox all executions

#### Day 8-9: Self-Testing
**Goal**: AI can test its changes

1. **Basic Test Runner**
   - Run existing tests with `npm test`
   - Parse results
   - Report back to AI

2. **Add Run Tests Tool**
   ```typescript
   tools = {
     run_tests: async (testPath?: string) => {
       // Run tests and return results
       return runTests(testPath)
     }
   }
   ```

#### Day 10: Git Integration
**Goal**: AI can version control its changes

1. **Basic Git Tools**
   ```typescript
   tools = {
     git_status: async () => git.status(),
     git_diff: async () => git.diff(),
     git_commit: async (message: string) => {
       // With approval
       return gitCommitWithApproval(message)
     }
   }
   ```

### Week 3: Self-Improvement Loop

#### Day 11-12: Context Awareness
**Goal**: AI understands what it needs to improve

1. **Project Structure Tool**
   ```typescript
   tools = {
     analyze_project: async () => {
       // Return project structure, dependencies, etc
       return analyzeProjectStructure()
     }
   }
   ```

2. **Task Management**
   - Simple todo list for AI
   - Track what needs improvement
   - Prioritize tasks

#### Day 13-14: Deployment & Monitoring
**Goal**: AI can deploy its improvements safely

1. **Health Check Tool**
   ```typescript
   tools = {
     health_check: async () => {
       // Check if services are running
       return checkSystemHealth()
     }
   }
   ```

2. **Safe Deployment**
   - Backup before changes
   - Rollback capability
   - Error monitoring

#### Day 15: MVP Complete
**Goal**: System can improve itself

1. **Self-Improvement Prompt**
   ```
   "You are MECH AI. Your codebase is in /Users/kefentse/dev_env/mech. 
   Analyze your own code and suggest improvements. Focus on:
   - Bug fixes
   - Performance improvements  
   - Better error handling
   - Code organization
   - Missing features for self-improvement"
   ```
   - **Example**: [MVP_EXAMPLE_INTERACTION.md](./MVP_EXAMPLE_INTERACTION.md) - Example 4: Self-Improvement Suggestions

2. **Initial Self-Improvement Tasks**
   - Fix any bugs in tool implementations
   - Improve error messages
   - Add missing tool features
   - Optimize performance
   - **Example**: [MVP_EXAMPLE_INTERACTION.md](./MVP_EXAMPLE_INTERACTION.md) - Example 5: Complete Self-Improvement Cycle

## 🛠️ Minimal Tool Set for MVP

Only implement these tools for MVP:

1. **File Operations**
   - `read_file` - Read any file in MECH codebase
   - `write_file` - Write with approval
   - `list_files` - List directory contents

2. **Code Search**
   - `search_code` - Search codebase
   - `analyze_project` - Understand structure

3. **Execution**
   - `execute_command` - Run commands
   - `run_tests` - Run test suite

4. **Version Control**
   - `git_status` - Check changes
   - `git_diff` - See differences
   - `git_commit` - Commit with approval

5. **Monitoring**
   - `health_check` - System status

## 📊 Success Criteria for MVP

The MVP is successful when:

1. **AI can read its own code** ✓
2. **AI can search its codebase** ✓
3. **AI can propose code changes** ✓
4. **User can approve/reject changes** ✓
5. **AI can test its changes** ✓
6. **AI can commit improvements** ✓
7. **System remains stable** ✓

**See working examples**: [MVP_EXAMPLE_INTERACTION.md](./MVP_EXAMPLE_INTERACTION.md) demonstrates all success criteria in action

## 🚫 NOT in MVP (Phase 2)

These features come AFTER self-improvement works:

- Complex UI components
- Database analysis (mech-analyzer)
- Browser automation (Playwright)
- Advanced security (Azure Key Vault)
- Multi-user support
- Complex approval workflows
- MCP server integration
- Advanced context management

## 📝 Implementation Checklist

### Week 1 Checklist
- [ ] Basic chat working
- [ ] Read file tool
- [ ] Search code tool  
- [ ] List files tool
- [ ] Write file tool with approval
- [ ] Simple diff viewer

### Week 2 Checklist
- [ ] WebContainer integration
- [ ] Execute command tool
- [ ] Run tests tool
- [ ] Git tools (status, diff, commit)
- [ ] Basic error handling

### Week 3 Checklist
- [ ] Project analysis tool
- [ ] Task management
- [ ] Health check tool
- [ ] Self-improvement prompt
- [ ] First self-improvement cycle

## 🔄 Development Process

1. **Start Simple**: Get basic chat + file reading working
2. **Add Tools Incrementally**: One tool at a time
3. **Test Each Tool**: Ensure it works before moving on
4. **Dog Food Early**: Use the system to improve itself ASAP
5. **Iterate Quickly**: Small improvements, often

## 🚦 Quick Start Commands

```bash
# Terminal 1: Frontend (already running on :5500)
cd mech-ai/frontend
pnpm dev

# Terminal 2: Indexer Service
cd mech-indexer
npm run index-mech-codebase  # Index MECH's own code
npm run api:simple           # Start search API on :3003

# Terminal 3: Test the setup
curl http://localhost:5500   # Check frontend
curl http://localhost:3003/api/search -X POST -H "Content-Type: application/json" -d '{"query":"chat"}'
```

## 📁 Key File Locations

### Frontend (Next.js)
- **Chat UI**: `mech-ai/frontend/components/chat.tsx`
- **Chat API**: `mech-ai/frontend/app/api/chat/route.ts`
- **AI Providers**: `mech-ai/frontend/lib/ai/providers.ts`
- **Diff Viewer**: `mech-ai/frontend/components/diffview.tsx`

### Services
- **Indexer**: `mech-indexer/src/indexers/CodebaseIndexer.ts`
- **Analyzer**: `mech-analyzer/src/analyzer.js`
- **WebContainer**: `mech-ai/frontend/lib/services/repository-execution-service.ts`

### Tool Implementation Target
- **Main Tool Registry**: Create at `mech-ai/frontend/lib/tools/registry.ts`
- **Tool Implementations**: Create at `mech-ai/frontend/lib/tools/`
- **Approval System**: Create at `mech-ai/frontend/lib/tools/approval.ts`

### UI/UX Reference
- **Complete interaction examples**: [MVP_EXAMPLE_INTERACTION.md](./MVP_EXAMPLE_INTERACTION.md)
- **UI mockup**: See bottom of examples document for MVP interface design

## 💡 Key Insights from Cline Analysis

Based on Cline patterns, focus on:

1. **Structured Tool Interface**: Clear input/output
2. **Approval Flow**: Never auto-approve writes
3. **Error Recovery**: Graceful handling
4. **Context Management**: Track what AI is doing
5. **Direct Communication**: No fluff, just results

## 🎯 Next Steps After MVP

Once the system can improve itself:

1. **Phase 2**: Add database analysis (mech-analyzer)
2. **Phase 3**: Add browser testing (Playwright)  
3. **Phase 4**: Enhanced security (credentials)
4. **Phase 5**: Advanced AI features
5. **Phase 6**: Production deployment

The key is: **Get to self-improvement FAST**, then let the system help build the rest.