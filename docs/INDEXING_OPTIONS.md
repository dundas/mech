# MECH Codebase Indexing Options

**Last Updated**: 2025-01-27  
**Goal**: Enable code search for MECH AI self-improvement

## 🎯 Three Options for Indexing

### Option 1: Push to GitHub + Remote Index (Recommended)
**Best for**: Production use, persistent indexing

1. **Push MECH code to GitHub**
   ```bash
   cd /Users/kefentse/dev_env/mech
   git init
   git add .
   git commit -m "Initial MECH codebase"
   git remote add origin https://github.com/[your-username]/mech-ai
   git push -u origin main
   ```

2. **Trigger remote indexing via API**
   ```bash
   curl -X POST http://mech-indexer-8.eastus.azurecontainer.io:3000/api/index \
     -H "Content-Type: application/json" \
     -d '{
       "repositoryUrl": "https://github.com/[your-username]/mech-ai",
       "projectId": "mech-ai",
       "branch": "main"
     }'
   ```

**Pros**:
- Persistent indexing on remote server
- No local resources needed
- Automatic updates when you push changes
- Works from anywhere

**Cons**:
- Requires GitHub repository (can be private)
- Initial setup time

### Option 2: Local Indexer + Local MongoDB
**Best for**: Quick testing, development

1. **Start local MongoDB**
   ```bash
   # If you have Docker
   docker run -d -p 27017:27017 --name mech-mongo mongo:latest
   
   # Or install MongoDB locally
   brew install mongodb-community
   brew services start mongodb-community
   ```

2. **Configure local indexer**
   ```bash
   cd mech-indexer
   
   # Create .env file
   echo "MONGODB_URI=mongodb://localhost:27017" > .env
   echo "MONGODB_DB_NAME=mechdb" >> .env
   echo "OPENAI_API_KEY=your-key-here" >> .env
   echo "PORT=3003" >> .env
   ```

3. **Index locally**
   ```bash
   # Install dependencies
   npm install
   
   # Index MECH codebase
   npm run index:local -- --path=/Users/kefentse/dev_env/mech --projectId=mech-ai
   
   # Start API server
   npm run api:simple
   ```

4. **Update frontend to use local indexer**
   ```bash
   cd mech-ai/frontend
   export NEXT_PUBLIC_INDEXER_API_URL=http://localhost:3003
   npm run dev
   ```

**Pros**:
- Full control over indexing
- No external dependencies
- Fast local searches
- Can index private code easily

**Cons**:
- Requires local MongoDB
- Uses local resources
- Not persistent across machines

### Option 3: Direct File Access (No Indexing)
**Best for**: Immediate use, simple self-improvement

Simply use the existing tools without code search:
- `list_files` - Navigate directories
- `read_file` - Read specific files
- `analyze_project` - Get project overview
- `grep` via `execute_command` - Basic text search

**Example workflow without indexing**:
```
AI: Let me find error handling patterns
AI: *uses list_files on lib/tools/*
AI: *reads each tool file*
AI: *identifies patterns manually*
```

**Pros**:
- Works immediately
- No setup required
- Still enables self-improvement

**Cons**:
- Slower to find patterns
- No semantic search
- More API calls needed

## 📊 Comparison Matrix

| Feature | GitHub + Remote | Local Indexer | Direct Files |
|---------|-----------------|---------------|--------------|
| Setup Time | 30 min | 15 min | 0 min |
| Persistence | ✅ Permanent | ❌ Local only | N/A |
| Search Speed | ⚡ Fast | ⚡ Fast | 🐢 Slow |
| Resource Usage | ☁️ Remote | 💻 Local | 📁 Minimal |
| Private Code | ✅ Private repos | ✅ Yes | ✅ Yes |
| Maintenance | 🔄 Auto | 🔧 Manual | ✅ None |

## 🎯 Recommendation

**For MVP Testing**: Use **Option 3** (Direct Files)
- Start immediately
- Prove self-improvement works
- Add indexing later if needed

**For Production**: Use **Option 1** (GitHub + Remote)
- Set up once, works forever
- Scales with the project
- Professional approach

**For Development**: Use **Option 2** (Local Indexer)
- Full control
- Fast iteration
- Good for testing

## 🚀 Quick Decision Tree

```
Need to start NOW? → Option 3 (Direct Files)
Have 30 minutes? → Option 1 (GitHub + Remote)
Want full control? → Option 2 (Local Indexer)
```

## 💡 Hybrid Approach

You can also combine approaches:
1. Start with Option 3 (immediate testing)
2. Set up Option 1 in background
3. Switch when ready

This way MECH AI can start self-improving immediately while you set up better infrastructure.