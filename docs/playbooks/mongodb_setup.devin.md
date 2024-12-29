Playbook: MongoDB Schema Setup for Chat Framework

## Overview
Set up a MongoDB database with the core collections and indexes required for the chat framework boilerplate. This playbook helps implement the standard data structure while allowing for customization based on project needs.

## What's Needed From User
- MongoDB connection string
- Project-specific names for Block and Container collections (optional)
- Any additional metadata fields needed for the project

## Procedure
1. Connect to MongoDB using the provided connection string
2. Create the database for the project
3. Set up core collections:
   - Create users collection
   - Create blocks collection (or project-specific name)
   - Create containers collection (or project-specific name)
   - Create messages collection
   - Create conversations collection
4. Create required indexes:
   ```javascript
   // Basic indexes for core functionality
   db.blocks.createIndex({ containerId: 1 })
   db.blocks.createIndex({ createdAt: -1 })
   db.messages.createIndex({ conversationId: 1, createdAt: 1 })
   db.conversations.createIndex({ participants: 1 })
   db.conversations.createIndex({ lastMessageAt: -1 })
   ```
5. Set up schema validation:
   ```javascript
   db.createCollection('users', {
     validator: {
       $jsonSchema: {
         required: ['email', 'role', 'createdAt'],
         properties: {
           email: { type: 'string' },
           role: { enum: ['user', 'admin', 'agent'] }
         }
       }
     }
   })
   ```
6. Insert test documents to verify setup
7. Confirm successful setup to user

## Specifications
1. Core Collections Structure:
   ```typescript
   // Users
   {
     _id: ObjectId
     email: string
     name: string
     role: "user" | "admin" | "agent"
     createdAt: Date
     updatedAt: Date
     settings: {
       theme: string
       notifications: boolean
       preferences: Record<string, any>
     }
     metadata: Record<string, any>
   }

   // Blocks (customizable name)
   {
     _id: ObjectId
     type: string
     content: string | Record<string, any>
     metadata: Record<string, any>
     containerId?: ObjectId
     createdBy: ObjectId
     createdAt: Date
     updatedAt: Date
     status: "active" | "archived" | "deleted"
   }

   // Containers (customizable name)
   {
     _id: ObjectId
     type: string
     name: string
     description?: string
     metadata: Record<string, any>
     parentId?: ObjectId
     createdBy: ObjectId
     createdAt: Date
     updatedAt: Date
     status: "active" | "archived" | "deleted"
   }

   // Messages
   {
     _id: ObjectId
     conversationId: ObjectId
     content: string
     role: "user" | "assistant" | "system"
     metadata: {
       model?: string
       tokens?: number
       tools?: string[]
     }
     createdAt: Date
     context?: {
       blockIds: ObjectId[]
       toolCalls?: Record<string, any>[]
     }
   }

   // Conversations
   {
     _id: ObjectId
     title: string
     participants: ObjectId[]
     settings: {
       model: string
       temperature?: number
       systemPrompt?: string
     }
     metadata: Record<string, any>
     createdAt: Date
     updatedAt: Date
     lastMessageAt: Date
     status: "active" | "archived" | "deleted"
   }
   ```

## Advice and Pointers
1. Collection Naming:
   - Choose names that match your domain
   - Keep names clear and consistent
   - Document your naming choices

2. Schema Design:
   - Use flexible metadata fields
   - Start with minimal required fields
   - Add indexes based on query patterns
   - Use soft deletes via status field

3. Performance:
   - Create indexes sparingly
   - Monitor index size and usage
   - Use compound indexes for common queries

## Example Customizations

### Knowledge Base
```javascript
// Rename collections
db.createCollection('articles')     // Instead of blocks
db.createCollection('categories')   // Instead of containers

// Example document
{
  _id: ObjectId,
  type: "article",
  content: "Article content...",
  metadata: {
    author: "John Doe",
    tags: ["guide", "tutorial"]
  },
  containerId: categoryId,
  status: "active"
}
```

### Task Manager
```javascript
// Rename collections
db.createCollection('tasks')        // Instead of blocks
db.createCollection('projects')     // Instead of containers

// Example document
{
  _id: ObjectId,
  type: "task",
  content: {
    description: "Implement feature",
    checklist: [
      { item: "Write tests", done: false }
    ]
  },
  metadata: {
    priority: "high",
    dueDate: "2024-01-15"
  },
  containerId: projectId,
  status: "active"
}
```

## Forbidden Actions
1. DO NOT:
   - Drop existing collections without backup
   - Remove required indexes
   - Set overly restrictive validation
   - Create unnecessary indexes
   - Use physical deletes (use status field)

## Verification Steps
1. Run test queries:
   ```javascript
   // Test basic operations
   db.users.insertOne({...})
   db.blocks.insertOne({...})
   db.containers.insertOne({...})
   
   // Test relationships
   db.blocks.find({ containerId: someContainerId })
   
   // Test indexes
   db.blocks.find({ containerId: 1 }).explain()
   ```

2. Verify schema validation:
   ```javascript
   // Should fail (missing required fields)
   db.users.insertOne({ name: "Test" })
   
   // Should succeed
   db.users.insertOne({
     email: "test@example.com",
     role: "user",
     createdAt: new Date()
   })
   ```

3. Check all indexes are created:
   ```javascript
   db.blocks.getIndexes()
   db.messages.getIndexes()
   db.conversations.getIndexes()
   ```
