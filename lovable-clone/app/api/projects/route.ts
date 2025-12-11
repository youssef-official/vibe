
import { NextResponse } from 'next/server';
import { OpenAI } from "openai";
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client with Minimax configuration
// Using OpenAI compatible endpoint: https://api.minimax.io/v1
// Note: Some users might need https://api.minimaxi.com/v1 (CN) or https://api.minimax.chat/v1
// The most standard for international use is api.minimax.io
const client = new OpenAI({
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
const projects = global._projects;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, prompt, model } = body;

    // Map 'minimax' or 'MiniMax-M2' to the actual model ID
    // Based on docs: "MiniMax-M2" is the model ID for the M2 model via OpenAI SDK.
    const selectedModel = (model === 'minimax' || !model) ? 'MiniMax-M2' : model;

    console.log(`Generating project with model: ${selectedModel} for prompt: ${prompt}`);

    if (!process.env.MINIMAX_API_KEY) {
        throw new Error("MINIMAX_API_KEY is missing in environment variables.");
    }

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
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content || "";
        let generatedCode = "";
        let explanation = "";

        try {
            const json = JSON.parse(content);
            generatedCode = json.code;
            explanation = json.explanation;
        } catch {
            console.warn("Failed to parse JSON response, using raw text");
            generatedCode = content;
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
        console.error('Minimax API Error:', apiError);
        // Return the specific API error to the client for debugging
        return NextResponse.json({
            error: 'AI Generation Failed',
            details: apiError.message || 'Unknown error from Minimax API',
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
