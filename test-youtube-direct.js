#!/usr/bin/env node

const axios = require('axios');

// Test YouTube transcript extraction directly
const url = "https://youtu.be/jAJk-23r98w";
const videoId = "jAJk-23r98w"; // Extract from URL

// ScrapingDog API configuration  
const apiKey = "675fe3ee2f852e2cbeeab32b";
const transcriptEndpoint = "https://api.scrapingdog.com/youtube_transcripts/";

async function testYouTubeTranscript() {
  console.log("🎥 Testing YouTube Transcript via ScrapingDog API");
  console.log(`Video URL: ${url}`);
  console.log(`Video ID: ${videoId}`);
  console.log();

  // Test 1: Try to get transcript
  console.log("📤 Fetching transcript...");
  try {
    const response = await axios.get(transcriptEndpoint, {
      params: {
        api_key: apiKey,
        video_id: videoId
      },
      timeout: 30000
    });
    
    console.log(`Status Code: ${response.status}`);
    console.log("✅ Transcript retrieved successfully!");
    console.log();
    console.log("📊 Response structure:");
    const dataStr = JSON.stringify(response.data, null, 2);
    console.log(dataStr.substring(0, 1000) + (dataStr.length > 1000 ? "..." : ""));
    
    // Show some transcript content if available
    if (response.data.transcript) {
      console.log("\n📝 Transcript preview:");
      if (Array.isArray(response.data.transcript)) {
        // Show first few segments
        response.data.transcript.slice(0, 5).forEach(segment => {
          console.log(`[${segment.start || '?'}s] ${segment.text}`);
        });
      } else if (typeof response.data.transcript === 'string') {
        console.log(response.data.transcript.substring(0, 500) + "...");
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }

  // Test 2: Try regular YouTube scraping  
  console.log("\n\n📤 Testing regular YouTube scraping...");
  try {
    const response = await axios.get("https://api.scrapingdog.com/youtube", {
      params: {
        api_key: apiKey,
        url: url
      },
      timeout: 30000
    });
    
    console.log(`Status Code: ${response.status}`);
    if (response.status === 200) {
      console.log("✅ Video data retrieved");
      console.log("Data preview:", JSON.stringify(response.data, null, 2).substring(0, 300) + "...");
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log("Response:", JSON.stringify(error.response.data, null, 2).substring(0, 200) + "...");
    }
  }

  console.log("\n💡 Note: If the API key is invalid, you'll need a valid ScrapingDog API key");
  console.log("   Visit: https://scrapingdog.com/ to get an API key");
}

// Run the test
testYouTubeTranscript();