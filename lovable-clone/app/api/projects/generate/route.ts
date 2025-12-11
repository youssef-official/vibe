
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
              stream: true, // STREAMING
            });

            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    // We can optionally stream the raw content, but since we need to parse JSON,
                    // we might need to buffer or send partial updates.
                    // However, standard "streaming" usually just sends text chunks.
                    // The client can try to display "Thinking..." or accumulate.
                    // For now, let's stream the raw chunks so the client shows *something* happening.
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
