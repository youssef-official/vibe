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
            sandbox = await daytonaClient.get(sandboxId);
        } catch (e) {
            console.log('Sandbox not found or stopped, will create a new one.', e);
            sandboxId = undefined; // Mark as invalid to trigger creation
            sandboxCache.delete(filesHash);
        }
    }

    // 2. Create a new sandbox if we don't have an ID or retrieval failed
    if (!sandboxId) {
      sandbox = await daytonaClient.create({
        name: `vibe-project-${filesHash.substring(0, 8)}`,
        // Assuming a simple Node.js/React template for the generated code
        language: 'typescript', 
      });
      sandboxId = sandbox.id;
      sandboxCache.set(filesHash, sandboxId);
    }

    if (!sandbox) {
         return NextResponse.json({ error: 'Failed to initialize sandbox' }, { status: 500 });
    }

    // 3. Synchronize files to the sandbox using a single update call
    // The sandbox object should now be available from either creation or retrieval.
    const fileUploads = Object.entries(files as Record<string, string>).map(([path, content]) => ({
      source: Buffer.from(content),
      destination: path
    }));
    await sandbox.fs.uploadFiles(fileUploads);

    // 4. Get the preview URL for the running service (e.g., port 3000 for React)
    // This is the critical part that replaces Sandpack's built-in preview.
    // The sandbox object is already available from step 1 or 2.
    const previewLink = await sandbox.getPreviewLink(3000);
    const previewUrl = previewLink.url;

    return NextResponse.json({ previewUrl });

  } catch (error) {
    console.error('Daytona API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error during Daytona operation' }, { status: 500 });
  }
}
