# Mech Registry Integration Guide

## Overview

The Mech Registry provides a centralized hub for managing all Mech services, replacing the need for manual tracking and deployment of individual repositories.

## Benefits

### 1. **Unified Service Management**
- Single source of truth for all Mech services
- Automatic version tracking and release management
- Centralized configuration management

### 2. **Simplified Deployment**
- Deploy any service with a single API call
- Automatic environment configuration
- Built-in rollback capabilities

### 3. **Service Discovery**
- Automatic endpoint discovery
- Dependency mapping
- Health monitoring

### 4. **Developer Experience**
- Self-service deployment
- API documentation aggregation
- Interactive service explorer

## Architecture Integration

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Mech Frontend │────▶│   Mech Registry  │────▶│  Mech Services  │
│                 │     │                  │     │                 │
│  - Service List │     │  - API Gateway   │     │  - mech-llms    │
│  - Deploy UI    │     │  - Orchestrator  │     │  - mech-search  │
│  - Monitoring   │     │  - Health Check  │     │  - mech-reader  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Infrastructure │
                        │                  │
                        │  - DigitalOcean  │
                        │  - Kubernetes    │
                        │  - Docker        │
                        └──────────────────┘
```

## Implementation Steps

### Phase 1: Registry Setup
1. Deploy Mech Registry service
2. Import existing service configurations
3. Set up authentication and authorization

### Phase 2: Service Migration
1. Register all existing Mech services
2. Update deployment scripts to use Registry API
3. Migrate service configurations

### Phase 3: Frontend Integration
1. Add Registry UI to Mech frontend
2. Implement deployment dashboard
3. Add service monitoring views

### Phase 4: Automation
1. Automatic service discovery from GitHub
2. CI/CD integration
3. Automated health checks

## Service Registration

Each Mech service needs to be registered with the following information:

```yaml
# service-config.yaml
id: mech-service-name
name: Human Readable Name
description: Service description
repository:
  url: https://github.com/mech-ai/mech-service
  branch: main
docker:
  registry: registry.digitalocean.com/queue-service-registry
  image: mech-service
configuration:
  port: 3000
  healthCheck: /health
  environment:
    required:
      - MONGODB_URI
      - API_KEY
    optional:
      - LOG_LEVEL
      - DEBUG
deployment:
  domains:
    - service.mech.is
  nginx:
    enabled: true
    ssl: true
endpoints:
  - path: /api/endpoint
    method: POST
    description: Endpoint description
```

## API Integration

### JavaScript/TypeScript
```typescript
import { MechRegistry } from '@mech-ai/registry-client';

const registry = new MechRegistry({
  url: 'https://registry.mech.is',
  apiKey: process.env.REGISTRY_API_KEY
});

// List services
const services = await registry.services.list();

// Deploy a service
const deployment = await registry.deploy('mech-llms', {
  environment: 'production',
  version: '1.2.0'
});

// Check health
const health = await registry.health.check('mech-llms');
```

### REST API
```bash
# List services
curl https://registry.mech.is/api/services

# Deploy service
curl -X POST https://registry.mech.is/api/deployments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "mech-llms",
    "environment": "production",
    "version": "1.2.0"
  }'
```

## Migration Path

### Current State
- Services managed individually
- Manual deployment scripts
- Separate configuration files
- No central monitoring

### Future State
- All services in registry
- One-click deployments
- Centralized configuration
- Real-time monitoring

### Migration Steps

1. **Week 1-2: Registry Deployment**
   - Deploy registry service
   - Set up database and storage
   - Configure authentication

2. **Week 3-4: Service Registration**
   - Register all existing services
   - Import configurations
   - Test deployment workflows

3. **Week 5-6: Frontend Integration**
   - Add registry views to frontend
   - Implement deployment UI
   - Add monitoring dashboard

4. **Week 7-8: Automation**
   - Set up CI/CD integration
   - Implement auto-discovery
   - Enable health monitoring

## Security Considerations

1. **Authentication**
   - JWT-based API authentication
   - Role-based access control
   - Service-specific permissions

2. **Secrets Management**
   - Encrypted storage of sensitive data
   - Environment variable injection
   - Audit logging

3. **Network Security**
   - SSL/TLS for all communications
   - Private network for service communication
   - Rate limiting and DDoS protection

## Monitoring and Observability

The registry provides built-in monitoring:

1. **Service Health**
   - Automated health checks
   - Uptime tracking
   - Alert notifications

2. **Deployment Tracking**
   - Deployment history
   - Version tracking
   - Rollback capabilities

3. **Performance Metrics**
   - Response time monitoring
   - Resource usage tracking
   - Error rate analysis

## Best Practices

1. **Service Design**
   - Include health check endpoints
   - Use semantic versioning
   - Document all endpoints

2. **Configuration**
   - Use environment variables
   - Separate configs by environment
   - Version control configurations

3. **Deployment**
   - Test in staging first
   - Use gradual rollouts
   - Monitor after deployment

## Future Enhancements

1. **Service Mesh Integration**
   - Istio/Linkerd support
   - Advanced traffic management
   - Service-to-service authentication

2. **Multi-Cloud Support**
   - AWS deployment
   - Google Cloud integration
   - Azure support

3. **Advanced Features**
   - A/B testing capabilities
   - Canary deployments
   - Cost optimization

## Getting Started

1. Clone the registry repository:
   ```bash
   git clone https://github.com/mech-ai/mech-registry
   cd mech-registry
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the registry:
   ```bash
   npm run dev
   ```

5. Access the dashboard:
   ```
   http://localhost:3020
   ```

## Support

- Documentation: https://registry.mech.is/docs
- API Reference: https://registry.mech.is/api-docs
- Issues: https://github.com/mech-ai/mech-registry/issues