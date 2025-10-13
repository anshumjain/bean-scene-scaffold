#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Missouri City cafe seeding...\n');

// Run the TypeScript seeding script
const scriptPath = path.join(__dirname, 'seedMissouriCityCafes.ts');
const command = `npx tsx "${scriptPath}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error running seeding script:', error);
    process.exit(1);
  }
  
  if (stderr) {
    console.error('⚠️ Warnings:', stderr);
  }
  
  console.log(stdout);
  console.log('\n✅ Missouri City seeding completed!');
});
