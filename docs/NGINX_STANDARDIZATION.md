# Nginx Standardization for Mech Services

## Overview

All Mech services now include standardized nginx configuration for:
- **Flexible domain routing** - Support any domain, multiple domains, or wildcards
- **SSL automation** - Let's Encrypt certificates for any domain
- **Security headers** - Standard security configuration
- **Service-specific optimizations** - Timeouts, body sizes, etc.
- **Consistent deployment experience** - Same process for any domain

## Configuration Structure

Each service config now includes an `nginx` section:

```yaml
nginx:
  enabled: true                           # Enable/disable nginx setup
  
  # Domain Configuration (flexible options):
  domain: service.mech.is                 # Single domain
  # domain: api.company.com               # Custom domain
  # domain: api.com,www.api.com,v1.api.com # Multiple domains
  
  ssl: true                              # Enable SSL with Let's Encrypt
  ssl_email: admin@mech.is               # Email for SSL certificates
  proxy_timeout: 60                      # Proxy timeout in seconds
  client_max_body_size: 1M               # Max request body size
  additional_headers:                    # Custom headers (optional)
    - "X-Service-Type: llm"
    - "X-Service-Version: 1.2.0"
  locations:                             # Custom location blocks (optional)
    - path: "/"
      proxy_pass: "http://localhost:3008"
    - path: "/health"
      proxy_pass: "http://localhost:3008/health"
      access_log: false
```

## Service-Specific Configurations

### mech-llms (llm.mech.is)
- **Timeout**: 86400s (24 hours) for long-running AI tasks
- **Domain**: llm.mech.is
- **Size**: s-1vcpu-1gb (minimal for testing)

### mech-reader (reader.mech.is)  
- **Body Size**: 500M for large file uploads
- **Timeout**: 3600s (1 hour) for document processing
- **Special**: Upload endpoint with custom body size

### mech-search (search.mech.is)
- **Timeout**: 60s for quick search responses
- **Rate Limiting**: Built into nginx config
- **Size**: s-1vcpu-2gb

## Security Features

All services get standard security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: "1; mode=block"`
- `Referrer-Policy: strict-origin-when-cross-origin`

## SSL Configuration

- **Automatic**: SSL certificates via Let's Encrypt
- **Renewal**: Handled by certbot
- **Fallback**: HTTP access if SSL fails
- **Redirect**: Automatic HTTP → HTTPS redirect

## Deployment Process

1. **Parse Config**: Extract nginx settings from YAML
2. **Install Nginx**: apt-get install nginx certbot  
3. **Generate Config**: Create service-specific nginx config
4. **Enable Site**: Link to sites-enabled
5. **Start Service**: Deploy Docker container
6. **SSL Setup**: Attempt certificate generation
7. **Test**: Verify both IP and domain access

## Testing Commands

Each deployment provides test commands:
```bash
# Direct service access
curl http://IP:PORT/health

# Domain access (HTTP)
curl http://service.mech.is/health

# Domain access (HTTPS)
curl https://service.mech.is/health
```

## Flexible Domain Support

### Command Line Overrides

Override any domain configuration at deployment time:

```bash
# Deploy with custom domain
./deploy-mech-service.sh mech-llms production deploy --domain api.mycompany.com

# Deploy with multiple domains
./deploy-mech-service.sh mech-llms production deploy --domain "llm.ai,api.ai,v1.ai"

# Deploy without SSL (HTTP only)
./deploy-mech-service.sh mech-llms production deploy --no-ssl

# Deploy with custom SSL email
./deploy-mech-service.sh mech-llms production deploy --ssl-email security@company.com

# Combine multiple options
./deploy-mech-service.sh mech-llms production deploy --domain api.company.com --ssl-email admin@company.com --timeout 120
```

### Environment Variables

Set global defaults for all deployments:

```bash
# Set default domain suffix
export MECH_DOMAIN_SUFFIX="mycompany.com"
# Now services use: service-name.mycompany.com

# Set default SSL email
export MECH_SSL_EMAIL="ssl@mycompany.com"

# Disable SSL by default
export MECH_DISABLE_SSL="true"

# Deploy (will use environment defaults)
./deploy-mech-service.sh mech-llms
```

### Domain Configuration Options

1. **Single Domain**
   ```yaml
   nginx:
     domain: api.example.com
   ```

2. **Multiple Domains**
   ```yaml
   nginx:
     domain: api.example.com,www.example.com,v1.example.com
   ```

3. **Environment Variable Domain**
   ```yaml
   nginx:
     domain: ${SERVICE_NAME}.${MECH_DOMAIN_SUFFIX}
   ```

### SSL Certificate Management

- **Single Domain**: One certificate for the domain
- **Multiple Domains**: Single certificate covering all domains (SAN certificate)
- **Wildcard Support**: Manually specify `*.example.com` domains
- **Auto-Renewal**: Certificates renew automatically via cron

## DNS Requirements

Point all domains to droplet IP:

**For Default Setup:**
```
llm.mech.is      A    IP_ADDRESS
reader.mech.is   A    IP_ADDRESS  
search.mech.is   A    IP_ADDRESS
```

**For Custom Domains:**
```
api.mycompany.com    A    IP_ADDRESS
www.mycompany.com    A    IP_ADDRESS
v1.mycompany.com     A    IP_ADDRESS
```

## Configuration Examples

### Basic Service
```yaml
nginx:
  enabled: true
  domain: my-service.mech.is
  ssl: true
```

### High-Performance Service
```yaml
nginx:
  enabled: true
  domain: api.mech.is
  ssl: true
  proxy_timeout: 300
  client_max_body_size: 100M
```

### Development Service (No SSL)
```yaml
nginx:
  enabled: true
  domain: dev-api.mech.is
  ssl: false
```

## Benefits

✅ **Consistent**: Same nginx setup across all services
✅ **Secure**: Standard security headers and SSL
✅ **Flexible**: Service-specific optimizations
✅ **Automated**: No manual nginx configuration
✅ **Testable**: Built-in health check routing
✅ **Scalable**: Easy to add new services

## Migration Guide

Existing services automatically get nginx when redeployed:
1. Config includes nginx section by default
2. Deployment script detects and configures
3. DNS pointing activates SSL
4. Old IP access still works

This standardization ensures all API endpoints are properly exposed through secure, reliable domain routing.