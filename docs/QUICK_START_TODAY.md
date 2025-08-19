# MECH AI - Get It Working TODAY

**Goal**: Chat with MECH about your code within the next hour

## ✅ Step 1: Test Login (5 min)

```bash
# Terminal 1: Make sure frontend is running
cd mech-ai/frontend
npm run dev

# Browser: Go to http://localhost:5500
# Click "Sign in with GitHub"
```

**If login fails**, check:
- GitHub OAuth app settings
- Callback URL must be: `http://localhost:5500/api/auth/callback/github`

## ✅ Step 2: Create Basic Tools (10 min)

Create file: `mech-ai/frontend/lib/tools/context-tools.ts`

```typescript
// Simple tools that give AI context about your project
export const contextTools = [
  {
    name: 'get_codebase_info',
    description: 'Get information about the current codebase',
    execute: async () => {
      return {
        project: 'MECH AI Platform',
        totalFiles: 1500,
        mainLanguages: ['TypeScript', 'JavaScript'],
        frameworks: ['Next.js', 'React', 'Node.js'],
        services: [
          'Frontend (Next.js)',
          'Indexer (Azure)',
          'Logger (Azure)',
          'MongoDB Database'
        ]
      };
    }
  },
  
  {
    name: 'search_project_files',
    description: 'Search for files in the project',
    execute: async ({ query }: { query: string }) => {
      // For now, return mock data
      // Later: Connect to real indexer
      const mockResults = {
        'auth': [
          '/components/auth-form.tsx',
          '/lib/auth.ts',
          '/api/auth/callback.ts'
        ],
        'chat': [
          '/components/chat.tsx',
          '/components/chat-header.tsx',
          '/lib/chat-utils.ts'
        ],
        'tool': [
          '/lib/tools/registry.ts',
          '/lib/tools/read-file.ts',
          '/lib/tools/write-file.ts'
        ]
      };
      
      const results = mockResults[query.toLowerCase()] || [];
      return {
        query,
        results,
        message: results.length > 0 
          ? `Found ${results.length} files matching "${query}"`
          : `No files found matching "${query}"`
      };
    }
  },
  
  {
    name: 'read_code_file',
    description: 'Read a specific code file',
    execute: async ({ path }: { path: string }) => {
      // For now, return a sample
      // Later: Actually read the file
      if (path.includes('auth-form')) {
        return {
          path,
          content: `export function AuthForm() {
  const [email, setEmail] = useState('');
  
  const validateEmail = (email: string) => {
    // TODO: This needs better validation
    return email.includes('@');
  };
  
  return (
    <form>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </form>
  );
}`,
          language: 'typescript'
        };
      }
      
      return {
        error: `File not found: ${path}`
      };
    }
  }
];
```

## ✅ Step 3: Add Tools to Chat (5 min)

Update: `mech-ai/frontend/lib/tools/index.ts`

```typescript
import { contextTools } from './context-tools';

// Add to existing tools
export const allTools = [
  ...existingTools,
  ...contextTools
];
```

## ✅ Step 4: Test The Experience (5 min)

1. **Login** to MECH at http://localhost:5500
2. **Start chatting**:

```
You: "What kind of project is this?"
MECH: *uses get_codebase_info tool*
"This is the MECH AI Platform, a TypeScript/JavaScript project with 1500 files..."

You: "Find all authentication related files"
MECH: *uses search_project_files tool*
"I found 3 authentication-related files:
- /components/auth-form.tsx
- /lib/auth.ts  
- /api/auth/callback.ts"

You: "Show me the auth form code"
MECH: *uses read_code_file tool*
"Here's the auth form component... I notice the email validation is quite basic..."
```

## ✅ Step 5: Connect Real Services (30 min)

### Connect to Indexer:

```typescript
// Update search_project_files tool
execute: async ({ query, projectId }) => {
  const response = await fetch(
    'http://mech-indexer-8.eastus.azurecontainer.io:3000/api/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        projectId: projectId || 'mech-ai-default',
        limit: 10
      })
    }
  );
  
  const data = await response.json();
  return {
    results: data.results,
    totalFound: data.total
  };
}
```

### Add Database Schema Tool:

```typescript
{
  name: 'get_database_schema',
  description: 'Get MongoDB database schema',
  execute: async () => {
    // Connect to your MongoDB
    const schemas = {
      users: {
        _id: 'ObjectId',
        email: 'string',
        name: 'string',
        githubId: 'string',
        createdAt: 'Date'
      },
      projects: {
        _id: 'ObjectId',
        name: 'string',
        userId: 'ObjectId',
        repository: 'string',
        indexed: 'boolean'
      },
      threads: {
        _id: 'ObjectId',
        userId: 'ObjectId',
        projectId: 'ObjectId',
        messages: 'Array<Message>'
      }
    };
    
    return schemas;
  }
}
```

## 🎯 What You'll Have in 1 Hour

1. **Working chat interface** where you can talk to MECH
2. **AI that knows** about your project structure
3. **Basic code search** and file reading
4. **Database awareness** of your MongoDB schema

## 🚀 Next: The Feedback Loop

Once basic chat works, add:

1. **Code Execution**:
```typescript
{
  name: 'test_code_snippet',
  description: 'Run a code snippet and see results',
  requiresApproval: true,
  execute: async ({ code }) => {
    // Use WebContainer API
    const container = await WebContainer.boot();
    const result = await container.run(code);
    return result;
  }
}
```

2. **Visual Feedback**:
```typescript
{
  name: 'screenshot_component',
  description: 'Take screenshot of a component',
  execute: async ({ url }) => {
    // Use Playwright
    const screenshot = await page.screenshot();
    return { image: screenshot.toString('base64') };
  }
}
```

## 💡 Pro Tips

1. **Start Simple**: Get basic chat working first
2. **Mock First**: Use mock data, then connect real services
3. **Test Often**: Try each tool as you add it
4. **Build Up**: Add complexity gradually

The goal is to have a working system TODAY that you can improve tomorrow!