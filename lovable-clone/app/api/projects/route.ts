
import { NextResponse } from 'next/server';
import { OpenAI } from "openai";
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client with Minimax configuration as default
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

function cleanResponse(content: string) {
    let cleaned = content;

    // Remove <think>...</think> blocks (including newlines)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');

    // Remove Markdown code fences if present (e.g. ```json ... ```)
    cleaned = cleaned.replace(/^```json\s*/g, '').replace(/```$/g, '');

    // Also remove generic code fences
    cleaned = cleaned.replace(/^```\s*/g, '').replace(/```$/g, '');

    return cleaned.trim();
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, prompt, model } = body;

    // Determine client and model
    let client = minimaxClient;
    let selectedModel = 'MiniMax-M2';

    if (model === 'openrouter') {
        if (!openRouterClient) {
            return NextResponse.json({ error: "OpenRouter is not configured" }, { status: 400 });
        }
        client = openRouterClient;
        // Default OpenRouter model or pass specific one
        selectedModel = 'anthropic/claude-3-opus'; // Example default, or let user pick
    } else {
        selectedModel = (model === 'minimax' || !model) ? 'MiniMax-M2' : model;
    }

    console.log(`Generating project with model: ${selectedModel} for prompt: ${prompt}`);

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

    try {
        const completion = await client.chat.completions.create({
          model: selectedModel,
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
          max_tokens: 4000,
        });

        const content = completion.choices[0]?.message?.content || "";
        let generatedCode = "";
        let explanation = "";

        // Clean the content before parsing
        const cleanedContent = cleanResponse(content);

        try {
            const json = JSON.parse(cleanedContent);
            generatedCode = json.code;
            explanation = json.explanation;
        } catch {
            console.warn("Failed to parse JSON response, using raw text fallback");
            generatedCode = cleanedContent;
            explanation = "Generated code (parsing failed)";
        }

        const id = Math.random().toString(36).substring(7);
        const newProject = {
          id,
          userId,
          name,
          description,
          prompt,
          model: selectedModel,
          updated_at: new Date().toISOString(),
          code: generatedCode,
          explanation
        };

        projects.unshift(newProject);

        return NextResponse.json(newProject);

    } catch (apiError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error('API Error:', apiError);
        return NextResponse.json({
            error: 'AI Generation Failed',
            details: apiError.message || 'Unknown error',
            code: apiError.status || 500
        }, { status: apiError.status || 500 });
    }

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
