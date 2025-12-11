
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Code, Eye, Sparkles, Copy, Check, FileCode, Send, Loader2, RefreshCw, Download } from 'lucide-react';
import { useParams } from 'next/navigation';
import Preview from '@/components/Preview';
import JSZip from 'jszip';

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
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial fetch and generation
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

            // If the project code is empty, start generation automatically
            if (!found.code && found.explanation === "Generating...") {
                setMessages([
                    { role: 'user', content: found.prompt },
                    { role: 'assistant', content: 'Generating your project...' }
                ]);
                startGeneration(found);
            } else {
                 setMessages([
                    { role: 'user', content: found.prompt },
                    { role: 'assistant', content: found.explanation || 'Project ready.' }
                ]);
            }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startGeneration = async (projectData: any) => {
      setGenerating(true);
      try {
        const response = await fetch('/api/projects/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: projectData.prompt,
                model: projectData.model
            })
        });

        if (!response.body) throw new Error("No stream body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            fullText += text;
        }

        let generatedCode = "";
        let explanation = "";

        let cleaned = fullText.replace(/<think>[\s\S]*?<\/think>/g, '');
        cleaned = cleaned.replace(/^```json\s*/g, '').replace(/```$/g, '');
        cleaned = cleaned.replace(/^```\s*/g, '').replace(/```$/g, '');
        cleaned = cleaned.trim();

        try {
            const json = JSON.parse(cleaned);
            generatedCode = json.code;
            explanation = json.explanation;
        } catch {
             generatedCode = cleaned;
             explanation = "Generated code.";
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProject((prev: any) => ({ ...prev, code: generatedCode, explanation }));
        setMessages(prev => {
            const newHistory = [...prev];
            if (newHistory[newHistory.length - 1].role === 'assistant') {
                newHistory[newHistory.length - 1].content = explanation;
            }
            return newHistory;
        });

      } catch (err) {
          console.error("Generation error:", err);
          setMessages(prev => [...prev, { role: 'assistant', content: 'Error generating code.' }]);
      } finally {
          setGenerating(false);
      }
  };

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

  const handleDownload = async () => {
    if (!project?.code) return;
    setDownloading(true);

    try {
        const zip = new JSZip();

        // Add App.tsx
        zip.file("src/App.tsx", project.code);

        // Add package.json
        zip.file("package.json", JSON.stringify({
            name: project.name || "lovable-project",
            version: "0.1.0",
            private: true,
            dependencies: {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "lucide-react": "latest",
                "framer-motion": "latest",
                "clsx": "latest",
                "tailwind-merge": "latest"
            }
        }, null, 2));

        // Add index.html
        zip.file("index.html", `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);

        // Add main.tsx
        zip.file("src/main.tsx", `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`);

        const blob = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project.name || "project"}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (e) {
        console.error("Download failed", e);
    } finally {
        setDownloading(false);
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProject((prev: any) => ({ ...prev, code: data.code }));

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
    <div className="h-screen bg-[#000000] text-white flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#0a0a0a]/50 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
          <div>
            <h1 className="font-semibold text-sm truncate max-w-[200px] text-white/90">{project.name}</h1>
            <p className="text-[10px] text-white/40">Minimax M2</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              activeTab === 'preview'
                ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/5'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              activeTab === 'code'
                ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/5'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Code
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-xs font-medium text-white/70 hover:text-white"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar: Chat */}
        <div className="w-96 border-r border-white/10 flex flex-col bg-[#050505]/80 backdrop-blur-xl">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                        <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user'
                                ? 'bg-blue-600/90 text-white rounded-tr-sm backdrop-blur-sm'
                                : 'bg-white/5 text-white/90 rounded-tl-sm border border-white/5'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {(isChatting || generating) && (
                    <div className="flex items-center gap-2 text-white/40 text-xs pl-2 animate-pulse">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        {generating ? 'Generating initial code...' : 'Refining code...'}
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/5 bg-[#0a0a0a]/50">
                <form onSubmit={handleSendMessage} className="relative group">
                    <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Describe changes or ask questions..."
                        className="w-full bg-[#111] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none min-h-[80px]"
                        rows={3}
                        disabled={isChatting || generating}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!chatInput.trim() || isChatting || generating}
                        className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white disabled:opacity-50 disabled:bg-transparent transition-all shadow-lg hover:shadow-blue-500/20"
                    >
                        {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>

        {/* Right Area: Preview/Code */}
        <div className="flex-1 bg-[#0f0f0f] relative overflow-hidden flex flex-col">
            {activeTab === 'preview' ? (
                <div className="flex-1 flex flex-col h-full relative">
                    {/* Preview Toolbar */}
                    <div className="h-10 border-b border-white/5 bg-[#111] flex items-center justify-between px-4">
                        <div className="flex items-center gap-2 text-xs text-white/40">
                             <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                             <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                             <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
                             <span className="ml-2">Preview Mode</span>
                        </div>
                        <button
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onClick={() => setProject((p: any) => ({ ...p }))} // Force re-render preview? Preview updates on code prop change.
                            className="text-white/40 hover:text-white transition-colors p-1"
                            title="Refresh Preview"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="flex-1 relative bg-[#1e1e1e]">
                         <Preview code={project.code} />
                    </div>
                </div>
            ) : (
                <div className="flex h-full">
                    {/* File Explorer */}
                    <div className="w-56 border-r border-white/5 bg-[#111] flex flex-col">
                        <div className="p-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            Explorer
                        </div>
                        <div className="flex-1 overflow-auto px-2">
                             <div className="mb-4">
                                <div className="flex items-center gap-1 text-white/60 mb-1 px-2">
                                    <span className="text-[10px]">SRC</span>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-md cursor-pointer border-l-2 border-blue-500">
                                        <FileCode className="w-4 h-4" />
                                        <span className="text-sm font-medium">App.tsx</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 text-white/40 hover:bg-white/5 rounded-md cursor-pointer border-l-2 border-transparent transition-colors">
                                        <FileCode className="w-4 h-4" />
                                        <span className="text-sm">main.tsx</span>
                                    </div>
                                </div>
                             </div>
                             <div>
                                <div className="flex items-center gap-1 text-white/60 mb-1 px-2">
                                    <span className="text-[10px]">CONFIG</span>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 px-3 py-2 text-white/40 hover:bg-white/5 rounded-md cursor-pointer border-l-2 border-transparent transition-colors">
                                        <FileCode className="w-4 h-4" />
                                        <span className="text-sm">package.json</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 text-white/40 hover:bg-white/5 rounded-md cursor-pointer border-l-2 border-transparent transition-colors">
                                        <FileCode className="w-4 h-4" />
                                        <span className="text-sm">tailwind.config.js</span>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Code Editor View */}
                    <div className="flex-1 flex flex-col bg-[#0d0d0d]">
                        <div className="h-10 border-b border-white/5 bg-[#111] flex items-center px-4">
                            <span className="text-xs text-white/40">App.tsx</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-6">
                            <pre className="font-mono text-sm leading-relaxed">
                                {/* Simple syntax highlighting logic using spans could go here,
                                    but for now we stick to clean styling. */}
                                <code className="text-blue-300">{project.code || "// Generating code..."}</code>
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
