# Repository Management API Reference

## Overview

The Repository Management API provides comprehensive endpoints for managing repositories within projects, including CRUD operations, execution control, and configuration management.

## Base URL

```
https://your-domain.com/api
```

## Authentication

All API endpoints require authentication via session cookies. Users must be logged in and have appropriate permissions for the requested resources.

### Authentication Headers

```http
Cookie: next-auth.session-token=<session-token>
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

## Repository Endpoints

### Get Repository

Retrieves detailed information about a specific repository.

```http
GET /api/repositories/{id}
```

#### Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Repository identifier |

#### Response

```json
{
  "success": true,
  "repository": {
    "id": "repo_123",
    "projectId": "project_456",
    "githubUrl": "https://github.com/user/repo",
    "name": "my-repo",
    "fullName": "user/my-repo",
    "branch": "main",
    "fileSystemPath": "/path/to/repo",
    "localGitPath": "/git/path",
    "environmentVariables": {
      "NODE_ENV": "development",
      "API_KEY": "secret"
    },
    "buildCommand": "npm install && npm run build",
    "startCommand": "npm start",
    "workingDirectory": "./",
    "port": 3000,
    "healthCheckUrl": "http://localhost:3000/health",
    "language": "JavaScript",
    "framework": "React",
    "description": "A sample React application",
    "private": false,
    "stars": 42,
    "forks": 7,
    "lastUpdated": "2024-01-01T12:00:00Z",
    "status": "active",
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

#### Error Responses

```json
{
  "error": "Repository not found"
}
```

### Update Repository

Updates repository configuration and settings.

```http
PUT /api/repositories/{id}
```

#### Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Repository identifier |

#### Request Body

```json
{
  "githubUrl": "https://github.com/user/repo",
  "branch": "main",
  "environmentVariables": {
    "NODE_ENV": "production",
    "API_KEY": "new-secret"
  },
  "buildCommand": "npm install && npm run build",
  "startCommand": "npm start",
  "workingDirectory": "./",
  "port": 3000,
  "healthCheckUrl": "http://localhost:3000/health",
  "status": "active"
}
```

#### Response

```json
{
  "success": true,
  "repository": {
    "id": "repo_123",
    "projectId": "project_456",
    // ... updated repository data
  }
}
```

#### Error Responses

```json
{
  "error": "Validation failed",
  "details": [
    "GitHub URL is required",
    "Branch is required"
  ]
}
```

### Delete Repository

Removes a repository from the project.

```http
DELETE /api/repositories/{id}
```

#### Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Repository identifier |

#### Response

```json
{
  "success": true,
  "message": "Repository deleted successfully"
}
```

#### Error Responses

```json
{
  "error": "Cannot delete repository with active executions"
}
```

## Repository Execution Endpoints

### Start Repository Execution

Initiates execution of a repository with optional configuration.

```http
POST /api/repositories/{id}/execute
```

#### Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Repository identifier |

#### Request Body

```json
{
  "code": "console.log('Custom code override');",
  "timeout": 30000,
  "additionalEnvVars": {
    "DEBUG": "true",
    "LOG_LEVEL": "verbose"
  }
}
```

#### Request Body Parameters

| Parameter           | Type   | Required | Default | Description                    |
|--------------------|--------|----------|---------|--------------------------------|
| `code`             | string | No       | null    | Custom code to execute         |
| `timeout`          | number | No       | 30000   | Execution timeout in ms        |
| `additionalEnvVars`| object | No       | {}      | Additional environment variables|

#### Response

```json
{
  "success": true,
  "execution": {
    "id": "exec_789",
    "repositoryId": "repo_123",
    "status": "running",
    "startTime": "2024-01-01T12:00:00Z",
    "output": [
      "Starting execution...",
      "Installing dependencies..."
    ],
    "success": false
  }
}
```

#### Error Responses

```json
{
  "error": "Repository is already executing"
}
```

```json
{
  "error": "Failed to execute repository",
  "message": "Container initialization failed"
}
```

### Get Execution Status

Retrieves the current execution status and results.

```http
GET /api/repositories/{id}/execute
```

#### Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Repository identifier |

#### Response

```json
{
  "success": true,
  "execution": {
    "id": "exec_789",
    "repositoryId": "repo_123",
    "status": "completed",
    "startTime": "2024-01-01T12:00:00Z",
    "endTime": "2024-01-01T12:00:30Z",
    "duration": 30000,
    "output": [
      "Starting execution...",
      "Installing dependencies...",
      "Running build command...",
      "Build completed successfully",
      "Starting application...",
      "Application running on port 3000"
    ],
    "error": null,
    "exitCode": 0,
    "success": true
  }
}
```

#### Error Responses

```json
{
  "error": "No execution result found for this repository"
}
```

### Stop Repository Execution

Terminates a running repository execution.

```http
DELETE /api/repositories/{id}/execute
```

#### Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Repository identifier |

#### Response

```json
{
  "success": true,
  "message": "Repository execution stopped"
}
```

#### Error Responses

```json
{
  "error": "No active execution found for this repository"
}
```

## Project Repository Endpoints

### Get Project Repositories

Retrieves all repositories associated with a project.

```http
GET /api/projects/{id}/repositories
```

#### Parameters

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `id`      | string | Yes      | Project identifier |

#### Query Parameters

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| `status`  | string | No       | Filter by status (active, inactive, error) |
| `limit`   | number | No       | Maximum number of results     |
| `offset`  | number | No       | Number of results to skip     |

#### Response

```json
{
  "success": true,
  "repositories": [
    {
      "id": "repo_123",
      "projectId": "project_456",
      "name": "frontend-app",
      "status": "active",
      // ... other repository fields
    },
    {
      "id": "repo_124",
      "projectId": "project_456",
      "name": "backend-api",
      "status": "inactive",
      // ... other repository fields
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

### Add Repository to Project

Adds a new repository to a project.

```http
POST /api/projects/{id}/repositories
```

#### Parameters

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `id`      | string | Yes      | Project identifier |

#### Request Body

```json
{
  "githubUrl": "https://github.com/user/new-repo",
  "branch": "main",
  "buildCommand": "npm install",
  "startCommand": "npm start",
  "environmentVariables": {
    "NODE_ENV": "development"
  },
  "workingDirectory": "./",
  "port": 3000,
  "description": "New repository for the project"
}
```

#### Request Body Parameters

| Parameter           | Type   | Required | Description                    |
|--------------------|--------|----------|--------------------------------|
| `githubUrl`        | string | Yes      | GitHub repository URL          |
| `branch`           | string | Yes      | Git branch to use              |
| `buildCommand`     | string | No       | Command to build the repository|
| `startCommand`     | string | No       | Command to start the application|
| `environmentVariables`| object | No    | Environment variables          |
| `workingDirectory` | string | No       | Working directory for commands |
| `port`             | number | No       | Application port               |
| `description`      | string | No       | Repository description         |

#### Response

```json
{
  "success": true,
  "repository": {
    "id": "repo_125",
    "projectId": "project_456",
    "githubUrl": "https://github.com/user/new-repo",
    "name": "new-repo",
    "fullName": "user/new-repo",
    "branch": "main",
    "status": "active",
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
    // ... other fields
  }
}
```

#### Error Responses

```json
{
  "error": "Repository already exists in this project"
}
```

```json
{
  "error": "Invalid GitHub URL"
}
```

### Execute Project Repositories

Executes multiple repositories within a project.

```http
POST /api/projects/{id}/execute
```

#### Parameters

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `id`      | string | Yes      | Project identifier |

#### Request Body

```json
{
  "repositoryIds": ["repo_123", "repo_124"],
  "parallel": true,
  "timeout": 60000,
  "additionalEnvVars": {
    "NODE_ENV": "production",
    "DEBUG": "false"
  }
}
```

#### Request Body Parameters

| Parameter           | Type     | Required | Default | Description                    |
|--------------------|----------|----------|---------|--------------------------------|
| `repositoryIds`    | string[] | No       | all     | Specific repositories to execute|
| `parallel`         | boolean  | No       | true    | Execute repositories in parallel|
| `timeout`          | number   | No       | 30000   | Execution timeout in ms        |
| `additionalEnvVars`| object   | No       | {}      | Additional environment variables|

#### Response

```json
{
  "success": true,
  "projectId": "project_456",
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "executions": [
    {
      "id": "exec_790",
      "repositoryId": "repo_123",
      "status": "completed",
      "startTime": "2024-01-01T12:00:00Z",
      "endTime": "2024-01-01T12:00:30Z",
      "duration": 30000,
      "success": true
    },
    {
      "id": "exec_791",
      "repositoryId": "repo_124",
      "status": "completed",
      "startTime": "2024-01-01T12:00:00Z",
      "endTime": "2024-01-01T12:00:45Z",
      "duration": 45000,
      "success": true
    }
  ]
}
```

#### Error Responses

```json
{
  "error": "No active repositories found in this project"
}
```

### Get Project Execution Status

Retrieves execution status for all repositories in a project.

```http
GET /api/projects/{id}/execute
```

#### Parameters

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `id`      | string | Yes      | Project identifier |

#### Response

```json
{
  "success": true,
  "projectId": "project_456",
  "executions": [
    {
      "repositoryId": "repo_123",
      "repositoryName": "frontend-app",
      "result": {
        "id": "exec_790",
        "status": "running",
        "startTime": "2024-01-01T12:00:00Z",
        "success": false
      }
    },
    {
      "repositoryId": "repo_124",
      "repositoryName": "backend-api",
      "result": {
        "id": "exec_791",
        "status": "completed",
        "startTime": "2024-01-01T12:00:00Z",
        "endTime": "2024-01-01T12:00:45Z",
        "success": true
      }
    }
  ]
}
```

### Stop Project Executions

Stops all running executions for repositories in a project.

```http
DELETE /api/projects/{id}/execute
```

#### Parameters

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `id`      | string | Yes      | Project identifier |

#### Response

```json
{
  "success": true,
  "message": "Stopped execution for 2 repositories",
  "projectId": "project_456"
}
```

## Data Models

### Repository Model

```typescript
interface Repository {
  id: string;
  projectId: string;
  githubUrl: string;
  name: string;
  fullName: string;
  branch: string;
  fileSystemPath?: string;
  localGitPath?: string;
  environmentVariables: Record<string, string>;
  buildCommand?: string;
  startCommand?: string;
  workingDirectory?: string;
  port?: number;
  healthCheckUrl?: string;
  language?: string;
  framework?: string;
  description?: string;
  private: boolean;
  stars: number;
  forks: number;
  lastUpdated: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}
```

### Execution Result Model

```typescript
interface ExecutionResult {
  id: string;
  repositoryId: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  output: string[];
  error?: string;
  exitCode?: number;
  success: boolean;
}
```

### Execution Options Model

```typescript
interface ExecutionOptions {
  repositoryId: string;
  code?: string;
  timeout?: number;
  additionalEnvVars?: Record<string, string>;
}
```

## Status Codes

### Success Codes

| Code | Description                    |
|------|--------------------------------|
| 200  | OK - Request successful        |
| 201  | Created - Resource created     |

### Error Codes

| Code | Description                    |
|------|--------------------------------|
| 400  | Bad Request - Invalid input    |
| 401  | Unauthorized - Authentication required |
| 403  | Forbidden - Access denied      |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource conflict   |
| 500  | Internal Server Error          |

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Repository Operations**: 100 requests per minute per user
- **Execution Operations**: 10 executions per minute per user
- **Project Operations**: 50 requests per minute per user

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error description",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/api/repositories/123"
}
```

### Common Error Codes

| Code                    | Description                           |
|-------------------------|---------------------------------------|
| `REPOSITORY_NOT_FOUND`  | Repository does not exist             |
| `EXECUTION_FAILED`      | Repository execution failed           |
| `VALIDATION_ERROR`      | Request validation failed             |
| `PERMISSION_DENIED`     | Insufficient permissions              |
| `RESOURCE_CONFLICT`     | Resource already exists or in use     |
| `TIMEOUT_ERROR`         | Operation timed out                   |

## Webhooks

### Repository Status Updates

Webhook notifications for repository status changes:

```http
POST https://your-webhook-url.com/repository-status
Content-Type: application/json

{
  "event": "repository.status.changed",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "repositoryId": "repo_123",
    "projectId": "project_456",
    "oldStatus": "inactive",
    "newStatus": "active",
    "repository": {
      // ... full repository object
    }
  }
}
```

### Execution Completed

Webhook notifications for execution completion:

```http
POST https://your-webhook-url.com/execution-completed
Content-Type: application/json

{
  "event": "execution.completed",
  "timestamp": "2024-01-01T12:00:30Z",
  "data": {
    "executionId": "exec_789",
    "repositoryId": "repo_123",
    "projectId": "project_456",
    "status": "completed",
    "success": true,
    "duration": 30000,
    "execution": {
      // ... full execution result object
    }
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { RepositoryAPI } from '@mech/repository-api';

const api = new RepositoryAPI({
  baseURL: 'https://your-domain.com/api',
  sessionToken: 'your-session-token'
});

// Get repository
const repository = await api.repositories.get('repo_123');

// Execute repository
const execution = await api.repositories.execute('repo_123', {
  timeout: 60000,
  additionalEnvVars: { NODE_ENV: 'production' }
});

// Get execution status
const status = await api.repositories.getExecutionStatus('repo_123');
```

### Python

```python
from mech_repository_api import RepositoryAPI

api = RepositoryAPI(
    base_url='https://your-domain.com/api',
    session_token='your-session-token'
)

# Get repository
repository = api.repositories.get('repo_123')

# Execute repository
execution = api.repositories.execute('repo_123', {
    'timeout': 60000,
    'additional_env_vars': {'NODE_ENV': 'production'}
})

# Get execution status
status = api.repositories.get_execution_status('repo_123')
```

### cURL Examples

#### Get Repository
```bash
curl -X GET \
  https://your-domain.com/api/repositories/repo_123 \
  -H "Cookie: next-auth.session-token=your-session-token"
```

#### Execute Repository
```bash
curl -X POST \
  https://your-domain.com/api/repositories/repo_123/execute \
  -H "Cookie: next-auth.session-token=your-session-token" \
  -H "Content-Type: application/json" \
  -d '{
    "timeout": 60000,
    "additionalEnvVars": {
      "NODE_ENV": "production"
    }
  }'
```

#### Stop Execution
```bash
curl -X DELETE \
  https://your-domain.com/api/repositories/repo_123/execute \
  -H "Cookie: next-auth.session-token=your-session-token"
```

## Testing

### API Testing with Jest

```typescript
import { describe, it, expect } from '@jest/globals';
import { RepositoryAPI } from './repository-api';

describe('Repository API', () => {
  const api = new RepositoryAPI({
    baseURL: 'http://localhost:3000/api',
    sessionToken: 'test-token'
  });

  it('should get repository details', async () => {
    const repository = await api.repositories.get('test-repo-id');
    expect(repository.id).toBe('test-repo-id');
    expect(repository.status).toBe('active');
  });

  it('should execute repository', async () => {
    const execution = await api.repositories.execute('test-repo-id', {
      timeout: 30000
    });
    expect(execution.success).toBe(true);
    expect(execution.execution.status).toBe('running');
  });
});
```

### Integration Testing

```typescript
import { test, expect } from '@playwright/test';

test('repository execution flow', async ({ page }) => {
  await page.goto('/projects/test-project/repositories');
  
  // Click execute button
  await page.click('[data-testid="execute-repo-123"]');
  
  // Verify navigation to execution page
  await expect(page).toHaveURL(/.*\/execute$/);
  
  // Verify execution started
  await expect(page.locator('[data-testid="execution-status"]')).toContainText('running');
});
``` 