# Repository Execution System

## Overview

The Repository Execution System provides browser-based code execution capabilities using WebContainer technology. It enables secure, isolated execution of repository code with real-time monitoring and comprehensive logging.

## Architecture

### WebContainer Integration

The system uses WebContainer API to create isolated execution environments in the browser:

```typescript
import { WebContainer } from '@webcontainer/api';

class RepositoryExecutionService {
  private containers: Map<string, WebContainer> = new Map();
  private executionResults: Map<string, ExecutionResult> = new Map();
}
```

### Execution Flow

1. **Container Initialization**: Create isolated WebContainer instance
2. **Repository Setup**: Clone and prepare repository files
3. **Dependency Installation**: Run build commands and install dependencies
4. **Code Execution**: Execute start commands or custom code
5. **Monitoring**: Track execution status and capture logs
6. **Cleanup**: Dispose of container resources

## Core Components

### RepositoryExecutionService

Located at `lib/services/repository-execution-service.ts`, this service manages:

- **Container Lifecycle**: Creation, execution, and disposal
- **Execution State**: Tracking running executions
- **Result Management**: Storing and retrieving execution results
- **Multi-Repository Support**: Parallel and sequential execution

#### Key Methods

```typescript
// Execute single repository
async executeRepository(options: ExecutionOptions): Promise<ExecutionResult>

// Execute multiple repositories
async executeMultipleRepositories(
  repositoryIds: string[], 
  options: ExecutionOptions
): Promise<ExecutionResult[]>

// Get execution result
getExecutionResult(repositoryId: string): ExecutionResult | undefined

// Stop repository execution
async stopRepository(repositoryId: string): Promise<void>
```

### Execution Options

```typescript
interface ExecutionOptions {
  repositoryId: string;
  code?: string;                    // Optional code override
  timeout?: number;                 // Execution timeout (default: 30000ms)
  additionalEnvVars?: Record<string, string>;
}
```

### Execution Result

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

## API Endpoints

### Single Repository Execution

#### Start Execution
```http
POST /api/repositories/{id}/execute
Content-Type: application/json

{
  "code": "console.log('Hello World');",
  "timeout": 30000,
  "additionalEnvVars": {
    "NODE_ENV": "development"
  }
}
```

**Response:**
```json
{
  "success": true,
  "execution": {
    "id": "exec_123",
    "repositoryId": "repo_456",
    "status": "running",
    "startTime": "2024-01-01T12:00:00Z",
    "output": ["Starting execution..."],
    "success": false
  }
}
```

#### Get Execution Status
```http
GET /api/repositories/{id}/execute
```

**Response:**
```json
{
  "success": true,
  "execution": {
    "id": "exec_123",
    "repositoryId": "repo_456",
    "status": "completed",
    "startTime": "2024-01-01T12:00:00Z",
    "endTime": "2024-01-01T12:00:30Z",
    "duration": 30000,
    "output": [
      "Starting execution...",
      "Installing dependencies...",
      "Running build command...",
      "Execution completed successfully"
    ],
    "exitCode": 0,
    "success": true
  }
}
```

#### Stop Execution
```http
DELETE /api/repositories/{id}/execute
```

### Project-Level Execution

#### Execute Multiple Repositories
```http
POST /api/projects/{id}/execute
Content-Type: application/json

{
  "repositoryIds": ["repo_1", "repo_2"],
  "parallel": true,
  "timeout": 60000,
  "additionalEnvVars": {
    "NODE_ENV": "production"
  }
}
```

**Response:**
```json
{
  "success": true,
  "projectId": "project_123",
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "executions": [
    {
      "id": "exec_1",
      "repositoryId": "repo_1",
      "status": "completed",
      "success": true
    },
    {
      "id": "exec_2", 
      "repositoryId": "repo_2",
      "status": "completed",
      "success": true
    }
  ]
}
```

## UI Components

### RepositoryExecutionPanel

Located at `components/repository-execution-panel.tsx`, provides:

- **Real-time Status Display**: Current execution status
- **Live Log Streaming**: Real-time output logs
- **Control Interface**: Start, stop, and restart execution
- **Configuration Options**: Timeout and environment variable settings

#### Usage Example

```tsx
import { RepositoryExecutionPanel } from '@/components/repository-execution-panel';

<RepositoryExecutionPanel 
  repository={repository}
  onExecutionComplete={(result) => {
    console.log('Execution completed:', result);
  }}
/>
```

### Execution Pages

#### Individual Repository Execution
- **Route**: `/projects/[projectId]/repositories/[repositoryId]/execute`
- **Component**: `app/projects/[projectId]/repositories/[repositoryId]/execute/page.tsx`
- **Features**: Full-screen execution interface with navigation

#### Repository Dashboard Integration
- **Route**: `/projects/[projectId]/repositories`
- **Component**: `app/projects/[projectId]/repositories/page.tsx`
- **Features**: Quick execution buttons and status indicators

## WebContainer Configuration

### Container Setup

```typescript
async function setupContainer(repository: Repository): Promise<WebContainer> {
  const container = await WebContainer.boot();
  
  // Mount repository files
  await container.mount(repositoryFiles);
  
  // Set environment variables
  const env = {
    ...repository.environmentVariables,
    NODE_ENV: 'development',
    PORT: repository.port?.toString() || '3000'
  };
  
  return container;
}
```

### File System Structure

```typescript
interface FileSystemTree {
  [name: string]: {
    file?: {
      contents: string;
    };
    directory?: FileSystemTree;
  };
}
```

### Process Management

```typescript
// Install dependencies
const installProcess = await container.spawn('npm', ['install']);
await installProcess.exit;

// Run build command
if (repository.buildCommand) {
  const buildProcess = await container.spawn('sh', ['-c', repository.buildCommand]);
  await buildProcess.exit;
}

// Start application
const startProcess = await container.spawn('sh', ['-c', repository.startCommand]);
```

## Security Considerations

### Isolation
- **Container Isolation**: Each execution runs in isolated WebContainer
- **Resource Limits**: CPU and memory constraints applied
- **Network Restrictions**: Limited network access for security

### Environment Variables
- **Sensitive Data**: Environment variables sanitized in logs
- **Access Control**: Only authorized users can set environment variables
- **Encryption**: Sensitive variables encrypted at rest

### Code Execution
- **Timeout Protection**: Automatic termination after timeout
- **Resource Monitoring**: CPU and memory usage tracking
- **Output Sanitization**: Logs sanitized to prevent information leakage

## Performance Optimization

### Container Reuse
```typescript
// Reuse containers for multiple executions
private async getOrCreateContainer(repositoryId: string): Promise<WebContainer> {
  if (this.containers.has(repositoryId)) {
    return this.containers.get(repositoryId)!;
  }
  
  const container = await WebContainer.boot();
  this.containers.set(repositoryId, container);
  return container;
}
```

### Parallel Execution
```typescript
async executeMultipleRepositories(
  repositoryIds: string[],
  options: ExecutionOptions
): Promise<ExecutionResult[]> {
  const promises = repositoryIds.map(id => 
    this.executeRepository({ ...options, repositoryId: id })
  );
  
  return Promise.all(promises);
}
```

### Resource Management
- **Container Cleanup**: Automatic disposal after execution
- **Memory Management**: Efficient memory usage patterns
- **Process Monitoring**: Track and limit resource consumption

## Error Handling

### Execution Errors

#### Timeout Handling
```typescript
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Execution timeout')), timeout);
});

const executionPromise = this.runExecution(container, repository);

try {
  const result = await Promise.race([executionPromise, timeoutPromise]);
  return result;
} catch (error) {
  if (error.message === 'Execution timeout') {
    return {
      status: 'timeout',
      error: 'Execution exceeded timeout limit',
      success: false
    };
  }
  throw error;
}
```

#### Build Failures
```typescript
const buildProcess = await container.spawn('npm', ['run', 'build']);
const buildExit = await buildProcess.exit;

if (buildExit !== 0) {
  return {
    status: 'failed',
    error: 'Build command failed',
    exitCode: buildExit,
    success: false
  };
}
```

### Error Types

1. **Container Boot Failure**: WebContainer initialization fails
2. **File System Errors**: Repository file mounting issues
3. **Build Failures**: Dependency installation or build command failures
4. **Runtime Errors**: Application execution errors
5. **Timeout Errors**: Execution exceeds time limit
6. **Resource Errors**: Insufficient memory or CPU

## Monitoring and Logging

### Real-time Monitoring

```typescript
// Stream process output
startProcess.output.pipeTo(new WritableStream({
  write(data) {
    const output = new TextDecoder().decode(data);
    this.appendOutput(executionId, output);
    this.notifyClients(executionId, output);
  }
}));
```

### Log Management

```typescript
interface ExecutionLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: 'system' | 'stdout' | 'stderr';
}
```

### Metrics Collection

- **Execution Duration**: Track execution times
- **Success Rate**: Monitor execution success/failure rates
- **Resource Usage**: CPU and memory consumption
- **Error Frequency**: Track common error patterns

## Testing

### Unit Tests

```typescript
describe('RepositoryExecutionService', () => {
  it('should execute repository successfully', async () => {
    const service = new RepositoryExecutionService();
    const result = await service.executeRepository({
      repositoryId: 'test-repo',
      timeout: 10000
    });
    
    expect(result.success).toBe(true);
    expect(result.status).toBe('completed');
  });
});
```

### Integration Tests

```typescript
describe('Repository Execution API', () => {
  it('should start execution via API', async () => {
    const response = await fetch('/api/repositories/test-repo/execute', {
      method: 'POST',
      body: JSON.stringify({ timeout: 10000 })
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

#### WebContainer Boot Failure
```bash
Error: Failed to boot WebContainer
Solution: Check browser compatibility and WebContainer API availability
```

#### Execution Timeout
```bash
Error: Execution timeout after 30000ms
Solution: Increase timeout or optimize repository build process
```

#### Memory Issues
```bash
Error: Out of memory during execution
Solution: Optimize code or increase container memory limits
```

### Debug Mode

Enable detailed logging:
```typescript
const DEBUG_MODE = process.env.NODE_ENV === 'development';

if (DEBUG_MODE) {
  console.log('Container state:', container);
  console.log('Execution options:', options);
}
```

### Performance Profiling

```typescript
const startTime = performance.now();
const result = await executeRepository(options);
const duration = performance.now() - startTime;

console.log(`Execution completed in ${duration}ms`);
```

## Best Practices

### Container Management
1. **Cleanup**: Always dispose containers after execution
2. **Reuse**: Reuse containers for similar executions when possible
3. **Monitoring**: Track container resource usage
4. **Limits**: Set appropriate timeout and resource limits

### Error Handling
1. **Graceful Degradation**: Handle failures gracefully
2. **User Feedback**: Provide clear error messages
3. **Logging**: Log errors for debugging
4. **Recovery**: Implement retry mechanisms where appropriate

### Performance
1. **Parallel Execution**: Use parallel execution for multiple repositories
2. **Caching**: Cache build artifacts when possible
3. **Optimization**: Optimize build and start commands
4. **Resource Management**: Monitor and limit resource usage 