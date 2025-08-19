const axios = require('axios');

const BASE_URL = 'http://localhost:3008';

async function testAllEndpoints() {
  console.log('🧪 Testing Fixed LLM Service Endpoints\n');
  console.log('=' . repeat(50) + '\n');

  // Test 1: Chat endpoint
  console.log('1️⃣ Testing /api/chat endpoint:');
  try {
    const chatResponse = await axios.post(`${BASE_URL}/api/chat`, {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: 'What is 2+2? Reply with just the number.'
      }]
    }, { timeout: 30000 });

    console.log('✅ Chat endpoint works!');
    console.log(`Response: ${chatResponse.data.content.text}`);
    console.log(`Model: ${chatResponse.data.model}`);
    console.log(`Usage: ${chatResponse.data.usage.totalTokens} tokens\n`);
  } catch (error) {
    console.log('❌ Chat endpoint failed:', error.response?.data || error.message);
  }

  // Test 2: Analyze endpoint with correct format
  console.log('2️⃣ Testing /api/analyze endpoint:');
  try {
    // Base64 encode some simple JavaScript code
    const code = 'console.log("Hello World");';
    const base64Code = Buffer.from(code).toString('base64');
    
    const analyzeResponse = await axios.post(`${BASE_URL}/api/analyze`, {
      model: 'gpt-3.5-turbo',
      prompt: 'Explain this JavaScript code',
      attachments: [{
        type: 'file',
        base64: base64Code,
        mimeType: 'text/javascript'
      }]
    }, { timeout: 30000 });

    console.log('✅ Analyze endpoint works!');
    console.log(`Response: ${analyzeResponse.data.content.text.substring(0, 100)}...`);
  } catch (error) {
    console.log('❌ Analyze endpoint failed:', error.response?.data || error.message);
  }

  // Test 3: Complete endpoint
  console.log('\n3️⃣ Testing /api/complete endpoint:');
  try {
    const completeResponse = await axios.post(`${BASE_URL}/api/complete`, {
      model: 'gpt-3.5-turbo',
      prompt: 'The capital of France is'
    }, { timeout: 30000 });

    console.log('✅ Complete endpoint works!');
    console.log(`Response: ${completeResponse.data.choices?.[0]?.text || ""}`);
  } catch (error) {
    console.log('❌ Complete endpoint failed:', error.response?.data || error.message);
  }

  // Test 4: Think endpoint (with a model that supports it)
  console.log('\n4️⃣ Testing /api/think endpoint:');
  try {
    const thinkResponse = await axios.post(`${BASE_URL}/api/think`, {
      model: 'o3',  // Thinking model
      prompt: 'What is the square root of 144?'
    }, { timeout: 30000 });

    console.log('✅ Think endpoint works!');
    console.log(`Response: ${thinkResponse.data.content.text}`);
  } catch (error) {
    console.log('❌ Think endpoint failed:', error.response?.data?.error || error.message);
  }

  // Test 5: Models endpoint
  console.log('\n5️⃣ Testing /api/models endpoint:');
  try {
    const modelsResponse = await axios.get(`${BASE_URL}/api/models`);
    console.log('✅ Models endpoint works!');
    console.log(`Total models: ${modelsResponse.data.count}`);
    console.log(`First model: ${modelsResponse.data.models[0].id} (${modelsResponse.data.models[0].provider})`);
  } catch (error) {
    console.log('❌ Models endpoint failed:', error.message);
  }

  // Test 6: Explain endpoint
  console.log('\n6️⃣ Testing /api/explain endpoint:');
  try {
    const explainResponse = await axios.get(`${BASE_URL}/api/explain`);
    console.log('✅ Explain endpoint works!');
    console.log(`Service: ${explainResponse.data.service}`);
    console.log(`Description: ${explainResponse.data.description}`);
  } catch (error) {
    console.log('❌ Explain endpoint failed:', error.message);
  }

  // Test with non-litellm-js supported model (Gemini)
  console.log('\n7️⃣ Testing Gemini model (direct API):');
  try {
    const geminiResponse = await axios.post(`${BASE_URL}/api/chat`, {
      model: 'gemini-pro',
      messages: [{
        role: 'user',
        content: 'Say "Hello from Gemini"'
      }]
    }, { timeout: 30000 });

    console.log('✅ Gemini model works via direct API!');
    console.log(`Response: ${geminiResponse.data.content.text}`);
  } catch (error) {
    console.log('❌ Gemini model failed:', error.response?.data || error.message);
  }

  console.log('\n' + '=' . repeat(50));
  console.log('✅ All critical endpoints tested!\n');
}

testAllEndpoints().catch(console.error);