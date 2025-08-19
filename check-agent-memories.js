const { MongoClient } = require('mongodb');

async function checkAgentMemories() {
  const client = new MongoClient('mongodb+srv://mech-ai:RJhfPjXDWEqVAzLq@cluster0.tpzbo.mongodb.net/mechDB?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    const db = client.db('mechDB');
    const collection = db.collection('agent_memories');
    
    // Get sample documents
    const samples = await collection.find().limit(5).toArray();
    
    console.log('Sample agent_memories documents:');
    console.log(JSON.stringify(samples, null, 2));
    
    // Get one document to see full structure
    if (samples.length > 0) {
      console.log('\n\nDetailed structure of first document:');
      console.log(JSON.stringify(samples[0], null, 2));
    }
    
    // Get collection stats
    const stats = await collection.stats();
    console.log('\n\nCollection stats:', { count: stats.count });
    
    // Get indexes
    const indexes = await collection.indexes();
    console.log('\n\nIndexes:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAgentMemories();