# Mech Indexer Service

## Overview

The Mech Indexer is a deployed microservice that provides vector search capabilities for the Mech AI platform. It enables semantic code search across indexed repositories, powering the AI assistant's ability to understand and reference project code.

**Service URL**: http://mech-indexer-6.eastus.azurecontainer.io:3000  
**GitHub Repository**: https://github.com/dundas/mech-indexer

## Key Features

- **Vector Search**: Semantic search using OpenAI embeddings (3072 dimensions)
- **MongoDB Atlas Integration**: Stores embeddings in the `mechDB` database
- **REST API**: Simple HTTP endpoints for search and health checks
- **Azure Hosted**: Deployed on Azure Container Instances for reliability
- **Auto-Deploy**: GitHub Actions workflow for continuous deployment

## Quick Integration Example

```javascript
// In your Mech AI application
const INDEXER_API = 'http://mech-indexer-6.eastus.azurecontainer.io:3000';

// Search for code
async function searchProjectCode(query, projectId) {
  const response = await fetch(`${INDEXER_API}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query,
      projectId: projectId,
      limit: 5
    })
  });
  
  return response.json();
}

// Example usage in chat
const codeContext = await searchProjectCode(
  "authentication middleware", 
  "project-123"
);
```

## Current Status

- ✅ **Deployed**: Live at Azure Container Instances
- ✅ **Indexed**: 267 documents from mech-ai codebase
- ✅ **Vector Search**: Working with MongoDB Atlas
- ✅ **API Endpoints**: Health, search, and test endpoints operational

## API Endpoints

### 1. Health Check
```
GET /health
```

### 2. Search Code
```
POST /api/search
{
  "query": "your search query",
  "limit": 10,
  "projectId": "optional",
  "repositoryName": "optional",
  "language": "optional"
}
```

### 3. Test Status
```
GET /api/test
```

## Integration with Mech AI Components

### 1. **mech-ai Frontend**
- Use for code search UI
- Provide context to chat interface
- Display relevant code snippets

### 2. **AI Assistant Service**
- Enhance prompts with code context
- Improve answer accuracy
- Enable project-specific responses

### 3. **MongoDB Collections**
- `code_embeddings` - Main vector storage
- `projects` - Project metadata
- `repositories` - Repository information

## Next Steps for Integration

1. **Add to Chat Flow**: Integrate search results into the AI chat context
2. **Create Search UI**: Build a code search interface in the frontend
3. **Implement Caching**: Cache frequent searches for performance
4. **Add Authentication**: Secure the API with project-based access control

## Related Documentation

- [Mech Indexer Repository](https://github.com/dundas/mech-indexer)
- [Quick Start Guide](https://github.com/dundas/mech-indexer/blob/main/docs/QUICK_START.md)
- [Platform Integration Guide](https://github.com/dundas/mech-indexer/blob/main/docs/MECH_PLATFORM_INTEGRATION.md)
- [API Reference](https://github.com/dundas/mech-indexer/blob/main/API.md)

## Monitoring

- **Container Logs**: `az container logs --resource-group mech-indexer-rg --name mech-indexer`
- **Health Check**: http://mech-indexer-6.eastus.azurecontainer.io:3000/health
- **GitHub Actions**: https://github.com/dundas/mech-indexer/actions

## Support

For issues or enhancements:
1. Check container health and logs
2. Review MongoDB Atlas metrics
3. Open issues at: https://github.com/dundas/mech-indexer/issues