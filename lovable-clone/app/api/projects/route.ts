
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client with Minimax configuration as default
import { OpenAI } from "openai";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const minimaxClient = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: "https://api.minimax.io/v1",
});

// In-memory store for projects
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var _projects: any[];
}
if (!global._projects) {
  global._projects = [];
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, prompt, model } = body;

    const selectedModel = (model === 'minimax' || !model) ? 'MiniMax-M2' : model;

    console.log(`Creating project placeholder with model: ${selectedModel} for prompt: ${prompt}`);

    const id = Math.random().toString(36).substring(7);
    const newProject = {
      id,
      userId,
      name,
      description,
      prompt,
      model: selectedModel,
      updated_at: new Date().toISOString(),
      files: {},
      explanation: "Generating..."
    };

    // Use global store
    global._projects.unshift(newProject);
    console.log(`Project ${id} created. Total projects: ${global._projects.length}`);

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
  const userProjects = global._projects.filter((p: any) => p.userId === userId);
  return NextResponse.json({ projects: userProjects });
}
