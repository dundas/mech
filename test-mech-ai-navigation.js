async function testMechAINavigation() {
    let fetch;
    try {
        fetch = require('node-fetch');
    } catch (e) {
        // Use built-in fetch if available (Node 18+)
        if (globalThis.fetch) {
            fetch = globalThis.fetch;
        } else {
            console.log('Error: node-fetch not installed and native fetch not available');
            console.log('Please install: npm install node-fetch@2');
            return;
        }
    }
    const baseUrl = 'http://localhost:5500';
    
    console.log('Testing Mech AI Navigation Flow\n');
    console.log('================================\n');
    
    // Step 1: Check if the app is running
    console.log('1. Checking if app is running...');
    try {
        const response = await fetch(baseUrl, {
            method: 'GET',
            redirect: 'manual'
        });
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Redirects to: ${response.headers.get('location')}`);
        
        if (response.status === 307 && response.headers.get('location').includes('/login')) {
            console.log('   ✓ App is running and redirecting to login page as expected\n');
        }
    } catch (error) {
        console.error('   ✗ Error accessing app:', error.message);
        return;
    }
    
    // Step 2: Test login endpoint
    console.log('2. Testing login with credentials...');
    console.log('   Email: ai-tester@mech.local');
    console.log('   Password: mech-ai-test-2025');
    
    try {
        // First get CSRF token
        const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
        const csrfData = await csrfResponse.json();
        console.log('   ✓ CSRF token obtained');
        
        // Attempt login
        const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'cookie': csrfResponse.headers.get('set-cookie')
            },
            body: JSON.stringify({
                email: 'ai-tester@mech.local',
                password: 'mech-ai-test-2025',
                csrfToken: csrfData.csrfToken
            }),
            redirect: 'manual'
        });
        
        console.log(`   Login response status: ${loginResponse.status}`);
        
        if (loginResponse.status === 302 || loginResponse.status === 200) {
            console.log('   ✓ Login appears successful\n');
        } else {
            console.log('   ✗ Login failed\n');
            const body = await loginResponse.text();
            console.log('   Response:', body.substring(0, 200) + '...');
        }
    } catch (error) {
        console.error('   ✗ Login error:', error.message);
    }
    
    // Step 3: Check session
    console.log('3. Checking session status...');
    try {
        const sessionResponse = await fetch(`${baseUrl}/api/auth/session`);
        const sessionData = await sessionResponse.json();
        
        if (sessionData.user) {
            console.log('   ✓ Session active for user:', sessionData.user.email);
        } else {
            console.log('   ✗ No active session');
        }
    } catch (error) {
        console.error('   ✗ Session check error:', error.message);
    }
    
    // Step 4: Test projects endpoint
    console.log('\n4. Testing projects endpoint...');
    try {
        const projectsResponse = await fetch(`${baseUrl}/api/projects`);
        console.log(`   Status: ${projectsResponse.status}`);
        
        if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            console.log(`   ✓ Projects endpoint accessible`);
            console.log(`   Found ${projectsData.projects?.length || 0} projects`);
            
            if (projectsData.projects && projectsData.projects.length > 0) {
                console.log('\n   First project:');
                console.log(`   - ID: ${projectsData.projects[0].id}`);
                console.log(`   - Name: ${projectsData.projects[0].name}`);
                console.log(`   - Type: ${projectsData.projects[0].type}`);
            }
        } else {
            console.log('   ✗ Projects endpoint returned error');
            const errorText = await projectsResponse.text();
            console.log('   Error:', errorText.substring(0, 200));
        }
    } catch (error) {
        console.error('   ✗ Projects endpoint error:', error.message);
    }
    
    console.log('\n================================');
    console.log('Navigation test complete\n');
    
    console.log('Issues found:');
    console.log('1. Cannot perform actual browser navigation without Playwright');
    console.log('2. Login flow requires session management that fetch cannot handle properly');
    console.log('3. Need to use actual browser automation to test UI interactions\n');
    
    console.log('Recommendations:');
    console.log('1. Install Playwright locally: npm install playwright');
    console.log('2. Use Playwright to automate browser interactions');
    console.log('3. Test actual click events on project cards');
    console.log('4. Verify visual elements and page transitions');
}

// Run the test
testMechAINavigation();