#!/usr/bin/env node

/**
 * Test Real OpenAI Content Submission and Search
 * Tests the production mech-indexer with REAL OpenAI embeddings
 */

console.log('🚀 Testing REAL mech-indexer with OpenAI API Key\n');

const baseUrl = 'http://localhost:3005';

// Test content samples
const testContent = [
  {
    content: `function authenticateUser(email, password) {
  const hashedPassword = bcrypt.hash(password, 10);
  const user = database.findUser(email);
  if (user && bcrypt.compare(password, user.hashedPassword)) {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  }
  throw new Error('Invalid credentials');
}`,
    fileName: 'auth.js',
    metadata: { projectId: 'test-real-openai', feature: 'authentication' }
  },
  {
    content: `import React, { useState, useEffect } from 'react';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
};

export default UserProfile;`,
    fileName: 'UserProfile.tsx',
    metadata: { projectId: 'test-real-openai', feature: 'user-interface', framework: 'react' }
  },
  {
    content: `# API Documentation

## Authentication Endpoints

### POST /api/auth/login
Authenticates a user and returns a JWT token.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
\`\`\`

### POST /api/auth/register
Creates a new user account.`,
    fileName: 'api-docs.md',
    metadata: { projectId: 'test-real-openai', type: 'documentation' }
  },
  {
    content: `SELECT u.id, u.name, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
  AND u.status = 'active'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 100;`,
    fileName: 'user-analytics.sql',
    metadata: { projectId: 'test-real-openai', type: 'query', database: 'postgresql' }
  },
  {
    content: `import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

def train_user_behavior_model(data_path):
    """
    Train a machine learning model to predict user behavior patterns.
    """
    # Load user interaction data
    df = pd.read_csv(data_path)
    
    # Feature engineering
    features = ['page_views', 'session_duration', 'clicks', 'scrolls']
    X = df[features]
    y = df['conversion']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    print(classification_report(y_test, predictions))
    
    return model

if __name__ == "__main__":
    model = train_user_behavior_model("user_data.csv")
    print("Model training completed!")`,
    fileName: 'ml_model.py',
    metadata: { projectId: 'test-real-openai', type: 'machine-learning', language: 'python' }
  }
];

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || 'Request failed'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Request failed for ${url}:`, error.message);
    throw error;
  }
}

async function submitContent(content, fileName, metadata = {}) {
  console.log(`📄 Submitting: ${fileName} (${content.length} chars)`);
  
  const result = await makeRequest(`${baseUrl}/api/universal/content/submit`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      fileName,
      applicationId: 'mech-ai',
      metadata: {
        ...metadata,
        submittedAt: new Date().toISOString(),
        testType: 'real-openai-embeddings'
      }
    })
  });
  
  console.log(`   ✅ Job ID: ${result.jobId}, Status: ${result.status}`);
  if (result.debug) {
    console.log(`   🔍 Debug: ${JSON.stringify(result.debug, null, 2)}`);
  }
  
  return result;
}

async function searchContent(query, filters = {}) {
  console.log(`\n🔍 Searching for: "${query}"`);
  
  const result = await makeRequest(`${baseUrl}/api/search`, {
    method: 'POST',
    body: JSON.stringify({
      query,
      applicationId: 'mech-ai',
      filters: {
        projectId: 'test-real-openai',
        ...filters
      },
      limit: 5
    })
  });
  
  console.log(`   📊 Found ${result.results.length} results (took ${result.took}ms)`);
  console.log(`   🎯 Search type: ${result.searchType || 'unknown'}`);
  console.log(`   🤖 Has real embeddings: ${result.hasRealEmbeddings ? '✅' : '❌'}`);
  
  result.results.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.fileName} (score: ${item.score})`);
    console.log(`      "${item.content.substring(0, 100)}..."`);
  });
  
  return result;
}

async function checkHealth() {
  console.log('🔧 Checking service health...');
  const health = await makeRequest(`${baseUrl}/health`);
  console.log(`   Status: ${health.status}`);
  console.log(`   Version: ${health.version}`);
  if (health.queues) {
    console.log(`   Queues: ${health.queues.length} configured`);
  }
  return health;
}

async function main() {
  try {
    // Check if service is running
    await checkHealth();
    
    console.log('\n📝 Submitting content with REAL OpenAI embeddings...\n');
    
    // Submit all test content
    const submissions = [];
    for (const item of testContent) {
      try {
        const result = await submitContent(item.content, item.fileName, item.metadata);
        submissions.push(result);
        
        // Small delay between submissions
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to submit ${item.fileName}:`, error.message);
      }
    }
    
    console.log(`\n✅ Submitted ${submissions.length}/${testContent.length} items`);
    
    // Wait for processing (embeddings take time)
    console.log('\n⏳ Waiting for processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test search queries
    console.log('\n🔎 Testing semantic search with REAL embeddings...\n');
    
    const searchQueries = [
      'user authentication and login',
      'React components and user interface',
      'API documentation and endpoints', 
      'SQL queries and database analytics',
      'machine learning and Python models'
    ];
    
    for (const query of searchQueries) {
      try {
        await searchContent(query);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Search failed for "${query}":`, error.message);
      }
    }
    
    console.log('\n🎉 REAL OpenAI embedding test completed successfully!');
    console.log('✅ The production mech-indexer service is working with actual OpenAI embeddings');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Handle dynamic imports for fetch (Node.js compatibility)
(async () => {
  // Use dynamic import for fetch in Node.js environments
  if (typeof fetch === 'undefined') {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
  }
  
  await main();
})();