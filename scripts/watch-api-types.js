#!/usr/bin/env node

const chokidar = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');

console.log('👀 Watching for API route changes to regenerate types...');

// Watch API route files
const watcher = chokidar.watch([
  'apps/api/src/routes/*.ts',
  'apps/api/src/openapi.ts'
], {
  ignoreInitial: true,
  persistent: true
});

let timeout;

watcher.on('change', (filePath) => {
  console.log(`📝 ${path.basename(filePath)} changed`);
  
  // Debounce to avoid multiple regenerations
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    console.log('🔧 Regenerating API types...');
    try {
      execSync('npm run generate-api-types', { stdio: 'inherit' });
      console.log('✅ Types updated!');
    } catch (error) {
      console.error('❌ Failed to regenerate types:', error.message);
    }
  }, 1000);
});

watcher.on('error', error => {
  console.error('❌ Watcher error:', error);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n👋 Stopping type watcher...');
  watcher.close();
  process.exit(0);
});