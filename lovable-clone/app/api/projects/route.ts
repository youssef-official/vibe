
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client with Minimax configuration
const client = new Anthropic({
  apiKey: process.env.MINIMAX_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: "https://api.minimax.io/anthropic",
});

// In-memory store for projects (since we don't have a DB)
let projects: any[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, prompt, model } = body;

    // Use Minimax M2 to generate code
    // The user wants "generation ready".
    // We will generate the code here and save it to the project.

    console.log(`Generating project with model: ${model || 'MiniMax-M2'} for prompt: ${prompt}`);

    const systemPrompt = `You are an expert software engineer.
    Generate a single-file React component using Tailwind CSS that implements the user's request.
    Do not include any explanation, just the code.
    Start with 'import React from "react";'.
    `;

    const msg = await client.messages.create({
      model: "MiniMax-M2", // Using MiniMax-M2 as requested
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    let code = "";
    if (msg.content && msg.content.length > 0) {
        // Find the text block
        const textBlock = msg.content.find(c => c.type === 'text');
        if (textBlock && textBlock.type === 'text') {
            code = textBlock.text;
        }
    }

    const id = Math.random().toString(36).substring(7);
    const newProject = {
      id,
      name,
      description,
      prompt,
      model,
      updated_at: new Date().toISOString(),
      code: code
    };

    projects.unshift(newProject); // Add to beginning

    return NextResponse.json(newProject);
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({
        error: 'Internal Server Error',
        details: error.message
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Return list of projects
  return NextResponse.json({ projects });
}
