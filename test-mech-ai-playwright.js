const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testMechAIWithPlaywright() {
    console.log('Mech AI - Playwright Navigation Test\n');
    console.log('=====================================\n');
    
    const browser = await chromium.launch({ 
        headless: false,  // Set to true for CI/CD
        slowMo: 500      // Slow down actions to see what's happening
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'mech-ai-test-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }
    
    const results = {
        timestamp: new Date().toISOString(),
        tests: []
    };
    
    try {
        // Step 1: Navigate to home page
        console.log('1. Navigating to http://localhost:5500...');
        await page.goto('http://localhost:5500');
        await page.waitForLoadState('networkidle');
        
        // Check if we're redirected to login
        const currentUrl = page.url();
        console.log(`   Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('/login')) {
            console.log('   ✓ Redirected to login page as expected');
            await page.screenshot({ 
                path: path.join(screenshotsDir, '01-login-page.png'),
                fullPage: true 
            });
            results.tests.push({
                test: 'Navigation to home redirects to login',
                status: 'passed'
            });
        } else {
            console.log('   ✗ Did not redirect to login page');
            results.tests.push({
                test: 'Navigation to home redirects to login',
                status: 'failed',
                error: 'No redirect to login'
            });
        }
        
        // Step 2: Attempt login
        console.log('\n2. Attempting login...');
        console.log('   Email: ai-tester@mech.local');
        console.log('   Password: mech-ai-test-2025');
        
        // Look for email input
        const emailInput = await page.locator('input[name="email"], input[type="email"], input[id="email"]').first();
        const passwordInput = await page.locator('input[name="password"], input[type="password"], input[id="password"]').first();
        
        if (await emailInput.isVisible() && await passwordInput.isVisible()) {
            console.log('   ✓ Found login form fields');
            
            // Fill in credentials
            await emailInput.fill('ai-tester@mech.local');
            await passwordInput.fill('mech-ai-test-2025');
            
            await page.screenshot({ 
                path: path.join(screenshotsDir, '02-login-filled.png'),
                fullPage: true 
            });
            
            // Look for submit button - specifically the credentials sign in button
            // Avoid the GitHub login button
            const submitButton = await page.locator('button[type="submit"]:has-text("Sign in"):not(:has-text("GitHub"))').first();
            
            if (await submitButton.isVisible()) {
                console.log('   ✓ Found submit button');
                await submitButton.click();
                
                // Wait for navigation or error
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000); // Give time for any redirects
                
                const afterLoginUrl = page.url();
                console.log(`   After login URL: ${afterLoginUrl}`);
                
                await page.screenshot({ 
                    path: path.join(screenshotsDir, '03-after-login.png'),
                    fullPage: true 
                });
                
                // Check if we're on the projects page or if we see project content
                const projectsVisible = await page.locator('h1:has-text("My Projects"), h2:has-text("Mech AI"), h2:has-text("Mech Boilerplate")').first();
                
                if (!afterLoginUrl.includes('/login') || (await projectsVisible.isVisible())) {
                    console.log('   ✓ Login successful - redirected to projects page');
                    results.tests.push({
                        test: 'Login with test credentials',
                        status: 'passed'
                    });
                } else {
                    // Check for error messages
                    const errorMessage = await page.locator('.error-message, .alert-danger, [role="alert"], .text-red-500').first();
                    if (await errorMessage.isVisible()) {
                        const errorText = await errorMessage.textContent();
                        console.log(`   ✗ Login failed - Error: ${errorText}`);
                        results.tests.push({
                            test: 'Login with test credentials',
                            status: 'failed',
                            error: errorText
                        });
                    } else {
                        console.log('   ✗ Login failed - Still on login page');
                        results.tests.push({
                            test: 'Login with test credentials',
                            status: 'failed',
                            error: 'Remained on login page after submit'
                        });
                    }
                }
            } else {
                console.log('   ✗ Could not find submit button');
                results.tests.push({
                    test: 'Login with test credentials',
                    status: 'failed',
                    error: 'Submit button not found'
                });
            }
        } else {
            console.log('   ✗ Could not find login form fields');
            results.tests.push({
                test: 'Login with test credentials',
                status: 'failed',
                error: 'Login form fields not found'
            });
        }
        
        // Step 3: Navigate to projects page (if logged in)
        if (!page.url().includes('/login')) {
            console.log('\n3. Navigating to projects page...');
            
            // Try direct navigation first
            await page.goto('http://localhost:5500/projects');
            await page.waitForLoadState('networkidle');
            
            await page.screenshot({ 
                path: path.join(screenshotsDir, '04-projects-page.png'),
                fullPage: true 
            });
            
            console.log(`   Current URL: ${page.url()}`);
            
            if (page.url().includes('/projects')) {
                console.log('   ✓ Successfully navigated to projects page');
                
                // Look for project cards/items - wait for them to load
                await page.waitForTimeout(1000); // Give time for projects to render
                
                // Try multiple selectors to find project cards
                let projectElements = await page.locator('div:has-text("Mech AI"):has-text("Created on")').all();
                
                if (projectElements.length === 0) {
                    // Try finding by heading text
                    projectElements = await page.locator('h2:text-is("Mech AI"), h2:text-is("Mech Boilerplate")').all();
                }
                
                if (projectElements.length === 0) {
                    // Try finding parent containers of project headings
                    projectElements = await page.locator('div').filter({ hasText: /^Mech AI.*Created on/ }).all();
                }
                
                if (projectElements.length === 0) {
                    // Last resort - find any div that contains project-like content
                    projectElements = await page.locator('div').filter({ hasText: 'Created on' }).all();
                }
                
                console.log(`   Found ${projectElements.length} project elements`);
                
                if (projectElements.length > 0) {
                    console.log('   ✓ Projects are displayed');
                    results.tests.push({
                        test: 'Navigate to projects page',
                        status: 'passed',
                        details: `Found ${projectElements.length} projects`
                    });
                    
                    // Step 4: Try clicking on a project
                    console.log('\n4. Attempting to click on first project...');
                    const firstProject = projectElements[0];
                    
                    // Get project info before clicking
                    const projectText = await firstProject.textContent();
                    console.log(`   Project text: ${projectText.substring(0, 100)}...`);
                    
                    await firstProject.click();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(1000);
                    
                    const afterClickUrl = page.url();
                    console.log(`   After click URL: ${afterClickUrl}`);
                    
                    await page.screenshot({ 
                        path: path.join(screenshotsDir, '05-after-project-click.png'),
                        fullPage: true 
                    });
                    
                    if (afterClickUrl !== page.url() && afterClickUrl.includes('/project')) {
                        console.log('   ✓ Successfully navigated to project details');
                        results.tests.push({
                            test: 'Click on project card',
                            status: 'passed'
                        });
                    } else {
                        console.log('   ✗ Click did not navigate to project details');
                        results.tests.push({
                            test: 'Click on project card',
                            status: 'failed',
                            error: 'No navigation occurred'
                        });
                    }
                } else {
                    console.log('   ✗ No projects found on page');
                    results.tests.push({
                        test: 'Navigate to projects page',
                        status: 'failed',
                        error: 'No project elements found'
                    });
                }
            } else {
                console.log('   ✗ Could not navigate to projects page');
                results.tests.push({
                    test: 'Navigate to projects page',
                    status: 'failed',
                    error: 'Not on projects page'
                });
            }
        }
        
    } catch (error) {
        console.error('\n✗ Test error:', error.message);
        results.error = error.message;
    } finally {
        await browser.close();
        
        // Save results
        const resultsPath = path.join(screenshotsDir, 'test-results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        
        console.log('\n=====================================');
        console.log('Test Results Summary:');
        console.log(`Total tests: ${results.tests.length}`);
        console.log(`Passed: ${results.tests.filter(t => t.status === 'passed').length}`);
        console.log(`Failed: ${results.tests.filter(t => t.status === 'failed').length}`);
        console.log(`\nScreenshots saved to: ${screenshotsDir}`);
        console.log(`Results saved to: ${resultsPath}`);
        
        // Print issues found
        const failedTests = results.tests.filter(t => t.status === 'failed');
        if (failedTests.length > 0) {
            console.log('\nIssues Found:');
            failedTests.forEach((test, index) => {
                console.log(`${index + 1}. ${test.test}: ${test.error}`);
            });
        }
    }
}

// Check if playwright is installed
try {
    require('playwright');
    testMechAIWithPlaywright().catch(console.error);
} catch (e) {
    console.log('Playwright is not installed.');
    console.log('Please install it with: npm install playwright');
    console.log('Or install globally: npm install -g playwright');
    console.log('\nAlternatively, install in the current directory:');
    console.log('npm init -y && npm install playwright');
}