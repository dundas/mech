const { MongoClient } = require('mongodb');

async function checkDatabaseSave() {
  const uri = 'mongodb+srv://mechMIN:9rZmLfC1h557yngR@main.h81m1fq.mongodb.net/';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('mechDB');
    const databases = await db.collection('project_databases')
      .find({ projectId: '68240cf76329b0379bcbb069' })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`\nFound ${databases.length} database connections for this project:\n`);
    
    databases.forEach((db, index) => {
      console.log(`${index + 1}. ${db.name}`);
      console.log(`   ID: ${db._id}`);
      console.log(`   Type: ${db.type}`);
      console.log(`   Database: ${db.database}`);
      console.log(`   Created: ${db.createdAt}`);
      console.log(`   Test Status: ${db.testStatus}`);
      console.log(`   Tags: ${db.tags?.join(', ') || 'none'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkDatabaseSave();