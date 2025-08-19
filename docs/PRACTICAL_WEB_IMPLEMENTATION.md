# Practical Web Implementation - Start Today

**Goal**: Get code update workflow working in your web app NOW

## 🎯 Quick Win Approach

Since MECH AI is a web app, we'll use what's already available:

### Current Assets:
- ✅ GitHub OAuth authentication
- ✅ Tool system with approval UI
- ✅ MongoDB for state
- ✅ Streaming AI responses
- ✅ Remote indexer service

### Missing but Easy to Add:
- GitHub API integration
- WebContainer for browser execution
- Simple agent coordination

## 📋 Today's Implementation Plan

### Step 1: Add GitHub API Integration (1 hour)

```typescript
// lib/github/client.ts
import { Octokit } from '@octokit/rest';

export async function getGitHubClient(userId: string) {
  // Get user's GitHub token from database
  const user = await getUserById(userId);
  
  if (!user?.githubAccessToken) {
    throw new Error('GitHub not connected');
  }
  
  return new Octokit({
    auth: user.githubAccessToken
  });
}

// lib/tools/github-tools.ts
export const githubSearchTool = {
  name: 'github_search_code',
  description: 'Search code in GitHub repository',
  execute: async ({ query, repo, userId }) => {
    const octokit = await getGitHubClient(userId);
    
    const response = await octokit.search.code({
      q: `${query} repo:${repo}`,
      per_page: 10
    });
    
    return {
      results: response.data.items.map(item => ({
        path: item.path,
        repository: item.repository.full_name,
        url: item.html_url,
        preview: item.text_matches?.[0]?.fragment
      }))
    };
  }
};

export const githubReadFileTool = {
  name: 'github_read_file',
  description: 'Read file from GitHub',
  execute: async ({ owner, repo, path, userId }) => {
    const octokit = await getGitHubClient(userId);
    
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path
    });
    
    if ('content' in response.data) {
      const content = Buffer.from(response.data.content, 'base64').toString();
      return { path, content, sha: response.data.sha };
    }
    
    throw new Error('Not a file');
  }
};

export const githubUpdateFileTool = {
  name: 'github_update_file',
  description: 'Update file in GitHub',
  requiresApproval: true,
  execute: async ({ owner, repo, path, content, message, branch, userId }) => {
    const octokit = await getGitHubClient(userId);
    
    // Get current file to get SHA
    const current = await octokit.repos.getContent({
      owner, repo, path, ref: branch
    });
    
    // Update file
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha: 'sha' in current.data ? current.data.sha : undefined,
      branch
    });
    
    return {
      commit: response.data.commit,
      content: response.data.content
    };
  }
};
```

### Step 2: Create Simple Web Agent (2 hours)

```typescript
// app/api/agents/code-update/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });
  
  const { description, repository, branch = 'main' } = await request.json();
  
  // Create a new agent session
  const agentSession = {
    id: generateId(),
    userId: session.user.id,
    status: 'running',
    steps: [],
    createdAt: new Date()
  };
  
  // Save to database
  await saveAgentSession(agentSession);
  
  // Start async processing
  processCodeUpdate(agentSession.id, {
    description,
    repository,
    branch,
    userId: session.user.id
  });
  
  // Return immediately with session ID
  return Response.json({ sessionId: agentSession.id });
}

async function processCodeUpdate(sessionId: string, params: any) {
  try {
    // Step 1: Search for relevant files
    await updateAgentStatus(sessionId, 'searching', 'Searching for relevant files...');
    
    const searchResults = await githubSearchTool.execute({
      query: extractKeywords(params.description),
      repo: params.repository,
      userId: params.userId
    });
    
    // Step 2: Read current code
    await updateAgentStatus(sessionId, 'reading', 'Reading current code...');
    
    const files = await Promise.all(
      searchResults.results.slice(0, 5).map(file =>
        githubReadFileTool.execute({
          ...parseGitHubPath(file.path),
          userId: params.userId
        })
      )
    );
    
    // Step 3: Generate changes with AI
    await updateAgentStatus(sessionId, 'generating', 'Generating code changes...');
    
    const changes = await generateCodeChanges(
      params.description,
      files
    );
    
    // Step 4: Create branch and apply changes
    await updateAgentStatus(sessionId, 'applying', 'Applying changes...');
    
    const branchName = `mech-ai/${sessionId}`;
    await createBranch(params.repository, branchName);
    
    for (const change of changes) {
      await githubUpdateFileTool.execute({
        ...change,
        branch: branchName,
        userId: params.userId
      });
    }
    
    // Step 5: Create PR
    await updateAgentStatus(sessionId, 'creating-pr', 'Creating pull request...');
    
    const pr = await createPullRequest({
      repository: params.repository,
      head: branchName,
      base: params.branch,
      title: `MECH AI: ${params.description}`,
      body: formatPRDescription(changes)
    });
    
    // Complete
    await updateAgentStatus(sessionId, 'complete', 'Changes ready for review', {
      pr: pr.html_url,
      files: changes.length
    });
    
  } catch (error) {
    await updateAgentStatus(sessionId, 'failed', error.message);
  }
}
```

### Step 3: Real-time Status Updates (1 hour)

```typescript
// components/agent-monitor.tsx
'use client';

import { useEffect, useState } from 'react';

export function AgentMonitor({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<AgentStatus>();
  
  useEffect(() => {
    // Poll for updates (or use SSE/WebSocket)
    const interval = setInterval(async () => {
      const response = await fetch(`/api/agents/status/${sessionId}`);
      const data = await response.json();
      setStatus(data);
      
      if (data.status === 'complete' || data.status === 'failed') {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionId]);
  
  if (!status) return <div>Loading...</div>;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status.status === 'running' && (
            <Loader className="animate-spin h-4 w-4" />
          )}
          Code Update Agent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {status.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.status === 'complete' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : step.status === 'running' ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400" />
              )}
              <div>
                <div className="font-medium">{step.name}</div>
                <div className="text-sm text-muted-foreground">
                  {step.message}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {status.status === 'complete' && status.result?.pr && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="font-medium text-green-900">
              Pull Request Created
            </div>
            <a 
              href={status.result.pr} 
              target="_blank" 
              className="text-sm text-green-700 underline"
            >
              View on GitHub →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 4: Integrate with Chat (30 min)

```typescript
// In your chat component
const handleMessage = async (message: string) => {
  const intent = analyzeIntent(message);
  
  if (intent.type === 'code_update') {
    // Start agent
    const response = await fetch('/api/agents/code-update', {
      method: 'POST',
      body: JSON.stringify({
        description: message,
        repository: currentProject.repository,
        branch: 'main'
      })
    });
    
    const { sessionId } = await response.json();
    
    // Add agent card to chat
    addMessage({
      role: 'assistant',
      content: 'I\'ll help you with that code update. Let me analyze your request and make the necessary changes.',
      ui: <AgentMonitor sessionId={sessionId} />
    });
  } else {
    // Regular chat with inline tools
    // ... existing code
  }
};
```

## 🚀 What This Gives You

### Today:
1. **GitHub Integration** - Read/write files directly
2. **Agent Workflow** - Multi-step operations with status
3. **PR Creation** - Changes ready for review
4. **Real-time Updates** - See progress as it happens

### This Week:
1. Add WebContainer for in-browser testing
2. Integrate with GitHub Actions for CI/CD
3. Add preview deployments
4. Enhance with visual diffs

## 📊 Example User Experience

```
User: "Add input validation to all form components"

MECH AI: "I'll help you with that code update. Let me analyze your 
request and make the necessary changes."

[Agent Monitor Card]
✓ Searching for relevant files...
✓ Reading current code...
✓ Generating code changes...
✓ Applying changes...
✓ Creating pull request...

Pull Request Created
View on GitHub →

MECH AI: "I've created a pull request with validation added to 5 form 
components. The changes include email validation, required field checks, 
and error message display. You can review the changes on GitHub."
```

## 💡 Why This Works

1. **Leverages GitHub** - No need for local file access
2. **Web-native** - Everything happens via APIs
3. **Safe** - Changes go through PR review
4. **Transparent** - Users see every step
5. **Immediate** - Can implement today

This approach gets you a working code update workflow in your web app immediately, using GitHub as your execution environment!