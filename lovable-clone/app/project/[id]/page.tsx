
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Code, Eye, Sparkles, Copy, Check, FileCode, FolderOpen, Send, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import Preview from '@/components/Preview';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ProjectPage() {
  const params = useParams();
  const id = params?.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview'); // Default to preview
  const [copied, setCopied] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const found = data.projects.find((p: any) => p.id === id);
          if (found) {
            setProject(found);
            // Initialize chat with the initial prompt and code
            setMessages([
                { role: 'user', content: found.prompt },
                { role: 'assistant', content: found.explanation || 'I have generated the initial component for you.' }
            ]);
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = () => {
    if (project?.code) {
      navigator.clipboard.writeText(project.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    try {
        const res = await fetch('/api/projects/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: id,
                message: userMsg,
                currentCode: project.code,
                history: messages
            })
        });

        if (!res.ok) {
            throw new Error('Failed to update project');
        }

        const data = await res.json();

        // Update project code
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProject((prev: any) => ({ ...prev, code: data.code }));

        // Add assistant response
        setMessages(prev => [...prev, { role: 'assistant', content: data.explanation }]);

    } catch (error) {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error updating the code.' }]);
    } finally {
        setIsChatting(false);
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
    <div className="h-screen bg-[#050505] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-semibold text-sm truncate max-w-[200px]">{project.name}</h1>
            <p className="text-[10px] text-white/40">Minimax M2</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'code'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Code
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-xs font-medium text-white/80"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors">
            Deploy
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar: File Explorer & Chat */}
        <div className="w-80 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
            {/* File Explorer */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-2 text-white/60 mb-3 text-xs uppercase tracking-wider font-semibold">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Files
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded text-sm text-blue-400 font-medium cursor-default">
                        <FileCode className="w-4 h-4" />
                        App.tsx
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded text-sm text-white/40 cursor-default">
                        <FileCode className="w-4 h-4" />
                        globals.css
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-sm ${
                                msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-white/10 text-white/90 rounded-tl-sm'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isChatting && (
                        <div className="flex items-center gap-2 text-white/40 text-xs">
                            <Sparkles className="w-3 h-3 animate-spin" />
                            AI is coding...
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-3 border-t border-white/10">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask to change something..."
                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-white/20"
                            disabled={isChatting}
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || isChatting}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white disabled:opacity-50 transition-colors"
                        >
                            {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>

        {/* Right Area: Preview/Code */}
        <div className="flex-1 bg-[#1e1e1e] relative overflow-hidden">
            {activeTab === 'preview' ? (
                <div className="absolute inset-0 p-4">
                    <Preview code={project.code} />
                </div>
            ) : (
                <div className="absolute inset-0 overflow-auto custom-scrollbar p-6">
                    <pre className="font-mono text-sm text-white/80 leading-relaxed">
                        <code>{project.code}</code>
                    </pre>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
