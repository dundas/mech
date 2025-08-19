#!/usr/bin/env node

// Test social media processing locally
const path = require('path');

// Set up environment variables from mech-reader/.env
process.env.SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY || '68877f7e886917b82df854b7';
process.env.ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY || 'ZK766bX7Hv4XuI1o';

// Load the processor
const { SocialMediaProcessor } = require('./mech-reader/dist/processors/social-media-processor');

// Test URLs
const testUrls = [
  {
    name: 'Twitter Profile',
    url: 'https://twitter.com/elonmusk',
    options: { format: 'markdown' }
  },
  {
    name: 'Twitter/X Profile (x.com)',
    url: 'https://x.com/OpenAI',
    options: { format: 'markdown' }
  },
  {
    name: 'Threads Profile', 
    url: 'https://threads.net/@zuck',
    options: { format: 'markdown' }
  },
  {
    name: 'YouTube Video with Transcript',
    url: 'https://youtu.be/jAJk-23r98w',
    options: { format: 'markdown', includeTranscript: true }
  }
];

async function testSocialMedia() {
  console.log('🧪 Testing Social Media Processor Locally');
  console.log('=========================================');
  console.log(`ScrapingDog API Key: ${process.env.SCRAPINGDOG_API_KEY ? '✓ Set' : '❌ Not set'}`);
  console.log(`EnsembleData API Key: ${process.env.ENSEMBLE_API_KEY ? '✓ Set' : '❌ Not set'}`);
  console.log();

  try {
    const processor = new SocialMediaProcessor();
    console.log('✅ Processor initialized successfully');
    
    for (const test of testUrls) {
      console.log(`\n📱 Testing: ${test.name}`);
      console.log(`URL: ${test.url}`);
      console.log(`Options:`, test.options);
      
      try {
        const result = await processor.processSocialMedia(test.url, test.options);
        
        console.log(`✅ Success!`);
        console.log(`Platform: ${result.platform}`);
        console.log(`Format: ${result.format}`);
        console.log(`Credits used: ${result.metadata.credits}`);
        console.log(`Type: ${result.metadata.type}`);
        console.log(`Source: ${result.metadata.source || 'default'}`);
        
        if (result.content) {
          console.log('\nContent preview:');
          console.log(result.content.substring(0, 300) + '...');
        }
        
        if (result.profileData) {
          console.log('\nProfile data keys:', Object.keys(result.profileData));
        }
        
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.response) {
          console.error('Response:', error.response.data);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize processor:', error.message);
  }
}

// Check if TypeScript build exists
const fs = require('fs');
const distPath = path.join(__dirname, 'mech-reader/dist');

if (!fs.existsSync(distPath)) {
  console.error('❌ Build not found. Please build the project first:');
  console.log('cd mech-reader && npm run build');
  process.exit(1);
}

// Run the tests
testSocialMedia();