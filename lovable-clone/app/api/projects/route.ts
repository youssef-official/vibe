
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import fs from 'fs';
import path from 'path';

// Define DB path
const DB_PATH = path.join(process.cwd(), 'data', 'projects.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, '[]');
}

// Helper to read projects
function getProjects() {
    try {
        if (!fs.existsSync(DB_PATH)) return [];
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading projects DB:", error);
        return [];
    }
}

// Helper to save projects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveProjects(projects: any[]) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(projects, null, 2));
    } catch (error) {
        console.error("Error saving projects DB:", error);
    }
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
      files: {}, // Multi-file structure
      explanation: "Generating..."
    };

    const projects = getProjects();
    projects.unshift(newProject);
    saveProjects(projects);

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

  const projects = getProjects();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userProjects = projects.filter((p: any) => p.userId === userId);
  return NextResponse.json({ projects: userProjects });
}
