# Mech Indexer Integration Guide

## Overview

The **mech-indexer** is a containerized service that provides semantic code search capabilities for the mech-ai platform. It clones repositories, processes code files, generates embeddings using OpenAI, and stores them in MongoDB for fast similarity searches.

## Service Details

- **URL**: `http://mech-indexer-8.eastus.azurecontainer.io:3000`
- **Platform**: Azure Container Instances  
- **Storage**: MongoDB (shared with mech-ai)
- **AI Provider**: OpenAI for code embeddings
- **Architecture**: Node.js REST API

## Core Functionality

### 1. Repository Indexing
- Clones GitHub repositories (public and private with tokens)
- Processes code files by language and content type
- Generates semantic embeddings using OpenAI
- Stores file chunks with metadata in MongoDB
- Supports incremental updates and branch targeting

### 2. Semantic Code Search
- Vector similarity search across indexed code
- Multi-language support with syntax awareness
- Relevance scoring and ranking
- Project-scoped search capabilities

## API Endpoints

### Start Indexing Job
```http
POST /api/index
Content-Type: application/json

{
  "projectId": "string",     // MongoDB ObjectId of the project
  "repositoryUrl": "string", // GitHub repository URL
  "branch": "string"         // Target branch (optional, defaults to 'main')
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "status": "started",
  "message": "Indexing job started successfully"
}
```

### Check Indexing Status
```http
GET /api/index/status/{projectId}
```

**Response:**
```json
{
  "status": "indexing|completed|failed",
  "progress": {
    "processedFiles": 150,
    "totalFiles": 1000,
    "currentFile": "src/components/App.tsx"
  },
  "filesIndexed": 150,
  "error": "error message if failed"
}
```

### Search Code
```http
POST /api/search
Content-Type: application/json

{
  "query": "string",      // Natural language or code search query
  "projectId": "string",  // Scope search to specific project
  "limit": 10,           // Number of results (optional, defaults to 10)
  "language": "string"   // Filter by programming language (optional)
}
```

**Response:**
```json
{
  "total": 25,
  "results": [
    {
      "filePath": "src/components/Button.tsx",
      "content": "export const Button = ({ onClick, children }) => {...}",
      "language": "typescript",
      "score": 0.95,
      "projectId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "startLine": 15,
      "endLine": 25
    }
  ]
}
```

## Integration Patterns

### 1. Project Setup Integration

When a new project is created in mech-ai:

```javascript
// Example: Adding a repository to a project
async function addRepositoryToProject(projectId, repositoryData) {
  // 1. Store repository metadata in MongoDB
  const repository = await db.collection('repositories').insertOne({
    name: repositoryData.name,
    url: repositoryData.url,
    projectId: projectId,
    defaultBranch: repositoryData.defaultBranch || 'main',
    isPrivate: repositoryData.isPrivate,
    createdAt: new Date()
  });

  // 2. Trigger indexing
  const indexResponse = await fetch(`${INDEXER_URL}/api/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: projectId.toString(),
      repositoryUrl: repositoryData.url,
      branch: repositoryData.defaultBranch || 'main'
    })
  });

  return { repository, indexJob: await indexResponse.json() };
}
```

### 2. Code Search Integration

For AI-powered code analysis and questions:

```javascript
// Example: Search for relevant code context
async function findRelevantCode(query, projectId, options = {}) {
  const searchResponse = await fetch(`${INDEXER_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query,
      projectId: projectId,
      limit: options.limit || 10,
      language: options.language
    })
  });

  const results = await searchResponse.json();
  
  // Format for AI context
  return results.results.map(result => ({
    file: result.filePath,
    language: result.language,
    content: result.content,
    relevance: result.score
  }));
}
```

### 3. Status Monitoring

For real-time updates during indexing:

```javascript
// Example: Monitor indexing progress
async function monitorIndexingProgress(projectId, onUpdate) {
  const pollInterval = 30000; // 30 seconds
  
  const checkStatus = async () => {
    try {
      const response = await fetch(`${INDEXER_URL}/api/index/status/${projectId}`);
      const status = await response.json();
      
      onUpdate(status);
      
      if (status.status === 'indexing') {
        setTimeout(checkStatus, pollInterval);
      }
    } catch (error) {
      console.error('Error checking indexing status:', error);
    }
  };
  
  checkStatus();
}
```

## Usage Workflows

### Workflow 1: New Project with Repository

1. **Create Project**: Store project metadata in MongoDB
2. **Add Repository**: Store repository details with project reference
3. **Start Indexing**: Call `/api/index` with project and repository details
4. **Monitor Progress**: Poll `/api/index/status/{projectId}` for updates
5. **Enable Search**: Once completed, repository is searchable via `/api/search`

### Workflow 2: Code Analysis Request

1. **Receive Query**: User asks about code functionality or requests analysis
2. **Search Context**: Use `/api/search` to find relevant code snippets
3. **Enhance Prompt**: Include search results as context for AI responses
4. **Generate Response**: AI analyzes code with full project context

### Workflow 3: Repository Updates

1. **Detect Changes**: GitHub webhooks or manual triggers
2. **Re-index**: Call `/api/index` with updated branch/commit
3. **Incremental Update**: Service processes only changed files
4. **Update Search**: New/modified code becomes searchable

## Configuration

### Environment Variables (mech-ai side)
```env
INDEXER_SERVICE_URL=http://mech-indexer-8.eastus.azurecontainer.io:3000
MONGODB_URI=your_mongodb_connection_string
GITHUB_TOKEN=your_github_personal_access_token
```

### Database Schema Integration

The indexer uses these MongoDB collections:

- **repositories**: Repository metadata with project references
- **code_embeddings**: Vector embeddings of code chunks
- **indexing_jobs**: Job status and progress tracking

## Error Handling

### Common Error Scenarios

1. **Repository Access Issues**
   - Private repos without proper GitHub token
   - Invalid repository URLs
   - Network connectivity problems

2. **Indexing Failures**
   - Large repositories hitting timeout limits
   - OpenAI API rate limits or failures
   - MongoDB connection issues

3. **Search Problems**
   - Invalid project IDs
   - No indexed content for project
   - Malformed search queries

### Best Practices

```javascript
// Robust error handling example
async function safeSearchCode(query, projectId) {
  try {
    const response = await fetch(`${INDEXER_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, projectId, limit: 10 })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    const results = await response.json();
    return results;

  } catch (error) {
    console.error('Code search error:', error);
    
    // Fallback to basic project information
    return {
      total: 0,
      results: [],
      error: 'Search service unavailable'
    };
  }
}
```

## Performance Considerations

### Indexing Performance
- **Large Repositories**: Can take 5-30 minutes depending on size
- **File Limits**: Processes most common programming languages
- **Rate Limiting**: Respects OpenAI API limits with automatic retries

### Search Performance
- **Response Time**: Typically 100-500ms for vector similarity search
- **Concurrency**: Supports multiple simultaneous searches
- **Caching**: MongoDB indexes provide fast metadata queries

## Monitoring and Debugging

### Health Checks
```javascript
// Check if indexer service is healthy
async function checkIndexerHealth() {
  try {
    const response = await fetch(`${INDEXER_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

### Debug Information
- Check indexing job status via `/api/index/status/{projectId}`
- Monitor MongoDB `indexing_jobs` collection for detailed logs
- Azure Container Instance logs for service-level debugging

## Future Enhancements

### Planned Features
- **Incremental Indexing**: Only process changed files
- **Multi-Repository Projects**: Index multiple repos per project
- **Custom Embeddings**: Support for different embedding models
- **Real-time Updates**: WebSocket-based progress notifications

### Integration Opportunities
- **IDE Plugins**: Direct integration with VS Code and other editors
- **CI/CD Pipelines**: Automatic re-indexing on code pushes
- **Advanced Analytics**: Code quality metrics and insights 