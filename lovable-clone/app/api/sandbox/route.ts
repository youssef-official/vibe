
import { Daytona } from '@daytonaio/sdk';

const apiKey = process.env.DAYTONA_API_KEY;
const daytona = new Daytona({ apiKey: apiKey! });

export async function POST(req: Request) {
  try {
    const { code, language } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: "Code is required" }), { status: 400 });
    }

    // Create a sandbox
    // In a real app, we might reuse sandboxes per session/project.
    // For this clone, we'll create one on demand (latency might be a few seconds).
    // The search result said "Sub-90ms Sandbox creation", so it should be fast.

    const sandbox = await daytona.create({
      language: language || 'typescript',
    });

    const result = await sandbox.process.codeRun(code);

    // We should cleanup to save resources, or keep it alive if we want persistent state.
    // For now, let's clean up.
    // The error in test script was "daytona.remove is not a function".
    // I should check what the delete method is.
    // The docs in search result said: "if (sandbox) await daytona.delete(sandbox)" in typescript example.

    await daytona.delete(sandbox);

    return new Response(JSON.stringify({
        output: result.result,
        exitCode: result.exitCode,
        sandboxId: sandbox.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Daytona Error:", error);
    return new Response(JSON.stringify({ error: "Failed to run in Daytona" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
