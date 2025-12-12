import { NextResponse } from 'next/server';
import { Daytona } from '@daytonaio/sdk';

// A simple in-memory store to map file hashes to sandbox IDs
// In a real application, this should be a persistent database
const sandboxCache = new Map<string, string>();

export async function POST(request: Request) {
  try {
    const { files, filesHash } = await request.json();

    if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!process.env.DAYTONA_API_KEY) {
        return NextResponse.json({ error: 'DAYTONA_API_KEY is not set' }, { status: 500 });
    }

    // Initialize Daytona Client inside the handler to ensure env vars are available
    const daytonaClient = new Daytona({ organizationId: process.env.DAYTONA_ORGANIZATION_ID });

    let sandboxId: string | undefined = sandboxCache.get(filesHash);
    let sandbox;

    // 1. Try to retrieve existing sandbox if we have an ID
    if (sandboxId) {
        try {
            console.log(`[Daytona] Retrieving existing sandbox: ${sandboxId}`);
            sandbox = await daytonaClient.get(sandboxId);

            // Check if sandbox is running, if not, start it
            if (sandbox.state !== 'started') {
                 console.log(`[Daytona] Sandbox ${sandboxId} is in state ${sandbox.state}, starting...`);
                 await sandbox.start();
            }
        } catch (e) {
            console.log('[Daytona] Sandbox not found or error retrieving, will create a new one.', e);
            sandboxId = undefined; // Mark as invalid to trigger creation
            sandboxCache.delete(filesHash);
        }
    }

    // 2. Create a new sandbox if we don't have an ID or retrieval failed
    if (!sandboxId) {
      console.log(`[Daytona] Creating new sandbox for hash: ${filesHash.substring(0, 8)}`);
      // Use 'typescript' language which should provide a Node.js environment
      sandbox = await daytonaClient.create({
        name: `vibe-project-${filesHash.substring(0, 8)}`,
        language: 'typescript', 
      });
      sandboxId = sandbox.id;
      sandboxCache.set(filesHash, sandboxId);
      console.log(`[Daytona] Sandbox created: ${sandboxId}`);
    }

    if (!sandbox) {
         return NextResponse.json({ error: 'Failed to initialize sandbox' }, { status: 500 });
    }

    // Ensure sandbox is fully started before operations
    console.log(`[Daytona] Waiting for sandbox ${sandboxId} to be started...`);
    await sandbox.waitUntilStarted();

    // 3. Synchronize files to the sandbox using a single update call
    console.log(`[Daytona] Uploading ${Object.keys(files).length} files to sandbox...`);
    const fileUploads = Object.entries(files as Record<string, string>).map(([path, content]) => ({
      source: Buffer.from(content),
      destination: path
    }));
    await sandbox.fs.uploadFiles(fileUploads);

    // Install dependencies and run the project if it's a new sandbox or files changed significantly
    if (files['package.json']) {
         console.log('[Daytona] Installing dependencies...');
         try {
            const proc = await sandbox.process.executeCommand('npm install');
            console.log('[Daytona] npm install result:', proc.result);
            if (proc.exitCode !== 0) {
                 console.error('[Daytona] npm install failed with exit code:', proc.exitCode);
            }
         } catch (err) {
            console.error('[Daytona] npm install failed:', err);
         }

         // Start the dev server in background
         console.log('[Daytona] Starting dev server...');
         try {
             // We use & to run in background so executeCommand returns immediately
             await sandbox.process.executeCommand('npm run dev > server.log 2>&1 &');
         } catch (err) {
             console.error('[Daytona] Failed to start dev server:', err);
         }
    }

    // 4. Get the preview URL for the running service (e.g., port 3000 for React)
    console.log(`[Daytona] Getting preview link for port 3000...`);
    // Add a small delay/retry might be needed if the server takes time to bind port?
    // But getPreviewLink usually just generates the URL, doesn't check if port is listening (unless Daytona checks).
    const previewLink = await sandbox.getPreviewLink(3000);
    const previewUrl = previewLink.url;
    console.log(`[Daytona] Preview URL: ${previewUrl}`);

    return NextResponse.json({ previewUrl });

  } catch (error) {
    console.error('Daytona API Error:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: 'Internal Server Error during Daytona operation', details: (error as any).message }, { status: 500 });
  }
}
