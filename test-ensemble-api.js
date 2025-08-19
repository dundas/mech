#!/usr/bin/env node

const axios = require('axios');

// Test configuration
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY || 'your-api-key-here';
const BASE_URL = 'https://ensembledata.com/apis';

// Test URLs
const TWITTER_PROFILE_URL = 'https://twitter.com/elonmusk';
const TWITTER_TWEET_URL = 'https://twitter.com/elonmusk/status/1234567890';
const THREADS_PROFILE_URL = 'https://threads.net/@zuck';
const THREADS_POST_URL = 'https://threads.net/@zuck/post/C0zTKRPJQEb';

async function testTwitterProfile() {
  console.log('\n🐦 Testing Twitter Profile API...');
  console.log(`URL: ${TWITTER_PROFILE_URL}`);
  
  try {
    // Extract username from URL
    const username = TWITTER_PROFILE_URL.match(/twitter\.com\/([a-zA-Z0-9_]+)/)?.[1];
    console.log(`Extracted username: ${username}`);
    
    const endpoint = `${BASE_URL}/twitter/user/tweets`;
    console.log(`Endpoint: ${endpoint}`);
    
    const response = await axios.get(endpoint, {
      params: {
        username: username,
        token: ENSEMBLE_API_KEY
      },
      timeout: 30000
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testTwitterTweet() {
  console.log('\n🐦 Testing Twitter Tweet API...');
  console.log(`URL: ${TWITTER_TWEET_URL}`);
  
  try {
    // Extract tweet ID from URL
    const tweetId = TWITTER_TWEET_URL.match(/status\/(\d+)/)?.[1];
    console.log(`Extracted tweet ID: ${tweetId}`);
    
    const endpoint = `${BASE_URL}/twitter/post/info`;
    console.log(`Endpoint: ${endpoint}`);
    
    const response = await axios.get(endpoint, {
      params: {
        id: tweetId,
        token: ENSEMBLE_API_KEY
      },
      timeout: 30000
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testThreadsProfile() {
  console.log('\n🧵 Testing Threads Profile API...');
  console.log(`URL: ${THREADS_PROFILE_URL}`);
  
  try {
    // Extract username from URL
    const username = THREADS_PROFILE_URL.match(/threads\.net\/@([a-zA-Z0-9_.]+)/)?.[1];
    console.log(`Extracted username: ${username}`);
    
    const endpoint = `${BASE_URL}/threads/user/info`;
    console.log(`Endpoint: ${endpoint}`);
    
    const response = await axios.get(endpoint, {
      params: {
        username: username,
        token: ENSEMBLE_API_KEY
      },
      timeout: 30000
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testThreadsPost() {
  console.log('\n🧵 Testing Threads Post API...');
  console.log(`URL: ${THREADS_POST_URL}`);
  
  try {
    // Extract post ID from URL
    const postId = THREADS_POST_URL.match(/(?:post|p)\/([a-zA-Z0-9_-]+)/)?.[1];
    console.log(`Extracted post ID: ${postId}`);
    
    const endpoint = `${BASE_URL}/threads/post/replies`;
    console.log(`Endpoint: ${endpoint}`);
    
    const response = await axios.get(endpoint, {
      params: {
        id: postId,
        token: ENSEMBLE_API_KEY
      },
      timeout: 30000
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 EnsembleData API Test Suite');
  console.log('================================');
  console.log(`API Key: ${ENSEMBLE_API_KEY ? ENSEMBLE_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`);
  
  if (!ENSEMBLE_API_KEY || ENSEMBLE_API_KEY === 'your-api-key-here') {
    console.error('\n❌ Please set ENSEMBLE_API_KEY environment variable');
    console.log('Example: ENSEMBLE_API_KEY=your-actual-key node test-ensemble-api.js');
    return;
  }
  
  // Run all tests
  await testTwitterProfile();
  await testTwitterTweet();
  await testThreadsProfile();
  await testThreadsPost();
  
  console.log('\n✅ All tests completed');
}

// Run the tests
runTests();