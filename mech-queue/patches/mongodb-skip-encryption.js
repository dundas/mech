// Patch to skip MongoDB optional encryption dependencies
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Skip optional Azure dependencies that MongoDB tries to load
  if (id === './azure' || id === '@azure/identity' || id === 'gcp-metadata' || id === '@aws-sdk/credential-providers') {
    return {};
  }
  return originalRequire.apply(this, arguments);
};