# Repository Management System - Setup Guide

## Quick Setup

This guide will help you set up the Repository Management System locally for development and testing.

## Prerequisites

### Required Software
- **Node.js 18+** - [Download](https://nodejs.org/)
- **pnpm** - Install with `npm install -g pnpm`
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use MongoDB Atlas
- **Git** - [Download](https://git-scm.com/)

### Browser Requirements
- **Chrome 88+** or **Firefox 89+** (for WebContainer support)
- JavaScript enabled
- Local storage enabled

## Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mech-ai/frontend
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration

Create environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/mech-ai
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mech-ai

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# GitHub OAuth (for repository access)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Optional: Indexer Service
INDEXER_API_URL=http://localhost:3001
```

### 4. Database Setup

#### Option A: Local MongoDB
```bash
# Start MongoDB service
mongod --dbpath ./data/db

# Create database (automatic on first connection)
```

#### Option B: MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env.local`

### 5. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App:
   - **Application name**: Mech AI Repository Manager
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and Client Secret to `.env.local`

### 6. Start Development Server
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Verification

### 1. Check Application Loading
- Navigate to `http://localhost:3000`
- You should see the login page
- No console errors in browser developer tools

### 2. Test Authentication
- Click "Sign in with GitHub"
- Complete OAuth flow
- You should be redirected to the dashboard

### 3. Test Repository Management
- Create a new project
- Navigate to project repositories
- Try adding a repository (use a public GitHub repo for testing)

### 4. Test Repository Execution
- Add a simple repository (e.g., a basic Node.js project)
- Configure build command: `npm install`
- Configure start command: `npm start` or `node index.js`
- Click "Execute" and verify WebContainer functionality

## Development Workflow

### File Structure
```
mech-ai/frontend/
├── app/                          # Next.js 15 app directory
│   ├── api/                      # API routes
│   │   ├── repositories/         # Repository management endpoints
│   │   └── projects/             # Project management endpoints
│   ├── projects/[projectId]/     # Project pages
│   │   └── repositories/         # Repository management UI
│   └── globals.css               # Global styles
├── components/                   # Reusable UI components
│   ├── ui/                       # Base UI components (shadcn/ui)
│   ├── repository-config.tsx     # Repository configuration form
│   └── repository-execution-panel.tsx # Execution interface
├── lib/                         # Utility libraries
│   ├── mongodb/                  # Database operations
│   │   └── repository-operations.ts
│   └── services/                 # Business logic
│       └── repository-execution-service.ts
└── docs/                        # Documentation
```

### Key Files to Understand

#### API Routes
- `app/api/repositories/[id]/route.ts` - Repository CRUD operations
- `app/api/repositories/[id]/execute/route.ts` - Repository execution
- `app/api/projects/[id]/repositories/route.ts` - Project repository management
- `app/api/projects/[id]/execute/route.ts` - Project-level execution

#### UI Components
- `app/projects/[projectId]/repositories/page.tsx` - Main repository dashboard
- `app/projects/[projectId]/repositories/[repositoryId]/execute/page.tsx` - Execution page
- `components/repository-execution-panel.tsx` - Execution interface component

#### Services
- `lib/services/repository-execution-service.ts` - WebContainer execution logic
- `lib/mongodb/repository-operations.ts` - Database operations

### Development Commands

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint

# Build for production
pnpm build

# Start production server
pnpm start
```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```
Error: MongoNetworkError: failed to connect to server
```
**Solution:**
- Ensure MongoDB is running: `mongod --dbpath ./data/db`
- Check connection string in `.env.local`
- For Atlas: verify network access and credentials

#### 2. GitHub OAuth Error
```
Error: OAuth app not found
```
**Solution:**
- Verify GitHub OAuth app configuration
- Check Client ID and Secret in `.env.local`
- Ensure callback URL matches: `http://localhost:3000/api/auth/callback/github`

#### 3. WebContainer Not Working
```
Error: WebContainer is not supported in this browser
```
**Solution:**
- Use Chrome 88+ or Firefox 89+
- Enable JavaScript
- Check browser console for additional errors
- Try in incognito/private mode

#### 4. Repository Execution Fails
```
Error: Failed to execute repository
```
**Solution:**
- Check repository build commands
- Verify repository is public or you have access
- Check browser console for WebContainer errors
- Try with a simple repository first

#### 5. API Endpoints Not Working
```
Error: 404 Not Found
```
**Solution:**
- Ensure development server is running
- Check API route file structure
- Verify Next.js 15 app directory structure
- Check for TypeScript compilation errors

### Debug Mode

Enable debug logging:
```bash
# Add to .env.local
DEBUG=repository:*
LOG_LEVEL=debug
NODE_ENV=development
```

### Performance Issues

If experiencing slow performance:
1. **Check MongoDB Performance**:
   ```bash
   # Monitor MongoDB
   mongostat
   ```

2. **Check Memory Usage**:
   - Monitor browser memory usage
   - Clear WebContainer instances
   - Restart development server

3. **Network Issues**:
   - Check API response times in browser dev tools
   - Verify GitHub API rate limits

## Testing

### Unit Tests
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test repository-execution-service.test.ts

# Run tests in watch mode
pnpm test --watch
```

### Integration Tests
```bash
# Run API integration tests
pnpm test:integration

# Test specific endpoint
pnpm test:integration --grep "repository execution"
```

### E2E Tests
```bash
# Run end-to-end tests
pnpm test:e2e

# Run specific test suite
pnpm test:e2e --grep "repository management"
```

## Production Deployment

### Environment Variables for Production
```env
# Production database
MONGODB_URI=mongodb+srv://prod-user:password@cluster.mongodb.net/mech-ai-prod

# Production URLs
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=secure-production-secret

# GitHub OAuth (production app)
GITHUB_CLIENT_ID=prod-github-client-id
GITHUB_CLIENT_SECRET=prod-github-client-secret

# Optional services
INDEXER_API_URL=https://indexer.your-domain.com
```

### Build and Deploy
```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Or deploy to Vercel
vercel deploy
```

## Next Steps

After successful setup:

1. **Read the Documentation**:
   - [Repository Management](./REPOSITORY_MANAGEMENT.md) - System overview
   - [API Reference](./API_REFERENCE.md) - API documentation
   - [UI Components](./UI_COMPONENTS.md) - Component documentation

2. **Try the Features**:
   - Create a project
   - Add repositories
   - Configure and execute repositories
   - Monitor execution logs

3. **Explore the Code**:
   - Review the API routes
   - Understand the WebContainer integration
   - Examine the UI components

4. **Contribute**:
   - Check open issues
   - Submit bug reports
   - Propose new features

## Support

If you encounter issues not covered in this guide:

1. **Check the Documentation**: Review the comprehensive docs in this directory
2. **Search Issues**: Look for similar issues in the GitHub repository
3. **Create an Issue**: Submit a detailed bug report or feature request
4. **Join Discussions**: Participate in GitHub discussions for questions

## Quick Reference

### Essential Commands
```bash
# Setup
pnpm install && cp .env.example .env.local

# Development
pnpm dev

# Testing
pnpm test

# Production
pnpm build && pnpm start
```

### Key URLs
- **Application**: http://localhost:3000
- **API Base**: http://localhost:3000/api
- **MongoDB**: mongodb://localhost:27017/mech-ai

### Important Files
- **Environment**: `.env.local`
- **Main Config**: `next.config.ts`
- **Database**: `lib/mongodb/`
- **API Routes**: `app/api/`
- **UI Pages**: `app/projects/` 