# Mech Services Comprehensive Guide

## Overview

The Mech AI platform consists of multiple microservices that work together to provide a comprehensive AI-powered development ecosystem. Each service has a specific purpose and can be used independently or as part of integrated workflows.

## Service Directory

| Service | URL | Purpose | Status |
|---------|-----|---------|--------|
| **Storage** | https://storage.mech.is | Object storage (R2) | ✅ Active |
| **Queue** | https://queue.mech.is | Job processing | ✅ Active |
| **LLMs** | https://llm.mech.is | AI model access | ✅ Active |
| **Indexer** | https://indexer.mech.is | Code search & indexing | ✅ Active |
| **Reader** | https://reader.mech.is | Content processing | ⚠️ 502 |
| **Search** | https://search.mech.is | Web & social search | ❌ Not deployed |
| **Sequences** | https://sequences.mech.is | Workflow orchestration | ✅ Active |

## Service Details

### 1. Storage Service (storage.mech.is)

**Purpose**: AI-friendly object storage backed by Cloudflare R2.

**Key Features**:
- Multi-application support
- Bucket management
- Presigned URLs for direct uploads
- Simple file operations

**Main Endpoints**:
```
POST   /api/applications        # Create new application
POST   /api/buckets            # Create bucket
POST   /api/buckets/{name}/objects    # Upload file
GET    /api/buckets/{name}/objects/{key}  # Download file
POST   /api/buckets/{name}/presigned-url  # Get upload URL
GET    /api/explain            # Full documentation
```

**Quick Example**:
```bash
# Upload a file
curl -X POST https://storage.mech.is/api/buckets/my-bucket/objects \
  -H "x-api-key: your-api-key" \
  -F "file=@document.pdf" \
  -F "key=docs/document.pdf"
```

### 2. Queue Service (queue.mech.is)

**Purpose**: Multi-application background job processing.

**Key Features**:
- Multiple queue support
- Job priority & scheduling
- Webhook notifications
- Event subscriptions
- Job status tracking

**Main Endpoints**:
```
POST   /api/jobs/{queueName}    # Submit job
GET    /api/jobs/{queueName}/{jobId}  # Check status
GET    /api/queues              # List queues
POST   /api/webhooks            # Configure webhooks
POST   /api/subscriptions       # Event subscriptions
GET    /api/explain             # Full documentation
```

**Quick Example**:
```bash
# Submit a job
curl -X POST https://queue.mech.is/api/jobs/processing \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "process-document",
    "data": { "fileId": "123", "action": "analyze" }
  }'
```

### 3. LLMs Service (llm.mech.is)

**Purpose**: Unified interface for multiple AI models.

**Key Features**:
- 20+ models from OpenAI, Anthropic, Google, Together
- Cost tracking and transparency
- Consistent API format
- Streaming support
- Multi-modal capabilities

**Main Endpoints**:
```
GET    /api/models              # List available models
POST   /api/chat                # Chat completion
POST   /api/complete            # Text completion
POST   /api/think               # Reasoning (o3)
POST   /api/analyze             # Multi-modal analysis
GET    /api/usage               # Cost tracking
GET    /api/explain             # Full documentation
```

**Quick Example**:
```bash
# Chat with GPT-4
curl -X POST https://llm.mech.is/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Explain quantum computing"}
    ]
  }'
```

### 4. Indexer Service (indexer.mech.is)

**Purpose**: Code indexing and semantic search.

**Key Features**:
- Repository indexing
- Vector embeddings
- Semantic code search
- Multiple file type support
- Project isolation

**Main Endpoints**:
```
POST   /api/universal/files/submit    # Index files by URL
POST   /api/universal/files/upload    # Upload and index
POST   /api/search                    # Semantic search
POST   /api/search/batch              # Batch search
GET    /api/universal/jobs/{jobId}    # Check indexing status
GET    /api/explain                   # Full documentation
```

**Quick Example**:
```bash
# Search indexed code
curl -X POST https://indexer.mech.is/api/search \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to implement authentication?",
    "projectId": "my-project"
  }'
```

### 5. Reader Service (reader.mech.is)

**Purpose**: Content processing and extraction.

**Key Features**:
- Video/audio transcription
- PDF text extraction
- Image analysis
- Document processing
- Social media scraping
- Webpage analysis

**Main Endpoints**:
```
POST   /api/content-processing         # Submit content
GET    /api/content-processing/{jobId} # Get results
GET    /api/rates                      # Processing costs
GET    /api/explain                    # Full documentation
```

**Quick Example**:
```bash
# Process a YouTube video
curl -X POST https://reader.mech.is/api/content-processing \
  -H "Content-Type: application/json" \
  -d '{
    "contentUrl": "https://youtube.com/watch?v=...",
    "contentName": "tutorial-video",
    "contentType": "text/html",
    "contentSize": 0,
    "processingType": "social_media",
    "userId": "user123"
  }'
```

### 6. Search Service (search.mech.is)

**Purpose**: Web and social media search capabilities.

**Key Features**:
- Google search (all types)
- Social media profile search
- Platform-specific search
- Autocomplete suggestions
- Multi-search support

**Main Endpoints**:
```
POST   /api/search              # General search
POST   /api/search/images       # Image search
POST   /api/search/news         # News search
POST   /api/search/platform     # Platform search
POST   /api/social/search       # Social profiles
GET    /api/explain             # Full documentation
```

**Quick Example**:
```bash
# Search the web
curl -X POST https://search.mech.is/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning tutorials",
    "options": { "limit": 10 }
  }'
```

## Common Integration Patterns

### 1. Document Analysis Pipeline
```javascript
// 1. Upload document to storage
const uploadResponse = await fetch('https://storage.mech.is/api/buckets/documents/objects', {
  method: 'POST',
  headers: { 'x-api-key': apiKey },
  body: formData
});

// 2. Submit for processing
const processResponse = await fetch('https://reader.mech.is/api/content-processing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contentUrl: uploadResponse.url,
    processingType: 'pdf',
    userId: 'user123'
  })
});

// 3. Analyze with AI
const analysisResponse = await fetch('https://llm.mech.is/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: `Analyze this document: ${processedText}` }
    ]
  })
});
```

### 2. Code Search and Analysis
```javascript
// 1. Index repository
const indexResponse = await fetch('https://indexer.mech.is/api/universal/files/bulk', {
  method: 'POST',
  headers: { 
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: 'my-project',
    files: repoFiles
  })
});

// 2. Search for specific functionality
const searchResponse = await fetch('https://indexer.mech.is/api/search', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'authentication middleware',
    projectId: 'my-project'
  })
});

// 3. Get AI explanation
const explainResponse = await fetch('https://llm.mech.is/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-3-sonnet',
    messages: [
      { role: 'user', content: `Explain this code: ${searchResults[0].content}` }
    ]
  })
});
```

### 3. Research Assistant
```javascript
// 1. Search for information
const webSearch = await fetch('https://search.mech.is/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'latest AI research papers 2025',
    options: { limit: 20 }
  })
});

// 2. Process academic papers
const processingJobs = await Promise.all(
  webSearch.results.map(result => 
    fetch('https://reader.mech.is/api/content-processing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentUrl: result.url,
        processingType: 'pdf',
        userId: 'researcher'
      })
    })
  )
);

// 3. Summarize findings
const summary = await fetch('https://llm.mech.is/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-3-opus',
    messages: [
      { 
        role: 'user', 
        content: `Summarize these research papers: ${processedPapers.join('\n\n')}` 
      }
    ]
  })
});
```

## Authentication

Most services use API key authentication:

```bash
# Header format
x-api-key: your-api-key-here

# Example
curl -H "x-api-key: sk-abc123..." https://service.mech.is/api/endpoint
```

## Rate Limits

| Service | Limit | Window |
|---------|-------|--------|
| Storage | 1000 req | 1 hour |
| Queue | 500 req | 1 hour |
| LLMs | 100 req | 1 minute |
| Indexer | 1000 req | 1 hour |
| Reader | 60 req | 1 minute |
| Search | 100 req | 1 minute |

## Error Handling

All services return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* Additional context */ }
  }
}
```

Common error codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid API key)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable

## Best Practices

1. **Use Webhooks**: For long-running jobs (Reader, Indexer), use webhooks instead of polling
2. **Batch Operations**: Use batch endpoints when processing multiple items
3. **Cache Results**: Cache search and AI responses to reduce costs
4. **Error Retry**: Implement exponential backoff for failed requests
5. **Monitor Usage**: Track API usage to stay within limits
6. **Project Isolation**: Use projectId/applicationId for multi-tenant scenarios

## Service Discovery

All services support the `/api/explain` endpoint for comprehensive documentation:

```bash
# Get full documentation for any service
curl https://[service].mech.is/api/explain

# Example: Get LLM service docs
curl https://llm.mech.is/api/explain
```

## Integration Support

For questions or issues:
- Documentation: This guide and individual service `/api/explain` endpoints
- Health Checks: `GET /health` on each service
- Status Page: Check deployment status in DEPLOYMENT_STATUS.md
- Examples: See integration patterns above

## Next Steps

1. Obtain API keys for the services you need
2. Test endpoints using the quick examples
3. Implement error handling and retries
4. Build integrated workflows using multiple services
5. Monitor usage and optimize for performance

Remember: Each service can be used independently, but they're designed to work together for powerful AI-driven workflows!