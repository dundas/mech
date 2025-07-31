// Start the development server with MongoDB encryption disabled
process.env.MONGODB_CLIENT_ENCRYPTION_ENABLED = 'false';

// Apply patch to skip optional MongoDB dependencies
require('./patches/mongodb-skip-encryption.js');

// Load the main application
require('tsx/register');
require('./src/index.ts');