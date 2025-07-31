// Simple test script to verify scheduler functionality
const axios = require('axios');

// Configuration
const SCHEDULER_URL = 'http://localhost:3003/api';
const WEBHOOK_SITE_URL = 'https://webhook.site/e9b9c3c4-8e8c-4e6e-a5d0-8b5f3a5c5e5d'; // Replace with your webhook.site URL

async function testScheduler() {
  console.log('🧪 Testing Mech Queue Scheduler\n');

  try {
    // Step 1: Create a test schedule
    console.log('1️⃣ Creating a test schedule...');
    const createResponse = await axios.post(`${SCHEDULER_URL}/schedules`, {
      name: `test-schedule-${Date.now()}`,
      description: 'Test schedule for API endpoint calls',
      endpoint: {
        url: WEBHOOK_SITE_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Header': 'mech-scheduler-test'
        },
        body: {
          message: 'Hello from Mech Scheduler!',
          timestamp: new Date().toISOString(),
          test: true
        },
        timeout: 10000
      },
      schedule: {
        cron: '*/5 * * * *', // Every 5 minutes
        timezone: 'UTC'
      },
      retryPolicy: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      },
      createdBy: 'test-script'
    });

    const schedule = createResponse.data.data;
    console.log('✅ Schedule created successfully!');
    console.log(`   ID: ${schedule.id}`);
    console.log(`   Name: ${schedule.name}`);
    console.log(`   Next execution: ${schedule.nextExecutionAt}\n`);

    // Step 2: Get schedule details
    console.log('2️⃣ Fetching schedule details...');
    const getResponse = await axios.get(`${SCHEDULER_URL}/schedules/${schedule.id}`);
    console.log('✅ Schedule details retrieved\n');

    // Step 3: Execute the schedule immediately
    console.log('3️⃣ Executing schedule immediately...');
    const executeResponse = await axios.post(`${SCHEDULER_URL}/schedules/${schedule.id}/execute`);
    console.log('✅ Schedule executed!');
    console.log(`   Execution ID: ${executeResponse.data.data.executionId}`);
    console.log(`\n📌 Check your webhook.site URL for the request: ${WEBHOOK_SITE_URL}\n`);

    // Wait a moment for execution to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Check execution status
    console.log('4️⃣ Checking execution status...');
    const statusResponse = await axios.get(`${SCHEDULER_URL}/schedules/${schedule.id}`);
    const updatedSchedule = statusResponse.data.data;
    console.log('✅ Execution status:');
    console.log(`   Last executed: ${updatedSchedule.lastExecutedAt || 'Not yet'}`);
    console.log(`   Last status: ${updatedSchedule.lastExecutionStatus || 'N/A'}`);
    console.log(`   Execution count: ${updatedSchedule.executionCount}\n`);

    // Step 5: List all schedules
    console.log('5️⃣ Listing all schedules...');
    const listResponse = await axios.get(`${SCHEDULER_URL}/schedules`);
    console.log(`✅ Found ${listResponse.data.pagination.total} schedules\n`);

    // Step 6: Disable the schedule
    console.log('6️⃣ Disabling the test schedule...');
    await axios.patch(`${SCHEDULER_URL}/schedules/${schedule.id}/toggle`, {
      enabled: false
    });
    console.log('✅ Schedule disabled\n');

    // Step 7: Delete the schedule
    console.log('7️⃣ Cleaning up - deleting test schedule...');
    await axios.delete(`${SCHEDULER_URL}/schedules/${schedule.id}`);
    console.log('✅ Schedule deleted\n');

    console.log('🎉 All tests passed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Cannot connect to scheduler service.');
      console.error('   Make sure the mech-queue service is running on port 3003');
      console.error('   Run: npm run dev');
    }
  }
}

// Run the test
console.log('Starting scheduler test...\n');
console.log('⚠️  Note: Make sure the mech-queue service is running!');
console.log('   If not, run: npm run dev\n');
console.log('📝 You can get a webhook URL from: https://webhook.site\n');

testScheduler();