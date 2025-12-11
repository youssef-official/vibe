
import { OpenAI } from "openai";
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI clients
const minimaxClient = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: "https://api.minimax.io/v1",
});

const openRouterClient = process.env.OPENROUTER_API_KEY ? new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
}) : null;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { prompt, model } = body;

    // Determine client and model
    let client = minimaxClient;
    let selectedModel = 'MiniMax-M2';

    if (model === 'openrouter' && openRouterClient) {
        client = openRouterClient;
        selectedModel = 'anthropic/claude-3-opus';
    } else {
        selectedModel = (model === 'minimax' || !model) ? 'MiniMax-M2' : model;
    }

    const systemPrompt = `You are an expert React software engineer named "Lovable".
    Your task is to generate a professional React application using Tailwind CSS.

    You must output a JSON object containing the files for the project.
    Do NOT just output a single file unless requested.

    Format:
    {
        "files": {
            "App.tsx": "...",
            "components/Header.tsx": "...",
            "styles.css": "..."
        },
        "explanation": "Brief summary of what you built."
    }

    CRITICAL:
    1. The entry point is usually 'App.tsx'.
    2. Use 'lucide-react' for icons.
    3. Ensure code is complete and production-ready.
    4. Do NOT use markdown code fences in the JSON values.
    5. Return ONLY the JSON object.
    `;

    // Create a streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
            const completion = await client.chat.completions.create({
              model: selectedModel,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 4000,
              stream: true,
            });

            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    controller.enqueue(encoder.encode(content));
                }
            }
        } catch (err) {
            console.error("Streaming error:", err);
            controller.error(err);
        } finally {
            controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('Generation Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
