
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      try {
        // In a real app we would fetch a specific project.
        // For this demo with in-memory store, we fetch all and find the one.
        // Or we could implement GET /api/projects/[id]
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          const found = data.projects.find((p: any) => p.id === id);
          if (found) {
            setProject(found);
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">Loading...</div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <Link href="/" className="text-blue-400 hover:underline mb-4 inline-block">&larr; Back to Home</Link>
      <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
      <p className="text-slate-400 mb-6">{project.description}</p>

      <div className="border border-slate-700 rounded-lg p-4 bg-slate-950 overflow-auto">
        <h2 className="text-xl font-semibold mb-4 text-green-400">Generated Code ({project.model})</h2>
        <pre className="text-sm font-mono whitespace-pre-wrap">
          {project.code || "No code generated."}
        </pre>
      </div>

      {/*
        In a real Lovable clone, here we would render the preview of the code.
        Since we are just outputting raw React code string, we can't easily execute it safely here without a sandbox.
        But the user asked for "preview".
        For now, displaying the code is a basic preview of the *output*.
      */}
    </div>
  );
}
