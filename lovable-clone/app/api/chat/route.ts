
import { OpenAI } from "openai";

// Using MiniMax API with OpenAI compatibility
const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY || "dummy-key-for-build", // Fallback for build time if env is missing
  baseURL: "https://api.minimax.io/v1",
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response("Prompt is required", { status: 400 });
    }

    console.log("Sending request to MiniMax with prompt:", prompt);

    const completion = await client.chat.completions.create({
      model: "MiniMax-M2", // Using MiniMax-M2 as requested
      messages: [
        {
            role: "system",
            content: `You are an expert software engineer.
            You must reply with a streaming response that describes your actions.
            Format your response as a series of actions.
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
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error calling MiniMax:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
