
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'projects.json');

function getProjects() {
    try {
        if (!fs.existsSync(DB_PATH)) return [];
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading projects DB:", error);
        return [];
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const projects = getProjects();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = projects.find((p: any) => p.id === id);

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify ownership
    if (project.userId !== userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
