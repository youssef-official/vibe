
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import JSZip from 'jszip';
import SandpackPreview from '@/components/SandpackPreview';
import CodeEditor from '@/components/CodeEditor';
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
  CheckCircle2,
  Share2,
  Cloud,
  History,
  Mic,
  ArrowUp
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
  const [previewKey, setPreviewKey] = useState(0);

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

            const explanationMatch = buffer.match(/<explanation>([\s\S]*?)<\/explanation>/);
            if (explanationMatch) {
                currentExplanation = explanationMatch[1].trim();
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
                const endIndex = explanationMatch.index! + explanationMatch[0].length;
                buffer = buffer.slice(endIndex);
            }

            const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
            let match;
            let lastIndex = 0;

            while ((match = fileRegex.exec(buffer)) !== null) {
                const [, path, content] = match;
                setProject(prev => {
                    if (!prev) return null;
                    const newFiles = { ...prev.files, [path]: content.trim() };
                    return { ...prev, files: newFiles };
                });
                setGenState(prev => {
                    if (prev.processedFiles.includes(path)) return prev;
                    return {
                        ...prev,
                        status: `Generated ${path}`,
                        currentFile: undefined,
                        processedFiles: [...prev.processedFiles, path]
                    };
                });
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex > 0) {
                buffer = buffer.slice(lastIndex);
            }

            const partialFileMatch = buffer.match(/<file path="([^"]+)">/g);
            if (partialFileMatch) {
                const lastFilePathMatch = buffer.match(/<file path="([^"]+)">[^<]*$/);
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
    setMessages(prev => [...prev, { role: 'assistant', content: 'Thinking...' }]);

    await startStream('/api/projects/chat', {
        projectId: id,
        prompt: userMsg,
        currentFiles: project?.files || {},
        history: messages
    });
  };

  const handleRefreshPreview = () => {
    setPreviewKey(prev => prev + 1);
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
    <div className="flex h-screen flex-col overflow-hidden bg-[#09090b] text-white selection:bg-blue-500/30 font-sans">
        {/* Header - Matching screenshot */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-[#09090b] px-4">
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                     <span className="font-bold text-lg tracking-tight">lovable</span>
                 </div>
                 <div className="h-4 w-[1px] bg-white/10" />
                 <div className="flex items-center gap-2 text-sm text-white/60">
                     <span>{project.name}</span>
                 </div>
            </div>

            <div className="flex items-center gap-3">
                 <div className="flex items-center bg-[#18181b] rounded-lg p-0.5 border border-white/10">
                     <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-[#27272a] text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
                     >
                        <Eye className="h-4 w-4" />
                        Preview
                     </button>
                     <button
                        onClick={() => setActiveTab('code')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'code' ? 'bg-[#27272a] text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
                     >
                        <Code2 className="h-4 w-4" />
                        Code
                     </button>
                 </div>

                 <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-white/60 hover:text-white hover:bg-white/5 rounded-lg">
                    <History className="h-4 w-4" />
                 </Button>

                 <Button variant="ghost" size="sm" className="h-9 gap-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg">
                    <Share2 className="h-4 w-4" />
                    Share
                 </Button>

                 <Button variant="default" size="sm" className="h-9 gap-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium px-4">
                    Publish
                 </Button>

                 <UserButton />
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex flex-1 overflow-hidden relative">

            {/* Left Sidebar: Chat Overlay */}
            <div className="absolute left-6 bottom-6 z-20 w-[400px] flex flex-col gap-2 pointer-events-none">
                {/* Messages Area - Floating */}
                 <div className="max-h-[600px] overflow-y-auto custom-scrollbar pointer-events-auto flex flex-col-reverse gap-4 pb-4">
                    {/* Render messages here if we want them floating above input,
                        but user asked for status *below*.
                        Let's put the chat history in a sidebar or panel if not specified,
                        but "Ask Lovable" is bottom left.
                        Usually in this UI, the chat history pushes up from bottom.
                    */}
                    {/* For now, let's keep chat history in a distinct side panel but visual style matches.
                        Actually, let's make the sidebar properly distinct as in standard layouts,
                        but with the input at the bottom.
                    */}
                 </div>
            </div>

            {/* Re-implementing layout: Sidebar Left, Preview Right */}
            <div className="flex h-full w-full">

                {/* Left Panel: Chat Interface */}
                <div className="w-[400px] flex flex-col border-r border-white/5 bg-[#09090b]">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                         <div className="flex flex-col gap-6 pb-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-blue-600 text-white'}`}>
                                        {msg.role === 'user' ? <div className="h-4 w-4 rounded-full bg-white" /> : <Sparkles className="h-4 w-4" />}
                                    </div>
                                    <div className={`flex max-w-[85%] flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-[#27272a] text-white'
                                                : 'text-white/80'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#09090b] pb-2">
                        <div className="relative rounded-xl border border-white/10 bg-[#18181b] overflow-hidden focus-within:ring-1 focus-within:ring-white/20 transition-all">
                             <Textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder="Ask Lovable..."
                                className="min-h-[44px] w-full resize-none bg-transparent p-3 pr-12 text-sm text-white placeholder:text-white/30 focus:outline-none border-none focus-visible:ring-0"
                            />
                            <div className="flex items-center justify-between px-2 pb-2">
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5 rounded-lg">
                                        <div className="h-4 w-4 border-2 border-current rounded-full flex items-center justify-center text-[10px] font-bold">+</div>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs text-white/40 hover:text-white hover:bg-white/5 rounded-lg gap-1.5 px-2">
                                        <Eye className="h-3 w-3" />
                                        Visual edits
                                    </Button>
                                </div>
                                <div className="flex items-center gap-1">
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5 rounded-lg">
                                        <Mic className="h-4 w-4" />
                                    </Button>
                                     <button
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || genState.isGenerating}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 text-white transition-all hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Log Area (Requested to be BELOW chat) */}
                    <div className="px-4 pb-4 min-h-[40px]">
                         <AnimatePresence mode="wait">
                            {genState.isGenerating && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex items-center gap-3 text-xs text-white/50 pl-1"
                                >
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                                    <div className="flex flex-col">
                                        <span className="text-white/80">{genState.status}</span>
                                        {genState.processedFiles.length > 0 && (
                                            <span className="text-[10px] opacity-60">
                                                Generated {genState.processedFiles.length} files
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Panel: Preview/Code */}
                <div className="flex-1 bg-[#09090b] p-2 pl-0">
                    <div className="h-full w-full rounded-lg border border-white/10 bg-[#0f0f0f] overflow-hidden flex flex-col">
                        {/* No top bar here, using main header for tabs */}

                         <div className="flex-1 relative">
                            {activeTab === 'preview' && (
                                <div className="absolute inset-0 bg-white">
                                    <SandpackPreview files={project?.files || {}} />
                                </div>
                            )}
                            {activeTab === 'code' && (
                                <div className="absolute inset-0">
                                    <CodeEditor files={project?.files || {}} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}
