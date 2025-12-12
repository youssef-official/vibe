import { NextResponse } from 'next/server';
import { Daytona } from '@daytonaio/sdk';

// Initialize Daytona Client
// The client will automatically pick up the DAYTONA_API_KEY from the environment variables
const daytonaClient = new Daytona({ organizationId: process.env.DAYTONA_ORGANIZATION_ID });

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

    let sandboxId: string | undefined = sandboxCache.get(filesHash);

    if (!sandboxId) {
      // 1. Create a new sandbox
      const sandbox = await daytonaClient.create({
        name: `vibe-project-${filesHash.substring(0, 8)}`,
        // Assuming a simple Node.js/React template for the generated code
        language: 'typescript', 
      });
      sandboxId = sandbox.id;
      sandboxCache.set(filesHash, sandboxId);
    } else {
        // 2. Check if the sandbox is still running and update it
        try {
            await daytonaClient.get(sandboxId);
        } catch (e) {
            // Sandbox not found or stopped, create a new one
            sandboxCache.delete(filesHash);
            return await POST(request); // Retry with new creation
        }
    }

// 3. Synchronize files to the sandbox using a single update call
	// This is the correct method for the latest Daytona SDK to update files in bulk.
	await daytonaClient.update({
	    sandboxId,
	    files: files as Record<string, string>,
	});

    // 4. Get the preview URL for the running service (e.g., port 3000 for React)
    // This is the critical part that replaces Sandpack's built-in preview.
    const sandbox = await daytonaClient.get(sandboxId);
    const previewLink = await sandbox.getPreviewLink(3000);
    const previewUrl = previewLink.url;

    return NextResponse.json({ previewUrl });

  } catch (error) {
    console.error('Daytona API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error during Daytona operation' }, { status: 500 });
  }
}
