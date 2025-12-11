
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
    const { message, currentCode, history } = body;

    console.log(`Refining code for user message: ${message}`);

    const systemPrompt = `You are an expert React software engineer.
    The user wants to modify an existing React component.

    Current Code:
    ${currentCode}

    Your task is to update the code based on the user's request.
    Maintain the single-file structure and Tailwind CSS styling.

    Format your response as a JSON object:
    {
        "code": "The updated full React component code",
        "explanation": "Brief explanation of changes"
    }

    Return ONLY the JSON. Ensure the code is complete and runnable.
    `;

    // Construct conversation history for context
    // We limit history to avoid token limits, but for M2 it should be fine.
    // We'll take the last few messages.
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
      temperature: 0.5, // Lower temp for code modification
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || "";
    const cleanedContent = cleanResponse(content);

    let generatedCode = currentCode;
    let explanation = "Updated code.";

    try {
        const json = JSON.parse(cleanedContent);
        generatedCode = json.code;
        explanation = json.explanation;
    } catch {
        console.warn("Failed to parse JSON response in chat, trying raw");
        // If it looks like code, assume it's just code
        if (cleanedContent.includes('export default function') || cleanedContent.includes('import React')) {
            generatedCode = cleanedContent;
            explanation = "Here is the updated code.";
        }
    }

    return NextResponse.json({
        code: generatedCode,
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
