# MongoDB Schema Structure

This document outlines the base MongoDB collections and schema structures for the chat framework boilerplate. These schemas are designed to be flexible and can be customized based on your project's specific needs.

## Note on Naming Conventions
The schema uses generic terms like "Block" and "Container" which can be renamed to match your project's domain language. For example:
- A Block could become: Post, Card, Note, Document, Item, etc.
- A Container could become: Board, Notebook, Folder, Collection, Space, etc.

## Core Collections

### 1. Users Collection
```typescript
interface User {
  _id: ObjectId;
  email: string;
  name: string;
  role: "user" | "admin" | "agent";
  createdAt: Date;
  updatedAt: Date;
  settings: {
    theme: string;
    notifications: boolean;
    preferences: Record<string, any>;
  };
  metadata: Record<string, any>;
}
```

### 2. Blocks Collection
```typescript
// This is a base interface that can be extended for specific use cases
interface Block {
  _id: ObjectId;
  type: string;                 // e.g., "post", "task", "note", "article"
  content: string | {           // Can be string or structured content
    [key: string]: any;         // Flexible content structure
  };
  metadata: {                   // Customizable metadata
    title?: string;
    tags?: string[];
    [key: string]: any;         // Additional metadata fields
  };
  containerId?: ObjectId;       // Optional parent container
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "archived" | "deleted";
}

// Example extensions:
interface Post extends Block {
  type: "post";
  content: string;
  metadata: {
    title: string;
    author: string;
    tags: string[];
  };
}

interface Task extends Block {
  type: "task";
  content: {
    description: string;
    checklist?: { item: string; done: boolean }[];
  };
  metadata: {
    priority: "low" | "medium" | "high";
    dueDate?: Date;
    assignee?: ObjectId;
  };
}
```

### 3. Containers Collection
```typescript
// Base container interface that can be extended
interface Container {
  _id: ObjectId;
  type: string;                // e.g., "board", "category", "project"
  name: string;
  description?: string;
  metadata: {                  // Customizable metadata
    icon?: string;
    color?: string;
    [key: string]: any;        // Additional metadata fields
  };
  parentId?: ObjectId;         // Optional parent container
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "archived" | "deleted";
}

// Example extensions:
interface Project extends Container {
  type: "project";
  metadata: {
    startDate: Date;
    endDate?: Date;
    status: "planning" | "active" | "completed";
    team: ObjectId[];
  };
}

interface Category extends Container {
  type: "category";
  metadata: {
    icon: string;
    color: string;
    displayOrder: number;
  };
}
```

### 4. Messages Collection
```typescript
interface Message {
  _id: ObjectId;
  conversationId: ObjectId;     // Reference to Conversations collection
  content: string;              // The message content
  role: "user" | "assistant" | "system";
  metadata: {
    model?: string;             // LLM model used
    tokens?: number;            // Token count
    tools?: string[];          // Tools used in response
  };
  createdAt: Date;
  context?: {
    blockIds: ObjectId[];       // References to relevant Blocks
    toolCalls?: Record<string, any>[];
  };
}
```

### 5. Conversations Collection
```typescript
interface Conversation {
  _id: ObjectId;
  title: string;
  participants: ObjectId[];     // References to Users collection
  settings: {
    model: string;              // Default LLM model
    temperature?: number;
    systemPrompt?: string;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  status: "active" | "archived" | "deleted";
}
```

## Advanced Features

The following collections can be added as your application grows:

### Learning System
```typescript
interface Learning {
  _id: ObjectId;
  type: string;
  content: string;
  metadata: Record<string, any>;
  relatedBlocks: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "archived" | "deleted";
}
```

### Event Logging
```typescript
interface Event {
  _id: ObjectId;
  type: string;
  source: string;
  data: Record<string, any>;
  timestamp: Date;
  relatedIds?: Record<string, ObjectId>;
}
```

### Tool Registry
```typescript
interface Tool {
  _id: ObjectId;
  name: string;
  description: string;
  version: string;
  config: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "deprecated" | "disabled";
}
```

## Indexes

### Required Indexes
```javascript
// Basic indexes for core functionality
db.blocks.createIndex({ containerId: 1 });
db.blocks.createIndex({ createdAt: -1 });

db.messages.createIndex({ conversationId: 1, createdAt: 1 });

db.conversations.createIndex({ participants: 1 });
db.conversations.createIndex({ lastMessageAt: -1 });

// Optional indexes based on your needs
/*
// For vector search
db.blocks.createIndex({ "metadata.embeddings": "2dsphere" });

// For event logging
db.events.createIndex({ timestamp: -1 });
db.events.createIndex({ type: 1, timestamp: -1 });
*/
```

## Customization Examples

### 1. Knowledge Base System
```typescript
// Rename collections for a knowledge base
db.createCollection('articles')     // Instead of blocks
db.createCollection('categories')   // Instead of containers

// Example article
{
  _id: ObjectId,
  type: "article",
  content: "Article content here...",
  metadata: {
    author: "John Doe",
    tags: ["guide", "tutorial"]
  },
  containerId: categoryId,  // Reference to category
  status: "active"
}
```

### 2. Task Management System
```typescript
// Rename collections for task management
db.createCollection('tasks')        // Instead of blocks
db.createCollection('projects')     // Instead of containers

// Example task
{
  _id: ObjectId,
  type: "task",
  content: "Implement login system",
  metadata: {
    priority: "high",
    dueDate: "2024-01-15",
    assignee: userId
  },
  containerId: projectId,  // Reference to project
  status: "active"
}
```

### 3. Note-Taking App
```typescript
// Rename collections for notes
db.createCollection('notes')        // Instead of blocks
db.createCollection('notebooks')    // Instead of containers

// Example note
{
  _id: ObjectId,
  type: "note",
  content: "Meeting notes content...",
  metadata: {
    tags: ["meeting", "client"],
    attachments: ["file1.pdf"]
  },
  containerId: notebookId,  // Reference to notebook
  status: "active"
}
```

## Quick Start Guide

1. **Setup Core Collections**
```javascript
// Initialize basic collections
use your-database-name

// Core user system
db.createCollection('users')

// Customizable content structure (rename as needed)
db.createCollection('blocks')        // or 'posts', 'tasks', 'notes', etc.
db.createCollection('containers')    // or 'categories', 'projects', 'notebooks', etc.

// Chat functionality
db.createCollection('messages')
db.createCollection('conversations')

// Create basic indexes
db.blocks.createIndex({ containerId: 1 })
db.messages.createIndex({ conversationId: 1, createdAt: 1 })
db.conversations.createIndex({ participants: 1 })
```

2. **Customize for Your Use Case**
- Choose appropriate names for blocks and containers
- Add relevant fields to metadata
- Create additional indexes based on query patterns

3. **Scale Gradually**
- Start with core collections
- Add advanced features when needed
- Extend schemas based on requirements
