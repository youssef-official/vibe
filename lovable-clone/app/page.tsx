'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { UserButton } from '@/components/UserButton';
import { Sparkles, ArrowRight, Grid2X2, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ModelSelector } from '@/components/ModelSelector';

function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [promptInput, setPromptInput] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'minimax' | 'openrouter'>('minimax');

  // Check for default model on mount
  useEffect(() => {
    const savedModel = localStorage.getItem('preferred_model');
    if (!savedModel) {
      setShowModelSelector(true);
    } else {
      setSelectedModel(savedModel as 'minimax' | 'openrouter');
    }
  }, []);

  const handleModelSelect = (model: 'minimax' | 'openrouter') => {
    localStorage.setItem('preferred_model', model);
    setSelectedModel(model);
    setShowModelSelector(false);
  };

  // Fetch user projects
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setProjectsLoading(false);
      return;
    }

    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects?limit=6&sortBy=updated_at&sortOrder=DESC');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setProjectsLoading(false);
      }
    }

    fetchProjects();
  }, [isLoaded, isSignedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || submitting) return;

    if (!isSignedIn) {
        // Trigger Clerk sign in
        const signInBtn = document.querySelector('.cl-signInButton') as HTMLElement;
        if(signInBtn) signInBtn.click();
        else alert('Please sign in to create a project');
        return;
    }

    setSubmitting(true);
    setLoading(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Generated from: "${promptInput.substring(0, 30)}..."`,
          description: promptInput,
          prompt: promptInput,
          code: '',
          model: selectedModel // Pass the selected model
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to create project');
      }

      const project = await res.json();
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      const message = error instanceof Error ? error.message : 'Failed to create project. Please try again.';
      alert(message);
      setSubmitting(false);
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return past.toLocaleDateString();
  };

  return (
    <div className="min-h-screen w-full overflow-hidden lovable-gradient relative">
      <ModelSelector isOpen={showModelSelector} onSelect={handleModelSelect} />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 gradient-blur-blue animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 gradient-blur-purple animate-float animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 gradient-blur-orange animate-float animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">🧡</span>
            </div>
            <span className="text-white font-semibold text-xl hidden sm:inline">Lovable</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <button className="text-white/80 hover:text-white transition-colors text-sm font-medium">Solutions</button>
            <button className="text-white/80 hover:text-white transition-colors text-sm font-medium">Enterprise</button>
            <button className="text-white/80 hover:text-white transition-colors text-sm font-medium">Pricing</button>
            <button className="text-white/80 hover:text-white transition-colors text-sm font-medium">Community</button>
          </nav>

          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32">
        <div className="max-w-4xl w-full text-center mb-12 animate-fade-in-up">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-white/10 mb-8 cursor-pointer hover:bg-[#252525] transition-colors">
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold tracking-wide uppercase">New</span>
              <span className="text-white/90 text-sm font-medium">Themes & Visual edits</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/50" />
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-8 tracking-tight">
              Build something <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">🧡</span> Lovable
            </h1>

            <p className="text-xl text-white/60 mb-16 font-medium">
              Create apps and websites by chatting with AI
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full"
          >
            <form onSubmit={handleSubmit}>
              <div className="relative w-full max-w-[800px] mx-auto">
                <div className="glass-input rounded-[32px] p-4 transition-all duration-300 focus-within:ring-1 focus-within:ring-white/10">
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Ask Lovable to create a landing page for my..."
                    className="w-full bg-transparent text-white placeholder-white/40 border-none outline-none resize-none text-lg min-h-[60px] px-2 font-light"
                    rows={2}
                    disabled={submitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />

                  <div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex items-center gap-2">
                      <button type="button" className="w-8 h-8 rounded-full bg-[#2A2A2A] hover:bg-[#333] flex items-center justify-center text-white/70 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      </button>
                      <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A2A2A] hover:bg-[#333] transition-colors text-white/90 text-sm font-medium">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        Attach
                      </button>
                      <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A2A2A] hover:bg-[#333] transition-colors text-white/90 text-sm font-medium">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        Theme
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button type="submit" disabled={!promptInput.trim() || submitting} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${promptInput.trim() && !submitting ? 'bg-white text-black hover:scale-105' : 'bg-[#2A2A2A] text-white/30 cursor-not-allowed'}`}>
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Projects Section */}
      {isSignedIn && (
        <section className="relative z-10 w-full px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="glass-dark rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                  {user?.firstName ? `${user.firstName}'s Lovable` : "Your Projects"}
                </h2>
              </div>

              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/60 mb-4">No projects yet</p>
                  <p className="text-white/40 text-sm">Start by creating your first project above!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/project/${project.id}`}
                      className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-4 transition-all duration-300 cursor-pointer"
                    >
                      <div className="w-full aspect-video bg-gray-800/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        <Grid2X2 className="w-12 h-12 text-white/20" />
                      </div>

                      <h3 className="text-white font-medium mb-1 truncate">
                        {project.name}
                      </h3>
                      <p className="text-white/60 text-sm mb-2 line-clamp-2">
                        {project.description || 'No description'}
                      </p>

                      <div className="flex items-center gap-2 text-white/40 text-xs">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(project.updated_at)}
                      </div>

                      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-orange-500/0 to-pink-600/0 group-hover:from-orange-500/10 group-hover:to-pink-600/10 transition-all duration-300 pointer-events-none" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center lovable-gradient">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}
