#!/usr/bin/env node

/**
 * MongoDB Optional Dependencies Stub Creator
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Creating MongoDB dependency stubs...');

// Define the stub modules we need to create
const stubs = [
  {
    path: 'node_modules/mongodb/lib/client-side-encryption/providers/azure.js',
    content: 'module.exports = {};'
  },
  {
    path: 'node_modules/@aws-sdk/credential-providers/package.json',
    content: '{"name": "@aws-sdk/credential-providers", "version": "0.0.0", "main": "index.js"}'
  },
  {
    path: 'node_modules/@aws-sdk/credential-providers/index.js',
    content: 'module.exports = {};'
  },
  {
    path: 'node_modules/gcp-metadata/package.json',
    content: '{"name": "gcp-metadata", "version": "0.0.0", "main": "index.js"}'
  },
  {
    path: 'node_modules/gcp-metadata/index.js',
    content: 'module.exports = {};'
  }
];

let created = 0;

stubs.forEach(stub => {
  const fullPath = path.resolve(stub.path);
  const dir = path.dirname(fullPath);
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, stub.content);
      console.log(`✅ Created: ${stub.path}`);
      created++;
    } else {
      console.log(`⏭️  Skipped: ${stub.path} (already exists)`);
    }
  } catch (error) {
    console.error(`❌ Failed to create ${stub.path}:`, error.message);
  }
});

console.log(`\n📋 Created ${created} stubs`);
console.log(`🎯 MongoDB dependency stubs ready!`);
