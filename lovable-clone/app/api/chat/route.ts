
import { OpenAI } from "openai";

// NOTE: This uses the MiniMax API via a compatible OpenAI client.
// The user provided snippet suggests using `openai` package directly.
// We need the API Key and Base URL.
// Assuming the user will provide the API key in the environment variable MINIMAX_API_KEY.
// And the base URL might be https://api.minimax.chat/v1 or https://api.minimax.io/v1
// Based on the user's provided python snippet, it looks like a standard OpenAI client instantiation.
// If it's a standard instantiation `client = OpenAI()`, it expects OPENAI_API_KEY.
// But the model is "MiniMax-M2". This implies the user might have a proxy or the MiniMax API is OpenAI compatible and they set the base URL.
// I will assume I need to configure the base URL to MiniMax's endpoint.
// For now, I will use a placeholder or try to infer from common practices.
// Search results mentioned https://api.minimax.chat/v1

const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY || "dummy-key",
  baseURL: "https://api.minimax.chat/v1",
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response("Prompt is required", { status: 400 });
    }

    const stream = await client.chat.completions.create({
      model: "MiniMax-M2",
      messages: [
        { role: "system", content: "You are an expert full-stack developer. You build React applications using Next.js and Tailwind CSS. You are helpful and precise." },
        { role: "user", content: prompt },
      ],
      stream: true,
      // @ts-ignore - OpenAI Node SDK might not have this typed yet
      // The OpenAI SDK does not support extra_body for create parameters in the types, but it is passed through in the underlying request in some versions or via explicit cast.
      // However, to be safe and type-compliant, we can cast the input.
    } as any) as unknown as AsyncIterable<any>;

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error calling MiniMax:", error);
    return new Response(JSON.stringify({ error: "Failed to generate response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
