const { chromium } = require('playwright');

async function testURLs() {
  const browser = await chromium.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('=== Testing Mech URLs ===\n');

  // Test 1: Project page
  console.log('1. Testing project page: http://localhost:5500/projects/683553919e198d271dac2b7d');
  try {
    await page.goto('http://localhost:5500/projects/683553919e198d271dac2b7d', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000); // Give time for redirects
    
    const currentURL = page.url();
    console.log(`   Current URL: ${currentURL}`);
    
    if (currentURL.includes('/login')) {
      console.log('   ✓ Redirected to login page as expected');
      
      // Take screenshot of login page
      await page.screenshot({ 
        path: 'screenshot-login-page.png',
        fullPage: true
      });
      console.log('   ✓ Screenshot saved: screenshot-login-page.png');
      
      // Check login page content
      const pageTitle = await page.title();
      console.log(`   Page title: ${pageTitle}`);
      
      // Look for common login elements
      const hasEmailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').count() > 0;
      const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
      const hasSubmitButton = await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').count() > 0;
      
      console.log(`   Has email input: ${hasEmailInput}`);
      console.log(`   Has password input: ${hasPasswordInput}`);
      console.log(`   Has submit button: ${hasSubmitButton}`);
    } else {
      console.log('   ✗ No redirect to login - may already be authenticated');
      await page.screenshot({ 
        path: 'screenshot-project-page.png',
        fullPage: true
      });
      console.log('   ✓ Screenshot saved: screenshot-project-page.png');
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  console.log('\n2. Testing Claude sessions API: http://localhost:5500/api/claude-sessions?sessionId=1752759906_kefentse');
  
  // Test 2: API endpoint
  try {
    const apiResponse = await page.goto('http://localhost:5500/api/claude-sessions?sessionId=1752759906_kefentse', {
      waitUntil: 'networkidle'
    });
    
    const responseStatus = apiResponse.status();
    console.log(`   Response status: ${responseStatus}`);
    
    if (responseStatus === 200) {
      const responseText = await page.textContent('body');
      console.log('   ✓ API responded successfully');
      
      // Try to parse JSON
      try {
        const jsonData = JSON.parse(responseText);
        console.log(`   Sessions found: ${jsonData.sessions?.length || 0}`);
        if (jsonData.sessions?.length > 0) {
          console.log(`   First session ID: ${jsonData.sessions[0].sessionId}`);
          console.log(`   Project ID: ${jsonData.sessions[0].projectId}`);
          console.log(`   Status: ${jsonData.sessions[0].status}`);
        }
      } catch (e) {
        console.log('   Response body:', responseText.substring(0, 200) + '...');
      }
      
      await page.screenshot({ 
        path: 'screenshot-api-response.png',
        fullPage: true
      });
      console.log('   ✓ Screenshot saved: screenshot-api-response.png');
    } else {
      console.log(`   ✗ Unexpected status code: ${responseStatus}`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  console.log('\n3. Testing server root: http://localhost:5500/');
  
  // Test 3: Server root
  try {
    await page.goto('http://localhost:5500/', {
      waitUntil: 'networkidle'
    });
    
    const currentURL = page.url();
    console.log(`   Current URL: ${currentURL}`);
    
    await page.screenshot({ 
      path: 'screenshot-root-page.png',
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: screenshot-root-page.png');
    
    // Check for common elements
    const pageContent = await page.textContent('body');
    console.log(`   Page content preview: ${pageContent.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  console.log('\n=== Test Summary ===');
  console.log('Screenshots have been saved to the current directory.');
  console.log('Please check the screenshots to see the actual page content.\n');

  await browser.close();
}

// Run the tests
testURLs().catch(console.error);