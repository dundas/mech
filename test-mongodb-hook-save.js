#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './mech-unified-backend/.env' });

async function testMongoDBHookSave() {
  console.log('Testing MongoDB hook save operation...\n');
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }
  
  const client = new MongoClient(uri);
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = process.env.MONGODB_DATABASE || 'mechDB';
    const db = client.db(dbName);
    const hookEvents = db.collection('hook_events');
    
    // Query for recent hook events
    console.log('\n📊 Checking recent hook events...');
    const recentEvents = await hookEvents
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    if (recentEvents.length === 0) {
      console.log('❌ No hook events found in the database');
    } else {
      console.log(`✅ Found ${recentEvents.length} recent hook events:\n`);
      
      recentEvents.forEach((event, index) => {
        console.log(`Event ${index + 1}:`);
        console.log(`  Session ID: ${event.sessionId}`);
        console.log(`  Event Type: ${event.eventType}`);
        console.log(`  Tool Name: ${event.toolName || 'N/A'}`);
        console.log(`  Created At: ${event.createdAt}`);
        console.log(`  Project ID: ${event.projectId || 'N/A'}`);
        console.log('---');
      });
    }
    
    // Look specifically for our test file creation
    console.log('\n🔍 Looking for test file creation event...');
    const testFileEvent = await hookEvents.findOne({
      toolName: 'Write',
      'toolInput.file_path': /test-claude-hook\.txt$/
    });
    
    if (testFileEvent) {
      console.log('✅ Found test file creation event!');
      console.log('Event details:');
      console.log(JSON.stringify(testFileEvent, null, 2));
    } else {
      console.log('⚠️  Test file creation event not found');
      console.log('This could mean the hook wasn\'t processed or saved properly');
    }
    
    // Get collection stats
    console.log('\n📈 Collection statistics:');
    const stats = await hookEvents.stats();
    console.log(`  Total documents: ${stats.count}`);
    console.log(`  Collection size: ${(stats.size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔒 Disconnected from MongoDB');
  }
}

// Run the test
testMongoDBHookSave();