
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Send, Loader2, Download } from 'lucide-react';
import { useParams } from 'next/navigation';
import JSZip from 'jszip';
import SandpackClient from '@/components/SandpackClient';

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

            // If the project files are empty, start generation automatically
            const hasFiles = found.files && Object.keys(found.files).length > 0;
            if (!hasFiles && found.explanation === "Generating...") {
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

        let generatedFiles = {};
        let explanation = "";

        let cleaned = fullText.replace(/<think>[\s\S]*?<\/think>/g, '');
        cleaned = cleaned.replace(/^```json\s*/g, '').replace(/```$/g, '');
        cleaned = cleaned.replace(/^```\s*/g, '').replace(/```$/g, '');
        cleaned = cleaned.trim();

        try {
            const json = JSON.parse(cleaned);
            generatedFiles = json.files || {};
            explanation = json.explanation;
        } catch {
             // Fallback to single file if parsing fails
             generatedFiles = { "App.tsx": cleaned };
             explanation = "Generated code.";
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProject((prev: any) => ({ ...prev, files: generatedFiles, explanation }));
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
      }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDownload = async () => {
    if (!project?.files) return;
    setDownloading(true);

    try {
        const zip = new JSZip();

        Object.entries(project.files).forEach(([filename, content]) => {
            zip.file(filename, content as string);
        });

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
                // Send file context
                currentFiles: project.files,
                history: messages
            })
        });

        if (!res.ok) {
            throw new Error('Failed to update project');
        }

        const data = await res.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProject((prev: any) => ({ ...prev, files: data.files || prev.files }));

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

        <div className="flex items-center gap-3">
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
                        {msg.role === 'user' ? (
                            <div className="max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm bg-blue-600/90 text-white rounded-tr-sm backdrop-blur-sm">
                                {msg.content}
                            </div>
                        ) : (
                            <div className="max-w-[90%] py-2 text-sm leading-relaxed text-white/80 font-medium">
                                {msg.content}
                            </div>
                        )}
                    </div>
                ))}
                {isChatting && (
                    <div className="flex items-center gap-2 text-white/40 text-xs pl-2 animate-pulse">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        Thinking...
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
                        disabled={isChatting}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!chatInput.trim() || isChatting}
                        className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white disabled:opacity-50 disabled:bg-transparent transition-all shadow-lg hover:shadow-blue-500/20"
                    >
                        {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>

        {/* Right Area: Sandpack (Preview + Code + Files) */}
        <div className="flex-1 bg-[#0f0f0f] relative overflow-hidden flex flex-col">
            <SandpackClient files={project.files || {}} />
        </div>

      </div>
    </div>
  );
}
