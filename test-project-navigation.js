const { chromium } = require('playwright');

async function testProjectNavigation() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down to see what's happening
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:5500');
    
    // Wait for redirect to login
    await page.waitForURL('**/login', { timeout: 5000 });
    console.log('2. On login page');
    
    // Login
    console.log('3. Logging in...');
    await page.fill('input[name="email"]', 'ai-tester@mech.local');
    await page.fill('input[name="password"]', 'mech-ai-test-2025');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/projects', { timeout: 10000 });
    console.log('4. On projects page');
    
    // Wait for project cards to load
    await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 });
    
    // Get all project cards
    const projectCards = await page.$$('[data-testid="project-card"]');
    console.log(`5. Found ${projectCards.length} project cards`);
    
    if (projectCards.length > 0) {
      // Try to click the first project card
      console.log('6. Attempting to click first project card...');
      
      // Get the href attribute to see where it should navigate
      const firstCard = projectCards[0];
      const link = await firstCard.$('a');
      
      if (link) {
        const href = await link.getAttribute('href');
        console.log(`   Link href: ${href}`);
        
        // Try clicking the link
        await link.click();
        console.log('7. Clicked the link, waiting for navigation...');
        
        // Wait for navigation
        try {
          await page.waitForURL('**/projects/*', { timeout: 5000 });
          console.log('8. Successfully navigated to project detail page!');
          console.log(`   Current URL: ${page.url()}`);
        } catch (error) {
          console.log('8. Navigation failed!');
          console.log(`   Still on URL: ${page.url()}`);
          
          // Check if the link is actually rendered as clickable
          const isClickable = await link.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              pointerEvents: computed.pointerEvents,
              cursor: computed.cursor,
              display: computed.display,
              visibility: computed.visibility,
              zIndex: computed.zIndex,
              position: computed.position
            };
          });
          console.log('   Link CSS properties:', isClickable);
          
          // Check parent card properties
          const cardProps = await firstCard.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              pointerEvents: computed.pointerEvents,
              cursor: computed.cursor,
              position: computed.position,
              zIndex: computed.zIndex
            };
          });
          console.log('   Card CSS properties:', cardProps);
        }
      } else {
        console.log('6. No link found inside project card!');
        
        // Check the card structure
        const cardHTML = await firstCard.innerHTML();
        console.log('   Card HTML:', cardHTML.substring(0, 200) + '...');
      }
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'project-navigation-debug.png', fullPage: true });
    console.log('Screenshot saved as project-navigation-debug.png');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testProjectNavigation();