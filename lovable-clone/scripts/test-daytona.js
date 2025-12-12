
require('dotenv').config({ path: '../.env.local' });
const { Daytona } = require('@daytonaio/sdk');

async function main() {
  console.log('Testing Daytona SDK Background Execution...');

  try {
    const client = new Daytona({ organizationId: process.env.DAYTONA_ORGANIZATION_ID });

    // Reuse existing if possible or create new
    // For test, create new to be clean, or use a known one if I had the ID.
    // I'll create new.
    console.log('Creating sandbox...');
    const sandbox = await client.create({
      name: 'test-bg-' + Date.now(),
      language: 'typescript'
    });
    console.log('Sandbox created:', sandbox.id);
    await sandbox.waitUntilStarted();

    const start = Date.now();
    console.log('Executing foreground sleep 2s...');
    await sandbox.process.executeCommand('sleep 2');
    console.log('Foreground took:', Date.now() - start, 'ms');

    const startBg = Date.now();
    console.log('Executing background sleep 5s...');
    // Try to run in background
    await sandbox.process.executeCommand('sleep 5 > /dev/null 2>&1 &');
    console.log('Background command returned in:', Date.now() - startBg, 'ms');

    if ((Date.now() - startBg) < 1000) {
        console.log('SUCCESS: Background command returned immediately.');
    } else {
        console.log('FAILURE: Background command waited.');
    }

    console.log('Cleaning up...');
    await sandbox.delete();
    console.log('Done.');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
