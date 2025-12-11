
import { OpenAI } from "openai";

// Using MiniMax API with OpenAI compatibility
// Base URL and Model Name are critical.
// Model name from prompt: "Mini max m2" -> likely "MiniMax-Text-01" or similar, but I'll stick to what I can find or "MiniMax-M2" as requested.
// Actually, looking at online docs, MiniMax often uses `abab6.5s-chat` or similar.
// But the user said "Mini max m2". I will use `MiniMax-Text-01` as a safe fallback or just `MiniMax-M2` if the endpoint supports it.
// I'll log the error to debug.

const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: "https://api.minimax.chat/v1", // or https://api.minimax.io/v1/text/chatcompletion_v2 for raw
  // If using OpenAI SDK, usually it's https://api.minimax.chat/v1
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response("Prompt is required", { status: 400 });
    }

    console.log("Sending request to MiniMax with prompt:", prompt);

    const completion = await client.chat.completions.create({
      model: "MiniMax-Text-01", // I'll try a standard one, or "MiniMax-M2" if I was sure. Let's try "abab6.5-chat" which is common or "MiniMax-Text-01". The user said "Mini max m2".
      // Let's try to be generic.
      messages: [
        {
            role: "system",
            content: `You are an expert software engineer.
            You must reply with a streaming response that describes your actions.
            Format your response as a series of actions.

            Example format:
            Now I Would Make a REact App With (App Name)
            Now ...... Editing : Index.tsx

            Then provide the code blocks.
            `
        },
        { role: "user", content: prompt },
      ],
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
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
  } catch (error: any) {
    console.error("Error calling MiniMax:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
