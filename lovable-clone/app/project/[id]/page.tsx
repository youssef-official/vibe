
'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Code, Eye, Sparkles, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

import { useParams } from 'next/navigation';

export default function ProjectPage() {
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('code');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
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

  const handleCopy = () => {
    if (project?.code) {
      navigator.clipboard.writeText(project.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center lovable-gradient">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center lovable-gradient text-white">
        <h1 className="text-2xl font-bold mb-4">Project not found</h1>
        <Link href="/" className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-sm">{project.name}</h1>
            <p className="text-xs text-white/40">Generated with {project.model || 'MiniMax M2'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'code'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Code className="w-4 h-4" />
            Code
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-xs font-medium text-white/80"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
          <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            Deploy
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'preview' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] p-8">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Preview Not Available</h3>
                <p className="text-white/40 text-sm mb-6">
                    Since this is a generated React component, it requires a live sandbox to render safely.
                    Please view the code and use it in your local environment.
                </p>
                <button
                    onClick={() => setActiveTab('code')}
                    className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
                >
                    View Code
                </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full overflow-auto bg-[#0d0d0d] custom-scrollbar">
            <div className="p-6">
                <pre className="font-mono text-sm text-white/80 leading-relaxed">
                    <code>
                        {project.code || "// No code generated"}
                    </code>
                </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
