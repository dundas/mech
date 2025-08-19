#!/bin/bash
# Setup script for Claude Code hooks integration with Mech AI

set -e

echo "🚀 Setting up Claude Code hooks for Mech AI project..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MECH_FRONTEND_URL="${MECH_FRONTEND_URL:-http://localhost:5500}"
MECH_PROJECT_ID="${MECH_PROJECT_ID:-mech-ai}"

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "mech-ai" ]]; then
    echo -e "${RED}❌ Please run this script from the mech project root directory${NC}"
    exit 1
fi

# Check if .claude directory exists
if [[ ! -d ".claude" ]]; then
    echo -e "${RED}❌ .claude directory not found. Please ensure Claude Code hooks are properly configured.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Frontend URL: $MECH_FRONTEND_URL"
echo "  Project ID: $MECH_PROJECT_ID"
echo ""

# Check if frontend is running
echo -n "🔍 Checking if frontend is running... "
if curl -s "$MECH_FRONTEND_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend not running${NC}"
    echo "  Please start the frontend first:"
    echo "  cd mech-ai/frontend && npm run dev"
    echo ""
    echo "  Or update MECH_FRONTEND_URL if running elsewhere"
    echo ""
fi

# Check environment variables
echo -n "🔍 Checking environment configuration... "
if [[ -f ".env" ]]; then
    echo -e "${GREEN}✓ .env file found${NC}"
    
    # Check for required variables
    if grep -q "MONGODB_URI" .env; then
        echo "  ✓ MongoDB URI configured"
    else
        echo -e "  ${YELLOW}⚠ MONGODB_URI not found in .env${NC}"
    fi
    
    if grep -q "OPENAI_API_KEY" .env; then
        echo "  ✓ OpenAI API key configured"
    else
        echo -e "  ${YELLOW}⚠ OPENAI_API_KEY not found in .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "  Consider creating .env file with required variables"
fi

# Update .env with Claude Code configuration
echo -n "🔧 Updating environment configuration... "
if [[ -f ".env" ]]; then
    # Add Claude Code configuration if not already present
    if ! grep -q "MECH_FRONTEND_URL" .env; then
        echo "" >> .env
        echo "# Claude Code Hooks Configuration" >> .env
        echo "MECH_FRONTEND_URL=$MECH_FRONTEND_URL" >> .env
        echo "MECH_PROJECT_ID=$MECH_PROJECT_ID" >> .env
        echo "MECH_AUTO_COMMIT=true" >> .env
        echo "MECH_AUTO_PUSH=false" >> .env
        echo -e "${GREEN}✓ Configuration added to .env${NC}"
    else
        echo -e "${YELLOW}⚠ Configuration already exists${NC}"
    fi
else
    # Create .env file
    cp .env.claude .env
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Test the hook system
echo ""
echo -e "${BLUE}🧪 Testing hook system...${NC}"
if ./.claude/hooks/test-hooks.sh; then
    echo -e "${GREEN}✅ Claude Code hooks setup completed successfully!${NC}"
    
    echo ""
    echo -e "${BLUE}🎯 What's configured:${NC}"
    echo "  • Hook scripts in .claude/hooks/"
    echo "  • Settings in .claude/settings.toml"
    echo "  • API endpoints for hook processing"
    echo "  • Reasoning storage and search"
    echo "  • Session tracking and management"
    echo ""
    echo -e "${BLUE}🚀 Getting started:${NC}"
    echo "  1. Start Claude Code in this directory"
    echo "  2. Begin coding - your progress will be automatically tracked"
    echo "  3. Check .claude/progress.log for hook activity"
    echo "  4. View reasoning: curl '$MECH_FRONTEND_URL/api/claude-reasoning?limit=5'"
    echo ""
    echo -e "${BLUE}📊 Monitoring:${NC}"
    echo "  • Hook logs: tail -f .claude/progress.log"
    echo "  • Hook health: curl '$MECH_FRONTEND_URL/api/claude-hooks'"
    echo "  • Reasoning search: curl '$MECH_FRONTEND_URL/api/claude-reasoning?query=your_search'"
    echo ""
    echo -e "${GREEN}Happy coding with Claude Code! 🤖${NC}"
    
else
    echo -e "${RED}❌ Hook system test failed${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo "  1. Ensure frontend is running: cd mech-ai/frontend && npm run dev"
    echo "  2. Check MongoDB connection in .env"
    echo "  3. Verify all hook scripts are executable"
    echo "  4. Check firewall/network connectivity"
    echo "  5. Review logs: tail -f .claude/progress.log"
    echo ""
    echo "For detailed help, see: CLAUDE.md"
    
    exit 1
fi