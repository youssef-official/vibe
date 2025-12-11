
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Use global in-memory store
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var _projects: any[];
}
if (!global._projects) {
  global._projects = [];
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = global._projects.find((p: any) => p.id === id);

    if (!project) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error(`Project ${id} not found. Available IDs:`, global._projects.map((p: any) => p.id));
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
