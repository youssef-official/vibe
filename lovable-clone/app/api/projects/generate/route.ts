
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

    CRITICAL OUTPUT FORMAT RULES:
    1. You MUST use specific XML tags to output files.
    2. Format: <file path="filename">content</file>
    3. DO NOT use markdown code blocks (no \`\`\`xml or \`\`\`javascript).
    4. Provide a FULL, functional, and non-dummy implementation. DO NOT use placeholders like "TODO" or "Coming Soon".

    REQUIRED FILES:
    - App.tsx (Main component)
    - index.css (Tailwind directives)
    - components/Header.tsx (if applicable)
    - components/Hero.tsx (if applicable)
    - Other components as needed.

    Example Output:
    <file path="App.tsx">
    import React from 'react';
    export default function App() {
      return <div className="p-4">Hello</div>;
    }
    </file>
    <file path="index.css">
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    </file>

    GUIDELINES:
    - Use 'lucide-react' for icons.
    - Use Tailwind CSS for styling.
    - Ensure all imports are correct.
    - Be creative and make it look beautiful.
    - Return ONLY the XML stream.
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
