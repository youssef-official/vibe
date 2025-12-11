
import { NextResponse } from 'next/server';
import { OpenAI } from "openai";
import { auth } from '@clerk/nextjs/server';

const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: "https://api.minimax.io/v1",
});

function cleanResponse(content: string) {
    let cleaned = content;
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
    cleaned = cleaned.replace(/^```json\s*/g, '').replace(/```$/g, '');
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
    const { message, currentFiles, history } = body;

    console.log(`Refining code for user message: ${message}`);

    const systemPrompt = `You are an expert React software engineer named "Lovable".
    The user wants to modify an existing React project.

    Current Files:
    ${JSON.stringify(currentFiles, null, 2)}

    Your task is to update the files based on the user's request.

    Format your response as a JSON object:
    {
        "files": {
            "App.tsx": "...",
            "components/NewComponent.tsx": "..."
        },
        "explanation": "A friendly, conversational message explaining what you changed. Be helpful and enthusiastic."
    }

    CRITICAL:
    1. Return the FULL content of any file you modify.
    2. Return ONLY the JSON object.
    3. Do not assume single-file structure anymore.
    `;

    // Construct conversation history for context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentHistory = history.slice(-6).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
    }));

    const completion = await client.chat.completions.create({
      model: "MiniMax-M2",
      messages: [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: message }
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "";
    const cleanedContent = cleanResponse(content);

    let generatedFiles = currentFiles;
    let explanation = "Updated code.";

    try {
        const json = JSON.parse(cleanedContent);
        // Merge new files with existing files
        generatedFiles = { ...currentFiles, ...json.files };
        explanation = json.explanation;
    } catch {
        console.warn("Failed to parse JSON response in chat");
        explanation = "I made the changes, but there was an error parsing the response.";
    }

    return NextResponse.json({
        files: generatedFiles,
        explanation
    });

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('Chat API Error:', error);
    return NextResponse.json({
        error: 'Internal Server Error',
        details: error.message
    }, { status: 500 });
  }
}
