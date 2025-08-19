# Vector Search API Documentation

## Overview
The Vector Search API provides powerful semantic and keyword search capabilities for indexed content with complete application isolation. Each application can only search within its own indexed documents.

## Key Features
- **Application Isolation**: Complete data separation between applications
- **Hybrid Search**: Combines semantic vector search with keyword matching
- **Advanced Filtering**: Filter by content type, date ranges, file properties, and custom metadata
- **Similarity Search**: Find documents similar to a given document
- **Batch Operations**: Perform multiple searches in a single request
- **Real-time Results**: Search newly indexed content immediately

## API Endpoints

### 1. Search Documents
**POST** `/api/search`

Perform a vector search with optional filters.

#### Request Body
```json
{
  "applicationId": "your-app-id",
  "query": "authentication implementation",
  "filters": {
    "contentTypes": ["source_code", "documentation"],
    "fileTypes": [".ts", ".js"],
    "createdAfter": "2024-01-01T00:00:00Z",
    "tags": ["security", "auth"],
    "minFileSize": 1024,
    "maxFileSize": 1048576
  },
  "limit": 20,
  "offset": 0,
  "options": {
    "searchMode": "hybrid",
    "includeContent": true,
    "includeMetadata": true,
    "includeHighlights": true,
    "similarityThreshold": 0.7
  }
}
```

#### Response
```json
{
  "success": true,
  "results": [
    {
      "id": "doc-123",
      "score": 0.92,
      "fileName": "auth.service.ts",
      "filePath": "/src/services/auth.service.ts",
      "fileSize": 4521,
      "mimeType": "text/typescript",
      "contentType": "source_code",
      "preview": "...implement JWT authentication with refresh tokens...",
      "highlights": [
        {
          "field": "textContent",
          "snippet": "class AuthenticationService implements IAuthService",
          "score": 0.95
        }
      ],
      "metadata": {
        "language": "typescript",
        "lineCount": 156,
        "imports": ["jsonwebtoken", "bcrypt"],
        "tags": ["security", "auth"]
      }
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0,
  "hasMore": true,
  "took": 125,
  "maxScore": 0.92
}
```

### 2. Batch Search
**POST** `/api/search/batch`

Perform multiple searches in a single request.

#### Request Body
```json
{
  "applicationId": "your-app-id",
  "searches": [
    {
      "id": "search-1",
      "query": "database connection",
      "filters": { "contentTypes": ["config"] }
    },
    {
      "id": "search-2",
      "query": "error handling patterns",
      "filters": { "languages": ["typescript"] }
    }
  ],
  "commonFilters": {
    "indexedAfter": "2024-01-01"
  },
  "commonOptions": {
    "limit": 5
  }
}
```

### 3. Find Similar Documents
**POST** `/api/search/similar`

Find documents similar to a given document.

#### Request Body
```json
{
  "applicationId": "your-app-id",
  "documentId": "doc-123",
  "limit": 10,
  "filters": {
    "contentTypes": ["source_code"]
  },
  "options": {
    "minSimilarity": 0.8
  }
}
```

### 4. Get Index Statistics
**GET** `/api/search/stats/{applicationId}`

Get statistics about the search index for an application.

#### Response
```json
{
  "success": true,
  "stats": {
    "applicationId": "your-app-id",
    "totalDocuments": 1523,
    "totalSize": 125829120,
    "contentTypeBreakdown": {
      "source_code": 892,
      "documentation": 234,
      "config": 156,
      "json_data": 241
    },
    "lastIndexedAt": "2024-01-15T10:30:00Z",
    "vectorDimensions": 1536,
    "indexHealth": "healthy"
  }
}
```

## Search Filters

### Content Type Filters
```json
{
  "contentTypes": ["source_code", "documentation", "config"],
  "fileTypes": [".ts", ".js", ".py"],
  "mimeTypes": ["text/javascript", "application/json"]
}
```

### Date Range Filters
```json
{
  "createdAfter": "2024-01-01T00:00:00Z",
  "createdBefore": "2024-12-31T23:59:59Z",
  "updatedAfter": "2024-06-01T00:00:00Z",
  "indexedAfter": "2024-01-01T00:00:00Z"
}
```

### File Property Filters
```json
{
  "minFileSize": 1024,
  "maxFileSize": 1048576,
  "fileNames": ["index.ts", "config.json"],
  "filePaths": ["/src/services/", "/config/"],
  "filePathPatterns": [".*\\.test\\.ts$", ".*\\/api\\/.*"]
}
```

### Metadata Filters
```json
{
  "tags": ["important", "security"],
  "categories": ["backend", "frontend"],
  "languages": ["typescript", "python"],
  "customFilters": {
    "projectId": "project-123",
    "version": "2.0.0"
  }
}
```

## Search Options

### Search Modes
- **semantic**: Pure vector similarity search
- **keyword**: Traditional text matching
- **hybrid**: Combines both approaches (default)

### Include Options
```json
{
  "includeContent": true,
  "includeMetadata": true,
  "includeHighlights": true,
  "highlightPreLength": 100,
  "highlightPostLength": 100
}
```

### Ranking Options
```json
{
  "boostFactors": {
    "contentType": {
      "source_code": 1.5,
      "documentation": 1.2
    },
    "recency": 0.8,
    "fileSize": 0.5
  }
}
```

## Pagination

### Using Offset
```json
{
  "limit": 20,
  "offset": 40
}
```

### Using Page Number
```json
{
  "limit": 20,
  "page": 3
}
```

## Example Use Cases

### 1. Search for Code Examples
```json
{
  "applicationId": "my-app",
  "query": "implement authentication middleware",
  "filters": {
    "contentTypes": ["source_code"],
    "languages": ["typescript", "javascript"]
  },
  "options": {
    "searchMode": "hybrid",
    "includeHighlights": true
  }
}
```

### 2. Find Recent Documentation
```json
{
  "applicationId": "my-app",
  "query": "API documentation",
  "filters": {
    "contentTypes": ["documentation", "markdown"],
    "updatedAfter": "2024-01-01",
    "tags": ["api", "rest"]
  }
}
```

### 3. Search Configuration Files
```json
{
  "applicationId": "my-app",
  "query": "database connection string",
  "filters": {
    "contentTypes": ["config"],
    "fileTypes": [".json", ".yaml", ".env"]
  }
}
```

### 4. Find Large Files
```json
{
  "applicationId": "my-app",
  "query": "*",
  "filters": {
    "minFileSize": 10485760
  },
  "limit": 50
}
```

## Best Practices

### 1. Use Appropriate Search Modes
- Use **semantic** for natural language queries
- Use **keyword** for exact matches
- Use **hybrid** for general searches

### 2. Optimize Filter Usage
- Apply filters to reduce search space
- Use content type filters for better relevance
- Combine multiple filters for precise results

### 3. Handle Pagination Properly
- Use reasonable page sizes (10-50)
- Implement cursor-based pagination for large result sets
- Cache results when appropriate

### 4. Monitor Performance
- Check the `took` field in responses
- Use batch search for multiple queries
- Implement client-side caching

## Error Handling

### Common Error Codes
- `INVALID_REQUEST`: Missing or invalid parameters
- `SEARCH_ERROR`: Search operation failed
- `APPLICATION_NOT_FOUND`: Invalid application ID
- `RATE_LIMIT_EXCEEDED`: Too many requests

### Error Response Format
```json
{
  "success": false,
  "error": "Invalid search query",
  "code": "INVALID_REQUEST",
  "details": {
    "field": "query",
    "message": "Query cannot be empty"
  }
}
```

## Rate Limits
- 100 requests per minute per application
- 10 concurrent searches per application
- Maximum 10 searches per batch request

## Security Considerations
- Application IDs are validated on every request
- Cross-application access is prevented
- Sensitive metadata can be excluded from results
- API keys should be kept secure