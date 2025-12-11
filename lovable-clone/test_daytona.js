
const { Daytona } = require('@daytonaio/sdk');

async function main() {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    console.error("No DAYTONA_API_KEY found");
    return;
  }

  console.log("Initializing Daytona client...");
  const daytona = new Daytona({ apiKey });

  try {
    console.log("Creating a sandbox...");
    // Create a simple sandbox to verify
    const sandbox = await daytona.create({
      language: 'javascript', // or python, typescript
    });

    console.log(`Sandbox created with ID: ${sandbox.id}`);

    // Run simple code
    console.log("Running code...");
    const result = await sandbox.process.codeRun('console.log("Hello from Daytona!")');
    console.log("Result:", result.result);
    console.log("Exit Code:", result.exitCode);

    // Cleanup
    console.log("Deleting sandbox...");
    await daytona.remove(sandbox); // or delete
    console.log("Sandbox deleted.");

  } catch (error) {
    console.error("Error with Daytona:", error);
  }
}

// Load env vars since we are running standalone
require('dotenv').config({ path: '.env.local' });
main();
