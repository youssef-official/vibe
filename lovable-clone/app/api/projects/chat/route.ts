
import { OpenAI } from "openai";
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const client = new OpenAI({
      apiKey: process.env.MINIMAX_API_KEY,
      baseURL: "https://api.minimax.io/v1",
    });

    const body = await req.json();
    const { message, currentFiles, history } = body;

    console.log(`Refining code for user message: ${message}`);

    const systemPrompt = `You are an expert React software engineer named "Lovable".
    The user wants to modify an existing React project.

    Current Files:
    ${JSON.stringify(currentFiles, null, 2)}

    Your task is to update the files based on the user's request.

    CRITICAL OUTPUT FORMAT RULES:
    1. You MUST use specific XML tags to output files.
    2. Format: <file path="filename">content</file>
    3. Return the FULL content of any file you modify.
    4. You can add an <explanation> tag for your message.
    5. DO NOT use markdown code blocks.
6. Your explanation MUST be clean, conversational, and MUST NOT contain any special characters like #$ or similar formatting.

    Example Output:
    <explanation>I added a button to the header.</explanation>
    <file path="components/Header.tsx">
    // Full content of Header.tsx
    </file>

    GUIDELINES:
    - Only output files that need to be changed or created.
    - Be conversational in the explanation.
    `;

    // Construct conversation history for context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentHistory = history.slice(-6).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
    }));

    // Create a streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
            const completion = await client.chat.completions.create({
              model: "MiniMax-M2",
              messages: [
                { role: "system", content: systemPrompt },
                ...recentHistory,
                { role: "user", content: message }
              ],
              temperature: 0.5,
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
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
