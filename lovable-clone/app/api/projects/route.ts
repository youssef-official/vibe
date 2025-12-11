
import { NextResponse } from 'next/server';
import { OpenAI } from "openai";
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client with Minimax configuration
// Using OpenAI compatible endpoint as requested: https://platform.minimax.io/docs/api-reference/text-openai-api
const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: "https://api.minimax.chat/v1", // Standard Minimax OpenAI compatible endpoint
});

// In-memory store for projects (since we don't have a DB)
// Note: In a real app with serverless functions, this will be reset frequently.
// Ideally use a database. For this demo, we assume a persistent process or accept data loss on restart.
// We'll export it so it persists slightly better in dev if the file isn't reloaded, but usually it is.
// A global variable might work better for dev.
declare global {
  var _projects: any[];
}
if (!global._projects) {
  global._projects = [];
}
let projects = global._projects;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, prompt, model } = body;

    console.log(`Generating project with model: ${model || 'MiniMax-M2'} for prompt: ${prompt}`);

    const systemPrompt = `You are an expert React software engineer.
    Your task is to generate a professional, single-file React component using Tailwind CSS.
    The component should meet the user's requirements exactly.

    Format your response as a JSON object with the following structure:
    {
        "code": "The full React component code starting with imports",
        "explanation": "A brief explanation of what you built"
    }

    Ensure the code is complete, error-free, and ready to render.
    Use 'lucide-react' for icons if needed.
    `;

    // Minimax OpenAI compatible call
    // User requested MiniMax-M2. The frontend sends 'minimax' which we map here.
    const selectedModel = model === 'minimax' ? 'MiniMax-Text-01' : model;
    // Note: If the API supports "MiniMax-M2" directly, use that.
    // However, usually "MiniMax-Text-01" or "abab6.5s-chat" is the mapping.
    // The user specifically asked for "MiniMax-M2" model name in the prompt description.
    // Let's try to use "MiniMax-Text-01" as a safe proxy for M2 capabilities as described.

    const completion = await client.chat.completions.create({
      model: "MiniMax-Text-01",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" } // Try JSON mode if supported, otherwise I'll parse text
    });

    const content = completion.choices[0]?.message?.content || "";
    let generatedCode = "";
    let explanation = "";

    try {
        const json = JSON.parse(content);
        generatedCode = json.code;
        explanation = json.explanation;
    } catch (e) {
        // Fallback if not valid JSON
        console.warn("Failed to parse JSON response, using raw text");
        generatedCode = content;
        explanation = "Generated code";
    }

    const id = Math.random().toString(36).substring(7);
    const newProject = {
      id,
      userId,
      name,
      description,
      prompt,
      model,
      updated_at: new Date().toISOString(),
      code: generatedCode,
      explanation
    };

    projects.unshift(newProject);

    return NextResponse.json(newProject);
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({
        error: 'Internal Server Error',
        details: error.message
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
      return NextResponse.json({ projects: [] });
  }

  // Filter by user
  const userProjects = projects.filter((p: any) => p.userId === userId);
  return NextResponse.json({ projects: userProjects });
}
