
import { NextResponse } from 'next/server';
import { OpenAI } from "openai";
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client with Minimax configuration as default
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const minimaxClient = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: "https://api.minimax.io/v1",
});

// Initialize OpenAI/OpenRouter client (optional, if key exists)
const openRouterClient = process.env.OPENROUTER_API_KEY ? new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
}) : null;

// In-memory store for projects
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var _projects: any[];
}
if (!global._projects) {
  global._projects = [];
}
const projects = global._projects;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, prompt, model } = body;

    // Determine client and model
    let selectedModel = 'MiniMax-M2';

    if (model === 'openrouter') {
        if (!openRouterClient) {
            return NextResponse.json({ error: "OpenRouter is not configured" }, { status: 400 });
        }
        // Default OpenRouter model or pass specific one
        selectedModel = 'anthropic/claude-3-opus'; // Example default, or let user pick
    } else {
        selectedModel = (model === 'minimax' || !model) ? 'MiniMax-M2' : model;
    }

    console.log(`Creating project placeholder with model: ${selectedModel} for prompt: ${prompt}`);

    // Immediate project creation without waiting for generation
    // The generation will be handled by the client via a separate stream endpoint
    // to meet the "don't wait for code" requirement.

    const id = Math.random().toString(36).substring(7);
    const newProject = {
      id,
      userId,
      name,
      description,
      prompt,
      model: selectedModel,
      updated_at: new Date().toISOString(),
      code: "", // Empty initially
      explanation: "Generating..."
    };

    projects.unshift(newProject);

    return NextResponse.json(newProject);

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('Error creating project:', error);
    return NextResponse.json({
        error: 'Internal Server Error',
        details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
      return NextResponse.json({ projects: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userProjects = projects.filter((p: any) => p.userId === userId);
  return NextResponse.json({ projects: userProjects });
}
