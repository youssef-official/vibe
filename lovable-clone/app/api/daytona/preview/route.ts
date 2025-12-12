import { NextResponse } from 'next/server';
import { Daytona } from '@daytonaio/sdk';

// Allow up to 60 seconds for this route (if supported by hosting platform)
export const maxDuration = 60;

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
      try {
          sandbox = await daytonaClient.create({
            name: `vibe-project-${filesHash.substring(0, 8)}`,
            language: 'typescript',
          });
          sandboxId = sandbox.id;
          sandboxCache.set(filesHash, sandboxId);
          console.log(`[Daytona] Sandbox created: ${sandboxId}`);
      } catch (err) {
          console.error('[Daytona] Failed to create sandbox:', err);
          return NextResponse.json({ error: 'Failed to create sandbox environment' }, { status: 500 });
      }
    }

    if (!sandbox) {
         return NextResponse.json({ error: 'Failed to initialize sandbox' }, { status: 500 });
    }

    // Ensure sandbox is fully started before operations
    // We try to wait, but if it takes too long, we might need to let the client retry.
    if (sandbox.state !== 'started') {
        console.log(`[Daytona] Waiting for sandbox ${sandboxId} to be started...`);
        try {
            // Wait up to 20 seconds. If it takes longer, we might return a "Still Starting" status
            // Note: waitUntilStarted signature depends on SDK. Assuming it takes timeout or we race it.
            // The SDK's waitUntilStarted usually has a default timeout (e.g. 60s).
            // We can wrap it in a race with a local timeout to return early.

            const waitPromise = sandbox.waitUntilStarted();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000));

            await Promise.race([waitPromise, timeoutPromise]);
        } catch (err) {
            // If it timed out, return 202 to tell client to retry
             console.log('[Daytona] Sandbox start timed out or taking long, asking client to retry...');
             return NextResponse.json({ status: 'starting', message: 'Sandbox is initializing...' }, { status: 202 });
        }
    }

    // 3. Synchronize files
    console.log(`[Daytona] Uploading ${Object.keys(files).length} files to sandbox...`);
    try {
        const fileUploads = Object.entries(files as Record<string, string>).map(([path, content]) => ({
          source: Buffer.from(content),
          destination: path
        }));
        await sandbox.fs.uploadFiles(fileUploads);
    } catch (err) {
        console.error('[Daytona] File upload failed:', err);
        // If upload fails, maybe sandbox crashed or is not ready?
        return NextResponse.json({ error: 'Failed to upload files to sandbox' }, { status: 500 });
    }

    // Install dependencies and run the project
    if (files['package.json']) {
         console.log('[Daytona] Triggering background npm install and start...');
         try {
             // Run npm install and npm run dev in background
             await sandbox.process.executeCommand('(npm install && npm run dev) > server.log 2>&1 &');
         } catch (err) {
             console.error('[Daytona] Failed to trigger background command:', err);
         }
    }

    // 4. Get the preview URL
    console.log(`[Daytona] Getting preview link for port 3000...`);
    try {
        const previewLink = await sandbox.getPreviewLink(3000);
        const previewUrl = previewLink.url;
        console.log(`[Daytona] Preview URL: ${previewUrl}`);
        return NextResponse.json({ previewUrl });
    } catch (err) {
         console.error('[Daytona] Failed to get preview link:', err);
         return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 });
    }

  } catch (error) {
    console.error('Daytona API Error:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: 'Internal Server Error during Daytona operation', details: (error as any).message }, { status: 500 });
  }
}
