# Playbook: Full Boilerplate Setup Guide (Next.js 15)

## Project Context Setup

### 1. Requirements File
Create a `requirements.md` file in your project root:
```markdown
# Project Requirements

## Overview
[Provide a brief description of what your application should do in simple terms]

## Core Features
- List the main features your application needs
- Use non-technical language
- Focus on user needs and business goals

## User Types
- Describe the different types of users
- What can each user type do?
- What are their main goals?

## Example Requirements Format:
"""
Our application needs to be a chat system where:
1. Users can ask questions about specific topics
2. The AI should respond in a helpful and friendly way
3. Users should be able to see their chat history
4. The system should remember context from previous conversations
5. Users should be able to share interesting conversations
6. The interface should be easy to use on both phones and computers

Additional features we'd like:
- Dark mode for night time use
- Ability to export conversations
- Quick responses for common questions
"""
```

### 2. Project Configuration Generator
Create `scripts/generate-config.ts`:
```typescript
import fs from 'fs/promises'
import path from 'path'
import { parse as parseMarkdown } from 'marked'

async function generateConfig() {
  // Read requirements file
  const requirements = await fs.readFile('./requirements.md', 'utf-8')
  
  // Parse markdown to extract key information
  const parsed = parseMarkdown(requirements)
  
  // Generate initial config based on requirements
  const config = {
    name: process.env.PROJECT_NAME || 'ai-chat-app',
    displayName: process.env.PROJECT_DISPLAY_NAME || 'AI Chat Assistant',
    description: extractDescription(parsed),
    theme: {
      primary: '#0070f3',
      secondary: '#00a3bf',
      accent: '#7928ca',
      background: '#ffffff',
      text: '#000000'
    },
    features: {
      authentication: hasFeature(parsed, 'auth'),
      aiChat: hasFeature(parsed, 'chat'),
      fileUploads: hasFeature(parsed, 'file'),
      notifications: hasFeature(parsed, 'notif'),
      analytics: true,
      darkMode: hasFeature(parsed, 'dark mode'),
      export: hasFeature(parsed, 'export'),
      sharing: hasFeature(parsed, 'share')
    },
    aiModels: {
      default: 'gpt-4-turbo-preview',
      alternates: ['gpt-3.5-turbo']
    },
    metadata: {
      author: process.env.PROJECT_AUTHOR || 'Team Name',
      website: process.env.PROJECT_WEBSITE || 'https://example.com',
      repository: process.env.PROJECT_REPO || 'https://github.com/username/repo',
      license: 'MIT'
    }
  }

  // Save as project-config.json
  await fs.writeFile(
    './project-config.json',
    JSON.stringify(config, null, 2)
  )

  // Generate initial prompts for AI chat
  const systemPrompts = generateSystemPrompts(parsed)
  await fs.writeFile(
    './src/lib/prompts.ts',
    `export const systemPrompts = ${JSON.stringify(systemPrompts, null, 2)}`
  )

  console.log('✅ Project configuration generated from requirements')
}

function extractDescription(parsed: any): string {
  // Extract description from Overview section
  // Implementation details...
  return ''
}

function hasFeature(parsed: any, feature: string): boolean {
  // Check if feature is mentioned in requirements
  // Implementation details...
  return false
}

function generateSystemPrompts(parsed: any) {
  return {
    default: `You are a helpful AI assistant. Your responses should be:
- Clear and concise
- Friendly and professional
- Focused on the user's needs
- Based on the context of previous messages`,
    specific: [] // Generate specific prompts based on requirements
  }
}

generateConfig().catch(console.error)
```

### 3. Requirements to Features Matrix
Create a `requirements-matrix.md` file to map user requirements to technical features:
```markdown
# Requirements to Features Matrix

## User Requirement → Technical Implementation

1. "Ask questions about specific topics"
   - AI chat integration
   - Topic classification system
   - Context management
   - Prompt engineering

2. "See chat history"
   - MongoDB for message storage
   - User authentication
   - Conversation indexing
   - Real-time updates

3. "Remember context"
   - Chat context management
   - Session handling
   - User preferences storage
   - Message threading

4. "Share conversations"
   - Share link generation
   - Access control
   - Public/private settings
   - Social media integration

5. "Easy to use on phones and computers"
   - Responsive design
   - Mobile-first approach
   - Touch interactions
   - Progressive enhancement

## Feature Flags
Based on requirements, the following features will be:

### Enabled by Default
- AI Chat
- Authentication
- Message History
- Responsive Design
- Context Management

### Optional (Configurable)
- Dark Mode
- File Attachments
- Analytics
- Export Features
- Social Sharing
```

## Overview
This playbook provides step-by-step instructions for setting up the chat framework boilerplate using Next.js 15, including all necessary dependencies, database configuration, and deployment setup.

## Prerequisites
- Node.js 18.17+ installed (required for Next.js 15)
- MongoDB Atlas account or local MongoDB installation
- AWS account (for backend workers)
- Vercel account
- Git installed
- npm or yarn package manager

## Step 1: Project Configuration

### 1.1 App Personalization
Create a `project-config.json` file to store your app's configuration:
```json
{
  "name": "your-app-name",
  "displayName": "Your App Display Name",
  "description": "A brief description of your application",
  "theme": {
    "primary": "#0070f3",
    "secondary": "#00a3bf",
    "accent": "#7928ca",
    "background": "#ffffff",
    "text": "#000000"
  },
  "features": {
    "authentication": true,
    "aiChat": true,
    "fileUploads": false,
    "notifications": true,
    "analytics": true
  },
  "aiModels": {
    "default": "gpt-4-turbo-preview",
    "alternates": ["gpt-3.5-turbo"]
  },
  "metadata": {
    "author": "Your Name",
    "website": "https://your-website.com",
    "repository": "https://github.com/username/repo",
    "license": "MIT"
  }
}
```

### 1.2 Create Next.js 15 Project
```bash
# Interactive setup with prompts
npx create-next-app@latest

# Answer the following prompts:
# ✔ What is your project named? … your-app-name
# ✔ Would you like to use TypeScript? … Yes
# ✔ Would you like to use ESLint? … Yes
# ✔ Would you like to use Tailwind CSS? … Yes
# ✔ Would you like to use `src/` directory? … Yes
# ✔ Would you like to use App Router? … Yes
# ✔ Would you like to customize the default import alias (@/*)? … Yes
```

### 1.3 Generate App Configuration
Create a script to apply your personalization. Create `scripts/configure-app.ts`:
```typescript
import fs from 'fs/promises'
import path from 'path'

async function configureApp() {
  // Read project config
  const config = JSON.parse(
    await fs.readFile('./project-config.json', 'utf-8')
  )

  // Update package.json
  const packageJson = JSON.parse(
    await fs.readFile('./package.json', 'utf-8')
  )
  packageJson.name = config.name
  packageJson.description = config.description
  packageJson.author = config.metadata.author
  await fs.writeFile(
    './package.json',
    JSON.stringify(packageJson, null, 2)
  )

  // Generate theme CSS variables
  const cssVars = `
:root {
  --primary: ${config.theme.primary};
  --secondary: ${config.theme.secondary};
  --accent: ${config.theme.accent};
  --background: ${config.theme.background};
  --text: ${config.theme.text};
}
`
  await fs.appendFile('./src/app/globals.css', cssVars)

  // Create app config file
  const appConfig = `
export const APP_CONFIG = {
  name: '${config.displayName}',
  description: '${config.description}',
  features: ${JSON.stringify(config.features)},
  aiModels: ${JSON.stringify(config.aiModels)},
} as const
`
  await fs.writeFile('./src/lib/config.ts', appConfig)

  console.log('✅ App configuration applied successfully')
}

configureApp().catch(console.error)
```

### 1.4 Environment Variables
Create a `.env.local` file with:
```env
# App Configuration
NEXT_PUBLIC_APP_NAME=${config.displayName}
NEXT_PUBLIC_APP_DESCRIPTION=${config.description}

# MongoDB
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=${config.name}_db

# Vercel AI
OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_DEFAULT_MODEL=${config.aiModels.default}

# AWS (if using backend workers)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region

# Additional configurations
NODE_ENV=development
```

## Step 2: Database Setup

### 2.1 MongoDB Configuration
1. Create a new MongoDB database (Atlas or local)
2. Set up collections and indexes:
   ```javascript
   // Create collections with validation
   db.createCollection('users')
   db.createCollection('blocks')
   db.createCollection('containers')
   db.createCollection('messages')
   db.createCollection('conversations')

   // Create indexes
   db.blocks.createIndex({ containerId: 1 })
   db.blocks.createIndex({ createdAt: -1 })
   db.messages.createIndex({ conversationId: 1, createdAt: 1 })
   db.conversations.createIndex({ participants: 1 })
   db.conversations.createIndex({ lastMessageAt: -1 })
   ```

### 2.2 Vector Search Setup
1. Enable Vector Search in MongoDB Atlas:
   ```bash
   # Ensure your cluster is running MongoDB 6.0.11+ or 7.0.2+
   # Navigate to Atlas UI -> Database -> Collections -> Create Index
   ```

2. Create Vector Search Index in `messages` collection:
   ```javascript
   {
     "mappings": {
       "dynamic": true,
       "fields": {
         "embedding": {
           "dimensions": 1536,
           "similarity": "cosine",
           "type": "knnVector"
         },
         "content": {
           "type": "string"
         },
         "metadata": {
           "type": "document"
         }
       }
     }
   }
   ```

3. Update Message Schema in `lib/types.ts`:
   ```typescript
   export interface Message {
     id: string
     createdAt?: Date
     content: string
     embedding?: number[]  // Vector embedding
     role: 'system' | 'user' | 'assistant'
     name?: string
     metadata?: {
       source?: string
       context?: string
       confidence?: number
       topics?: string[]
     }
   }
   ```

4. Create Vector Search Utilities in `lib/utils/vector-search.ts`:
   ```typescript
   import { MongoClient } from 'mongodb'
   import OpenAI from 'openai'
   import { Message } from '@/lib/types'

   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
   })

   export async function generateEmbedding(text: string) {
     const response = await openai.embeddings.create({
       model: 'text-embedding-3-small',
       input: text,
       encoding_format: 'float'
     })
     return response.data[0].embedding
   }

   export async function semanticSearch(
     query: string,
     limit: number = 5
   ) {
     const client = await MongoClient.connect(process.env.MONGODB_URI!)
     const db = client.db(process.env.MONGODB_DB_NAME)
     
     const embedding = await generateEmbedding(query)
     
     const results = await db.collection('messages').aggregate([
       {
         $vectorSearch: {
           queryVector: embedding,
           path: 'embedding',
           numCandidates: 100,
           limit: limit,
           index: 'vector_index',
         }
       },
       {
         $project: {
           content: 1,
           metadata: 1,
           score: { $meta: 'vectorSearchScore' }
         }
       }
     ]).toArray()

     await client.close()
     return results
   }

   export async function storeMessageWithEmbedding(
     message: Omit<Message, 'id' | 'embedding'>
   ) {
     const client = await MongoClient.connect(process.env.MONGODB_URI!)
     const db = client.db(process.env.MONGODB_DB_NAME)
     
     const embedding = await generateEmbedding(message.content)
     
     const result = await db.collection('messages').insertOne({
       ...message,
       embedding,
       createdAt: new Date(),
       id: nanoid()
     })

     await client.close()
     return result
   }
   ```

5. Update Chat API Route to use Vector Search:
   ```typescript
   // app/api/chat/route.ts
   import { semanticSearch, storeMessageWithEmbedding } from '@/lib/utils/vector-search'

   export async function POST(req: Request) {
     const { messages, previewToken } = await req.json()
     const chatId = nanoid()

     // Get relevant context from previous messages
     const lastMessage = messages[messages.length - 1]
     const context = await semanticSearch(lastMessage.content, 3)
     
     // Add context to system message
     const systemMessage = {
       role: 'system',
       content: `You are a helpful AI assistant. Consider this relevant context from previous conversations:
       ${context.map(c => c.content).join('\n\n')}
       
       Respond to the user's message based on this context when relevant.`
     }

     const response = await openai.chat.completions.create({
       model: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'gpt-4-turbo-preview',
       messages: [systemMessage, ...messages],
       temperature: 0.7,
       stream: true,
       user: chatId
     })

     const stream = OpenAIStream(response, {
       async onCompletion(completion) {
         // Store message with embedding
         await storeMessageWithEmbedding({
           content: completion,
           role: 'assistant',
           metadata: {
             context: context.map(c => c.content),
             confidence: context[0]?.score
           }
         })
       }
     })

     return new StreamingTextResponse(stream)
   }
   ```

6. Add Vector Search Environment Variables:
   ```env
   # Vector Search Configuration
   MONGODB_VECTOR_INDEX=vector_index
   VECTOR_SEARCH_NUM_CANDIDATES=100
   VECTOR_SEARCH_LIMIT=5
   EMBEDDING_MODEL=text-embedding-3-small
   ```

7. Update Project Configuration:
   ```json
   {
     // ... existing config ...
     "vectorSearch": {
       "enabled": true,
       "model": "text-embedding-3-small",
       "dimensions": 1536,
       "similarity": "cosine",
       "features": {
         "semanticSearch": true,
         "contextualResponses": true,
         "topicClustering": false
       }
     }
   }
   ```

This setup enables:
- Semantic search across message history
- Contextual AI responses based on similar past conversations
- Vector embeddings for all messages
- Efficient similarity search using MongoDB Atlas
- Configurable search parameters and embedding models

## Step 3: Frontend Setup

### 3.1 Next.js Configuration
1. Configure `next.config.js`:
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     reactStrictMode: true,
     // Next.js 15 features
     logging: {
       fetches: {
         fullUrl: true,
       },
     },
     // Enable partial prerendering (beta)
     experimental: {
       ppr: true,
       typedRoutes: true,
       serverActions: {
         bodySizeLimit: '2mb'
       },
     },
   }
   module.exports = nextConfig
   ```

### 3.2 App Router Structure
Create the following directory structure:
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── api/
│   └── chat/
│       └── route.ts
├── chat/
│   ├── [id]/
│   │   └── page.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   └── providers/
├── lib/
│   ├── actions/
│   ├── db/
│   └── utils/
├── layout.tsx
└── page.tsx
```

### 3.3 Tailwind Setup
1. Tailwind is pre-configured with `create-next-app`
2. Update `tailwind.config.ts`:
   ```typescript
   import type { Config } from 'tailwindcss'
   
   const config: Config = {
     content: [
       './pages/**/*.{js,ts,jsx,tsx,mdx}',
       './components/**/*.{js,ts,jsx,tsx,mdx}',
       './app/**/*.{js,ts,jsx,tsx,mdx}',
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   export default config
   ```

## Step 4: Storybook Integration

### 4.1 Install Storybook
```bash
# Initialize Storybook with Next.js configuration
npx storybook@latest init --builder webpack5

# Answer the prompts:
# ✔ Do you want to run the 'storybook init' command? … yes
# ✔ Do you want to use TypeScript with your Storybook configuration? … yes
```

### 4.2 Configure Storybook for Next.js 15
Update `.storybook/main.ts`:
```typescript
import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: [
    '../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/app/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-styling',
    '@storybook/addon-themes'
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {}
  },
  docs: {
    autodocs: true
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    // Add support for absolute imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
    }
    return config
  }
}

export default config
```

### 4.3 Setup Storybook Preview
Create `.storybook/preview.tsx`:
```typescript
import type { Preview } from '@storybook/react'
import { themes } from '@storybook/theming'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    darkMode: {
      dark: { ...themes.dark },
      light: { ...themes.normal },
      current: 'light',
    },
    nextjs: {
      appDirectory: true,
    }
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
}

export default preview
```

### 4.4 Add Component Stories
Create example story for chat component in `src/components/chat/chat-input.stories.tsx`:
```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { ChatInput } from './chat-input'

const meta: Meta<typeof ChatInput> = {
  title: 'Chat/ChatInput',
  component: ChatInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ChatInput>

export const Default: Story = {
  args: {
    placeholder: 'Type your message...',
    onSubmit: (value) => console.log('Submitted:', value),
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Chat is disabled',
    disabled: true,
  },
}
```

### 4.5 Add Component Documentation
Create documentation for chat component in `src/components/chat/chat-input.mdx`:
```markdown
import { Meta, Story, Canvas } from '@storybook/blocks'
import * as ChatInputStories from './chat-input.stories'

<Meta of={ChatInputStories} />

# Chat Input Component

The ChatInput component provides a textarea for users to type messages and send them in the chat interface.

## Features

- Auto-expanding textarea
- Submit on Enter (Shift+Enter for new line)
- Loading state handling
- Character count (optional)

## Usage

```tsx
import { ChatInput } from '@/components/chat/chat-input'

export default function Chat() {
  return (
    <ChatInput
      placeholder="Type a message"
      onSubmit={(value) => {
        // Handle message submission
      }}
    />
  )
}
```

<Canvas>
  <Story of={ChatInputStories.Default} />
</Canvas>

## Props

- `placeholder` (string): Placeholder text for the input
- `onSubmit` (function): Callback function when message is submitted
- `disabled` (boolean): Whether the input is disabled
- `loading` (boolean): Whether the input is in loading state
- `maxLength` (number): Maximum character length
```

### 4.6 Add Storybook Scripts
Update `package.json`:
```json
{
  "scripts": {
    // ... existing scripts ...
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook"
  }
}
```

### 4.7 Configure Testing in Storybook
1. Install testing addons:
```bash
npm install --save-dev @storybook/test-runner @storybook/testing-library @storybook/jest
```

2. Create `.storybook/test-runner.js`:
```javascript
const { injectAxe, checkA11y } = require('axe-playwright')

module.exports = {
  async preRender(page) {
    await injectAxe(page)
  },
  async postRender(page) {
    await checkA11y(page, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    })
  },
}
```

### 4.8 Add to Project Configuration
Add Storybook settings to `project-config.json`:
```json
{
  // ... existing config ...
  "storybook": {
    "viewports": {
      "mobile": {
        "name": "Mobile",
        "styles": { "width": "360px", "height": "640px" }
      },
      "tablet": {
        "name": "Tablet",
        "styles": { "width": "768px", "height": "1024px" }
      },
      "desktop": {
        "name": "Desktop",
        "styles": { "width": "1280px", "height": "800px" }
      }
    },
    "themes": {
      "brand": {
        "brandTitle": "${config.displayName}",
        "brandUrl": "${config.metadata.website}",
        "brandTarget": "_self"
      }
    }
  }
}
```

## Step 5: Chat Integration

### 5.1 Install Chat Dependencies
```bash
npm install ai@latest @vercel/ai@latest openai@latest
npm install @radix-ui/react-dialog @radix-ui/react-slot
npm install lucide-react
npm install nanoid
npm install react-markdown
npm install react-syntax-highlighter
npm install react-textarea-autosize
```

### 5.2 Chat Components Setup
Create the following component structure in `components/chat`:

```
components/chat/
├── chat-list.tsx
├── chat-message.tsx
├── chat-panel.tsx
├── chat-scroll-anchor.tsx
├── chat-input.tsx
├── empty-screen.tsx
├── footer.tsx
├── prompt-form.tsx
└── provider.tsx
```

### 5.3 Chat Models and Types
Create `lib/types.ts`:
```typescript
export interface Message {
  id: string
  createdAt?: Date
  content: string
  role: 'system' | 'user' | 'assistant'
  name?: string
}

export interface Chat {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: Message[]
  sharePath?: string
}
```

### 5.4 Chat Store Configuration
Create `lib/hooks/use-chat-store.ts`:
```typescript
import { create } from 'zustand'
import { Message } from '@/lib/types'

interface ChatStore {
  messages: Message[]
  addMessage: (message: Message) => void
  removeMessage: (id: string) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter(m => m.id !== id)
    })),
  clearMessages: () => set({ messages: [] })
}))
```

### 5.5 Chat API Route
Update `app/api/chat/route.ts`:
```typescript
import { OpenAIStream, StreamingTextResponse } from 'ai'
import OpenAI from 'openai'
import { nanoid } from 'nanoid'
import { Message } from '@/lib/types'

export const runtime = 'edge'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(req: Request) {
  const { messages, previewToken } = await req.json()
  const chatId = nanoid()

  const response = await openai.chat.completions.create({
    model: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'gpt-4-turbo-preview',
    messages,
    temperature: 0.7,
    stream: true,
    user: chatId
  })

  const stream = OpenAIStream(response, {
    async onCompletion(completion) {
      // Store chat in DB here
      const title = messages[0].content.substring(0, 100)
      const createdAt = new Date()
      const path = `/chat/${chatId}`
      const chat = {
        id: chatId,
        title,
        createdAt,
        path,
        messages: [
          ...messages,
          {
            content: completion,
            role: 'assistant'
          }
        ]
      }
      // Save chat to your database here
    }
  })

  return new StreamingTextResponse(stream)
}
```

### 5.6 Chat Page Setup
Create `app/chat/page.tsx`:
```typescript
import { nanoid } from 'nanoid'
import { Chat } from '@/components/chat/chat-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatProvider } from '@/components/chat/provider'
import { EmptyScreen } from '@/components/chat/empty-screen'

export default function ChatPage() {
  const id = nanoid()

  return (
    <ChatProvider>
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-1 flex-col">
          <div className="relative flex-1">
            <EmptyScreen />
            <Chat />
          </div>
          <ChatInput />
        </div>
      </div>
    </ChatProvider>
  )
}
```

### 5.7 Update Project Configuration
Add chat-specific settings to `project-config.json`:
```json
{
  // ... existing config ...
  "chat": {
    "defaultModel": "gpt-4-turbo-preview",
    "temperature": 0.7,
    "maxTokens": 4096,
    "features": {
      "streaming": true,
      "codeHighlighting": true,
      "markdownSupport": true,
      "fileAttachments": false
    },
    "ui": {
      "darkMode": true,
      "messageActions": true,
      "shareButton": true
    }
  }
}
```

### 5.8 Add Chat-Specific Environment Variables
Add to `.env.local`:
```env
# Chat Configuration
NEXT_PUBLIC_CHAT_MAX_TOKENS=4096
NEXT_PUBLIC_CHAT_TEMPERATURE=0.7
NEXT_PUBLIC_CHAT_STREAMING=true
NEXT_PUBLIC_CHAT_MESSAGE_HISTORY=100
```

## Step 6: Development Environment

### 6.1 TypeScript Configuration
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 6.2 Testing Setup
1. Install testing dependencies:
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom
   ```
2. Configure Jest in `jest.config.js`
3. Set up test scripts in `package.json`

## Step 7: Deployment Setup

### 7.1 Vercel Deployment
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Link project to Vercel:
   ```bash
   vercel link
   ```
3. Configure deployment settings in `vercel.json`

### 7.2 CI/CD Setup
1. Set up GitHub Actions workflow in `.github/workflows/`
2. Configure environment secrets in repository settings
3. Set up preview deployments

## Step 8: Monitoring Setup

### 8.1 Logging Configuration
1. Set up structured logging
2. Configure error tracking
3. Implement performance monitoring

### 8.2 Metrics Setup
1. Configure response time tracking
2. Set up error rate monitoring
3. Implement user engagement tracking

## Verification Steps

### 1. Database Verification
```bash
# Test database connection
npm run test:db

# Verify indexes
npm run verify:indexes
```

### 2. API Verification
```bash
# Test API endpoints
npm run test:api

# Verify AI integration
npm run test:ai
```

### 3. Frontend Verification
```bash
# Run E2E tests
npm run test:e2e

# Check build
npm run build
```

## Troubleshooting Guide

### Common Issues
1. MongoDB Connection Issues
   - Check connection string
   - Verify network access
   - Confirm IP whitelist

2. AI Integration Issues
   - Verify API keys
   - Check rate limits
   - Confirm model availability

3. Build Issues
   - Clear `.next` directory
   - Update dependencies
   - Check TypeScript errors

## Next Steps
1. Customize theme and branding
2. Add custom tools and integrations
3. Set up monitoring alerts
4. Configure backup strategy

## Maintenance Tasks
1. Regular dependency updates
2. Security audits
3. Performance monitoring
4. Database optimization

---

For additional support or questions, refer to the documentation or open an issue in the repository.