const { MongoClient } = require('mongodb');

async function testDuplicateFix() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('mech');
    const messagesCollection = db.collection('messages');
    
    console.log('🔍 Testing for duplicate messages...\n');
    
    // Get recent messages and check for duplicates
    const recentMessages = await messagesCollection
      .find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();
    
    console.log(`📊 Found ${recentMessages.length} recent messages\n`);
    
    // Group messages by content and timestamp to find duplicates
    const messageGroups = {};
    
    recentMessages.forEach(msg => {
      const key = `${msg.content}_${msg.role}_${msg.threadId}`;
      if (!messageGroups[key]) {
        messageGroups[key] = [];
      }
      messageGroups[key].push(msg);
    });
    
    // Find duplicates
    const duplicates = Object.entries(messageGroups)
      .filter(([key, messages]) => messages.length > 1);
    
    if (duplicates.length > 0) {
      console.log('❌ DUPLICATES FOUND:');
      duplicates.forEach(([key, messages]) => {
        console.log(`\n🔄 Duplicate group (${messages.length} copies):`);
        console.log(`   Content: "${messages[0].content.substring(0, 50)}..."`);
        console.log(`   Role: ${messages[0].role}`);
        console.log(`   Thread: ${messages[0].threadId}`);
        messages.forEach((msg, index) => {
          console.log(`   ${index + 1}. ID: ${msg._id} | Time: ${msg.timestamp}`);
        });
      });
    } else {
      console.log('✅ NO DUPLICATES FOUND - Fix appears to be working!');
    }
    
    // Show recent message pattern
    console.log('\n📝 Recent message pattern:');
    recentMessages.slice(0, 10).forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.role}] ${msg.content.substring(0, 40)}... (${msg.timestamp})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing duplicates:', error);
  } finally {
    await client.close();
  }
}

testDuplicateFix(); 