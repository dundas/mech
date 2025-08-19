# Mech Indexer Quick Reference

## Service URL
```
http://mech-indexer-8.eastus.azurecontainer.io:3000
```

## Quick Start

### 1. Index a Repository
```bash
curl -X POST http://mech-indexer-8.eastus.azurecontainer.io:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "repositoryUrl": "https://github.com/owner/repo.git",
    "branch": "main"
  }'
```

### 2. Check Status
```bash
curl http://mech-indexer-8.eastus.azurecontainer.io:3000/api/index/status/your-project-id
```

### 3. Search Code
```bash
curl -X POST http://mech-indexer-8.eastus.azurecontainer.io:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "function main",
    "projectId": "your-project-id",
    "limit": 5
  }'
```

## JavaScript Integration

### Basic Setup
```javascript
const INDEXER_URL = 'http://mech-indexer-8.eastus.azurecontainer.io:3000';

class MechIndexer {
  async startIndexing(projectId, repositoryUrl, branch = 'main') {
    const response = await fetch(`${INDEXER_URL}/api/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, repositoryUrl, branch })
    });
    return response.json();
  }

  async getStatus(projectId) {
    const response = await fetch(`${INDEXER_URL}/api/index/status/${projectId}`);
    return response.json();
  }

  async searchCode(query, projectId, limit = 10) {
    const response = await fetch(`${INDEXER_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, projectId, limit })
    });
    return response.json();
  }
}
```

### Usage Example
```javascript
const indexer = new MechIndexer();

// Start indexing
const job = await indexer.startIndexing(
  'project-123',
  'https://github.com/vercel/next.js.git'
);
console.log('Job started:', job.jobId);

// Monitor progress
const checkProgress = async () => {
  const status = await indexer.getStatus('project-123');
  console.log('Status:', status.status);
  
  if (status.status === 'indexing') {
    console.log(`Progress: ${status.progress?.processedFiles}/${status.progress?.totalFiles}`);
    setTimeout(checkProgress, 30000); // Check again in 30s
  }
};

checkProgress();

// Search when ready
const results = await indexer.searchCode('React component', 'project-123');
console.log(`Found ${results.total} results`);
```

## Common Patterns

### Error Handling
```javascript
async function safeIndexerCall(operation) {
  try {
    return await operation();
  } catch (error) {
    console.error('Indexer error:', error);
    return { error: error.message };
  }
}

// Usage
const result = await safeIndexerCall(() => 
  indexer.searchCode('function', projectId)
);
```

### Batch Processing
```javascript
async function indexMultipleRepos(projectId, repositories) {
  const jobs = [];
  
  for (const repo of repositories) {
    const job = await indexer.startIndexing(projectId, repo.url, repo.branch);
    jobs.push({ repo: repo.name, jobId: job.jobId });
    
    // Small delay to avoid overwhelming the service
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return jobs;
}
```

### Search with Filters
```javascript
async function searchByLanguage(query, projectId, language) {
  const results = await indexer.searchCode(query, projectId, 20);
  
  // Filter results by language (server-side filtering coming soon)
  return results.results.filter(result => 
    result.language === language
  );
}
```

## Response Formats

### Indexing Response
```json
{
  "jobId": "uuid-string",
  "status": "started",
  "message": "Indexing job started successfully"
}
```

### Status Response
```json
{
  "status": "indexing",
  "progress": {
    "processedFiles": 150,
    "totalFiles": 1000,
    "currentFile": "src/app.js"
  },
  "filesIndexed": 150
}
```

### Search Response
```json
{
  "total": 5,
  "results": [
    {
      "filePath": "src/components/Button.tsx",
      "content": "export const Button = ({ children, onClick }) => {",
      "language": "typescript",
      "score": 0.95,
      "projectId": "project-123",
      "startLine": 10,
      "endLine": 15
    }
  ]
}
```

## Status Values

- `started` - Job initiated, preparing to clone repository
- `indexing` - Actively processing files and generating embeddings  
- `completed` - Successfully finished indexing all files
- `failed` - Encountered an error during processing

## Supported Languages

- JavaScript/TypeScript (.js, .ts, .jsx, .tsx)
- Python (.py)
- Java (.java)
- C/C++ (.c, .cpp, .h)
- C# (.cs)
- Go (.go)
- Rust (.rs)
- PHP (.php)
- Ruby (.rb)
- And many more...

## Performance Tips

### For Large Repositories
- Allow 5-30 minutes for initial indexing
- Monitor progress via status endpoint
- Consider indexing during off-peak hours

### For Searches
- Use specific queries for better results
- Limit results to reduce response time
- Cache frequent searches on client side

### For Multiple Projects
- Stagger indexing jobs to avoid overload
- Use unique project IDs for proper isolation
- Monitor MongoDB storage usage

## Troubleshooting

### Common Issues
1. **Repository not found**: Check URL and access permissions
2. **Indexing stuck**: Repository may be too large or have connectivity issues
3. **No search results**: Ensure indexing completed successfully
4. **Rate limits**: OpenAI API limits may cause temporary delays

### Debug Commands
```bash
# Check service health
curl http://mech-indexer-8.eastus.azurecontainer.io:3000/health

# Get detailed status
curl http://mech-indexer-8.eastus.azurecontainer.io:3000/api/index/status/PROJECT_ID

# Test search
curl -X POST http://mech-indexer-8.eastus.azurecontainer.io:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "projectId": "PROJECT_ID", "limit": 1}'
```

## Environment Variables

```env
# Required for mech-ai integration
INDEXER_SERVICE_URL=http://mech-indexer-8.eastus.azurecontainer.io:3000
MONGODB_URI=your_mongodb_connection_string
GITHUB_TOKEN=your_github_token_for_private_repos
``` 