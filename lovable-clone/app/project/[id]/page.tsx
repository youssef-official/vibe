
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import JSZip from 'jszip';
import DaytonaPreview from '@/components/DaytonaPreview';
import CodeEditor from '@/components/CodeEditor'; // We will create this component for code viewing
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserButton } from '@/components/UserButton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Send,
  Download,
  ArrowLeft,
  Code2,
  Eye,
  Sparkles,
  FileCode,
  CheckCircle2
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
}

interface ProjectData {
  id: string;
  name: string;
  prompt: string;
  files: Record<string, string>;
  explanation?: string;
  model?: string;
}

interface GenerationState {
  isGenerating: boolean;
  status: string;
  currentFile?: string;
  processedFiles: string[];
}

export default function ProjectPage() {
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // Chat & Generation State
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    status: '',
    processedFiles: []
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const found = await res.json();
          if (found) {
            setProject(found);

            // Check if we need to start initial generation
            const hasFiles = found.files && Object.keys(found.files).length > 0;
            if (!hasFiles) {
                setMessages([
                    { role: 'user', content: found.prompt },
                    { role: 'assistant', content: 'Initializing project generation...' }
                ]);
                startStream('/api/projects/generate', {
                    prompt: found.prompt,
                    model: found.model
                });
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
    if (id) fetchProject();
  }, [id]);

  const startStream = async (endpoint: string, body: { prompt: string; model?: string; projectId?: string; message?: string; currentFiles?: Record<string, string>; history?: Message[] }) => {
    setGenState({
        isGenerating: true,
        status: 'Starting...',
        processedFiles: []
    });

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.body) throw new Error("No stream body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let currentExplanation = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Parse XML-like tags incrementally
            // We look for complete <file path="...">...</file> blocks
            // And <explanation>...</explanation> blocks

            // 1. Check for explanation
            const explanationMatch = buffer.match(/<explanation>([\s\S]*?)<\/explanation>/);
            if (explanationMatch) {
                currentExplanation = explanationMatch[1].trim();
                // Update the last assistant message with the explanation
                setMessages(prev => {
                    const newHistory = [...prev];
                    const lastMsg = newHistory[newHistory.length - 1];
                    if (lastMsg.role === 'assistant') {
                        lastMsg.content = currentExplanation.replace(/[#$]/g, '').trim();
                    } else {
                        newHistory.push({ role: 'assistant', content: currentExplanation });
                    }
                    return newHistory;
                });

                // Remove explanation from buffer
                const endIndex = explanationMatch.index! + explanationMatch[0].length;
                buffer = buffer.slice(endIndex);
            }

            // 2. Check for files
            // Regex to find all complete file blocks
            const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
            let match;
            let lastIndex = 0;

            while ((match = fileRegex.exec(buffer)) !== null) {
                const [, path, content] = match;

                // Update project files state
                setProject(prev => {
                    if (!prev) return null;
                    const newFiles = { ...prev.files, [path]: content.trim() };
                    return { ...prev, files: newFiles };
                });

                // Update generation state
                setGenState(prev => {
                    if (prev.processedFiles.includes(path)) return prev;
                    return {
                        ...prev,
                        status: `Generated ${path}`,
                        currentFile: undefined, // Finished this file
                        processedFiles: [...prev.processedFiles, path]
                    };
                });

                lastIndex = match.index + match[0].length;
            }

            // Remove processed files from buffer
            if (lastIndex > 0) {
                buffer = buffer.slice(lastIndex);
            }

            // 3. Check for current incomplete file (to show status)
            const partialFileMatch = buffer.match(/<file path="([^"]+)">/g);
            if (partialFileMatch) {
                const lastFilePathMatch = buffer.match(/<file path="([^"]+)">[^<]*$/); // Last open tag not closed
                if (lastFilePathMatch) {
                    setGenState(prev => ({
                        ...prev,
                        currentFile: lastFilePathMatch[1],
                        status: `Writing ${lastFilePathMatch[1]}...`
                    }));
                }
            }
        }

    } catch (err) {
        console.error("Stream error:", err);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error generating code.' }]);
    } finally {
        setGenState(prev => ({ ...prev, isGenerating: false, status: 'Complete', currentFile: undefined }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || genState.isGenerating) return;

    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Add temporary assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: 'Thinking...' }]);

    await startStream('/api/projects/chat', {
        projectId: id,
        prompt: userMsg,
        currentFiles: project?.files || {},
        history: messages
    });
  };

  const handleDownload = async () => {
    if (!project?.files) return;
    const zip = new JSZip();
    Object.entries(project.files).forEach(([filename, content]) => {
        zip.file(filename, content);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name || "project"}.zip`;
    a.click();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, genState.status]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#09090b] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (!project) return <div>Project not found</div>;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#09090b] text-white selection:bg-blue-500/30">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#09090b] px-4">
            <div className="flex items-center gap-4">
                <Link href="/" className="group rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                </Link>
                <div>
                    <h1 className="text-sm font-semibold text-white/90">{project.name}</h1>
                    <p className="text-[10px] text-white/40">Minimax M2</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg bg-[#18181b] p-1">
                    <button
                        onClick={() => setActiveTab('code')}
                        className={`rounded-md p-1.5 transition-all ${activeTab === 'code' ? 'bg-[#27272a] text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        <Code2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`rounded-md p-1.5 transition-all ${activeTab === 'preview' ? 'bg-[#27272a] text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 gap-2 border-white/10 bg-transparent text-white/80 hover:bg-white/5">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Export</span>
                </Button>
                <UserButton />
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Chat */}
            <div className="flex w-[400px] flex-col border-r border-white/10 bg-[#09090b]">
                {/* File Generation Status (Collapsible or floating) */}
                <AnimatePresence>
                    {genState.isGenerating && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-b border-white/10 bg-[#18181b]/50 px-4 py-3"
                        >
                            <div className="flex items-center gap-2 text-sm text-blue-400">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="font-medium">{genState.status}</span>
                            </div>
                            {genState.processedFiles.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {genState.processedFiles.map(f => (
                                        <span key={f} className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400">
                                            <CheckCircle2 className="h-3 w-3" />
                                            {f.split('/').pop()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="flex flex-col gap-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-white text-black' : 'bg-blue-600 text-white'}`}>
                                    {msg.role === 'user' ? <div className="h-4 w-4 rounded-full bg-black" /> : <Sparkles className="h-4 w-4" />}
                                </div>
                                <div className={`flex max-w-[85%] flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'bg-[#18181b] border border-white/10 text-white/90'
                                    }`}>
                                        {msg.content}
                                    </div>
                                    {msg.files && (
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            {msg.files.map(f => (
                                                <div key={f} className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#18181b] px-2 py-1 text-xs text-white/60">
                                                    <FileCode className="h-3 w-3" />
                                                    {f}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Input */}
                <div className="border-t border-white/10 bg-[#09090b] p-4">
                    <form onSubmit={handleSendMessage} className="relative">
                        <Textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder="Ask follow-up questions or request changes..."
                          className="min-h-[50px] w-full resize-none rounded-xl border-white/10 bg-[#18181b] p-4 pr-12 text-sm text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 transition-all duration-300"
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || genState.isGenerating}
                            className="absolute bottom-3 right-3 rounded-lg bg-blue-600 p-2 text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600"
                        >
                            {genState.isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Area: Sandpack */}
            <div className={`flex-1 flex flex-col overflow-hidden{/* Right Area: Code/Preview */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f] relative">
                {/* The image shows a full-screen preview area, with the chat on the left.
                    The header has tabs for 'code' and 'preview'.
                    We will use the full right area for either the code editor or the Daytona preview.
                */}
                {activeTab === 'preview' && (
                    <DaytonaPreview files={project?.files || {}} />
                )}
                {activeTab === 'code' && (
                    <CodeEditor files={project?.files || {}} />
                )}
            </div>ode/Preview).

                   I'll pass the files to SandpackClient.
                */}
                <SandpackClient files={project?.files || {}} viewMode={activeTab === 'code' ? 'code' : 'preview'} />
            </div>
        </div>
    </div>
  );
}
