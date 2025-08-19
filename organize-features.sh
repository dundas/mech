#!/bin/bash

# Feature Organization Script for Mech Platform
# This script organizes uncommitted changes into logical feature commits

ORIGINAL_DIR="/Users/kefentse/dev_env/mech"
ORGANIZED_DIR="/Users/kefentse/dev_env/mech-organized"

echo "=== Organizing Mech Platform Features ==="
echo "Original directory: $ORIGINAL_DIR"
echo "Organized directory: $ORGANIZED_DIR"
echo ""

# Function to copy files while preserving directory structure
copy_files() {
    local feature_name=$1
    shift
    local files=("$@")
    
    echo "Processing feature: $feature_name"
    for file in "${files[@]}"; do
        if [[ -e "$ORIGINAL_DIR/$file" ]]; then
            # Create directory structure
            dir=$(dirname "$file")
            mkdir -p "$ORGANIZED_DIR/$dir"
            # Copy file
            cp -r "$ORIGINAL_DIR/$file" "$ORGANIZED_DIR/$file"
            echo "  Copied: $file"
        fi
    done
}

# Feature 1: Claude Code Integration
echo "=== Feature 1: Claude Code Integration ==="
copy_files "claude-integration" \
    ".claude" \
    "CLAUDE.md" \
    "CLAUDE_HOOKS_QUICK_START.md" \
    "CLAUDE_HOOKS_SETUP_GUIDE.md" \
    "CLAUDE_HOOKS_TESTING.md" \
    "setup-claude-hooks.js" \
    "setup-claude-hooks.sh" \
    "test-claude-hooks.js" \
    "test-claude-hooks-integration.js" \
    "diagnose-hooks.js" \
    "validate-claude-hooks.js" \
    "test-hook.txt" \
    "test-hook-trigger.txt" \
    "test-claude-hook.txt" \
    "test-claude-hook-memory.txt"

git add .claude CLAUDE*.md setup-claude-hooks.* test-claude-* diagnose-hooks.js validate-claude-hooks.js test-*hook*.txt
git commit -m "feat: Add Claude Code integration with hooks and monitoring

- Comprehensive Claude Code hooks for progress tracking
- Real-time reasoning storage and session management
- Auto-indexing of changed files
- Testing and validation scripts for Claude integration
- Documentation for Claude Code setup and usage"

# Feature 2: Deployment Infrastructure
echo ""
echo "=== Feature 2: Deployment Infrastructure ==="
copy_files "deployment-infrastructure" \
    "deploy-service.sh" \
    "deploy-single-service.sh" \
    "deploy-all-services.sh" \
    "deploy-all-services-production.sh" \
    "deploy-all-services-production-fixed.sh" \
    "deploy-to-production.sh" \
    "deploy-direct-to-server.sh" \
    "build-and-push-all-services.sh" \
    "docker-compose.yml" \
    "Dockerfile.scheduler" \
    "generalized-service-deployer.ts" \
    "DEPLOYMENT_COMPLETE_GUIDE.md" \
    "INFRASTRUCTURE_SETUP.md" \
    "NEW_SERVICE_PLAYBOOK.md" \
    "TROUBLESHOOTING_GUIDE.md" \
    "AI_AGENT_DEPLOYMENT_REFERENCE.md"

git add deploy-*.sh build-*.sh docker-compose*.yml Dockerfile.* generalized-service-deployer.ts *DEPLOYMENT*.md *INFRASTRUCTURE*.md *SERVICE*.md *TROUBLESHOOTING*.md
git commit -m "feat: Complete deployment infrastructure and automation

- Automated deployment scripts for all services
- Docker compose configurations for production
- Service-specific deployment playbooks
- Comprehensive troubleshooting guides
- AI agent deployment reference documentation"

# Feature 3: Security and Credentials Management
echo ""
echo "=== Feature 3: Security and Credentials Management ==="
copy_files "security-credentials" \
    "SECURITY_GUIDE.md" \
    "SECURITY_REMEDIATION_SUMMARY.md" \
    "CREDENTIAL_ROTATION_GUIDE.md" \
    "SECURE_ENVIRONMENT_MANAGEMENT.md" \
    ".env.example" \
    ".gitignore"

# Also copy the new security services from unified backend
if [[ -d "$ORIGINAL_DIR/mech-unified-backend/src/middleware" ]]; then
    copy_files "security-middleware" \
        "mech-unified-backend/src/middleware/credential-auth.ts" \
        "mech-unified-backend/src/services/encryption.service.ts" \
        "mech-unified-backend/src/services/database-credentials.service.ts" \
        "mech-unified-backend/src/models/database-credential.model.ts"
fi

git add SECURITY*.md CREDENTIAL*.md SECURE*.md .env.example .gitignore mech-unified-backend/src/middleware/credential-auth.ts mech-unified-backend/src/services/encryption.service.ts
git commit -m "feat: Enhance security with credential management system

- Credential rotation and management guides
- Encryption service for sensitive data
- Authentication middleware for services
- Security audit and remediation documentation
- Environment variable templates and examples"

# Feature 4: Testing and Monitoring Framework
echo ""
echo "=== Feature 4: Testing and Monitoring Framework ==="
copy_files "testing-monitoring" \
    "test-all-services.sh" \
    "test-all-mech-services.sh" \
    "test-services-direct.sh" \
    "test-services-simple.sh" \
    "test-config.json" \
    "test-results.json" \
    "check-database-save.js" \
    "check-agent-memories.js" \
    "MONITORING_AND_SCALING_STRATEGY.md"

# Copy all test scripts
for file in $ORIGINAL_DIR/test-*.js; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        cp "$file" "$ORGANIZED_DIR/$filename"
    fi
done

git add test-*.sh test-*.js test-*.json check-*.js MONITORING*.md
git commit -m "feat: Comprehensive testing and monitoring framework

- Service health check scripts
- Integration test suites for all services
- Performance monitoring tools
- Database and agent memory validation
- Scaling strategy documentation"

# Feature 5: DNS and Networking Configuration
echo ""
echo "=== Feature 5: DNS and Networking Configuration ==="
copy_files "dns-networking" \
    "configure_mech_dns.sh" \
    "update_mech_dns_to_vultr.sh" \
    "update-dns.sh" \
    "CLOUDFLARE_DNS_SETUP_GUIDE.md" \
    "DNS_MAPPING_ANALYSIS.md" \
    "setup_nginx_ssl.sh"

git add *dns*.sh *DNS*.md setup_nginx_ssl.sh
git commit -m "feat: DNS and networking infrastructure

- Cloudflare DNS configuration scripts
- Vultr DNS management automation
- Nginx SSL setup and configuration
- DNS mapping analysis and documentation"

# Feature 6: Documentation Updates
echo ""
echo "=== Feature 6: Documentation Updates ==="
copy_files "documentation" \
    "README.md" \
    "docs/README.md" \
    "docs/platforms/README.md" \
    "docs/API_DOCUMENTATION.md" \
    "docs/PROJECT_OVERVIEW.md" \
    "docs/SETUP_GUIDE.md" \
    "docs/QUICK_START_TODAY.md"

# Copy all new documentation
for doc in $ORIGINAL_DIR/docs/*.md; do
    if [[ -f "$doc" ]]; then
        filename=$(basename "$doc")
        mkdir -p "$ORGANIZED_DIR/docs"
        cp "$doc" "$ORGANIZED_DIR/docs/$filename"
    fi
done

git add README.md docs/*.md
git commit -m "docs: Comprehensive documentation overhaul

- Updated main README with current architecture
- API documentation for all services
- Quick start guides for developers
- Platform-specific documentation
- Removed outdated documentation files"

# Feature 7: Service Updates
echo ""
echo "=== Feature 7: Service Configuration Updates ==="
copy_files "service-updates" \
    "mech-queue/.env" \
    "mech-queue/FIX_DEPLOYMENT.md" \
    "mech-queue/src/services/schedule.service.ts" \
    "mech-unified-backend/Dockerfile" \
    "mech-unified-backend/package.json" \
    "mech-unified-backend/package-lock.json" \
    "mech-unified-backend/tsconfig.json" \
    "mech-unified-backend/src/app.ts" \
    "mech-unified-backend/src/config/database.ts"

git add mech-queue/.env mech-queue/FIX_DEPLOYMENT.md mech-queue/src/ mech-unified-backend/
git commit -m "fix: Service configuration and dependency updates

- Fixed MongoDB dependency issues for scheduler service
- Updated unified backend with new services
- Database configuration improvements
- TypeScript configuration updates
- Environment variable fixes for production"

echo ""
echo "=== Feature Organization Complete ==="
echo "All features have been organized into logical commits"
echo ""
echo "Summary of commits:"
git log --oneline -10