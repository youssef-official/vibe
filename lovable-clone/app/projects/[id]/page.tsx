"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Terminal, Code, Layout, Play } from "lucide-react";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "thinking" | "coding" | "completed">("idle");
  const [generatedCode, setGeneratedCode] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [currentAction, setCurrentAction] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && prompt) {
      initialized.current = true;
      startGeneration(prompt);
    }
  }, [prompt]);

  const startGeneration = async (userPrompt: string) => {
    setMessages([{ role: "user", content: userPrompt }]);
    setStatus("thinking");
    setCurrentAction("Initializing MiniMax M2...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });

        // MiniMax via OpenAI streaming might return text chunks directly if using 'text/plain' or json chunks if 'text/event-stream'
        // My server implementation returns text/plain chunks of content.

        // We need to parse the text to separate "thought" vs "code" if the model follows instructions.
        // Or just display it.

        // Basic heuristic: If text contains "Now I Would...", it's an action update.
        if (text.includes("Now I Would") || text.includes("Editing :")) {
             setCurrentAction(text.split('\n').find(l => l.includes("Now I") || l.includes("Editing")) || "Working...");
        }

        setGeneratedCode((prev) => prev + text);
        setStatus("coding");
      }
      setStatus("completed");
      setCurrentAction("Completed");
    } catch (error) {
      console.error("Error:", error);
      setCurrentAction("Error occurred");
    }
  };

  // Extract code block for preview if possible
  const getPreviewCode = () => {
    const match = generatedCode.match(/```(?:tsx|jsx|javascript|react)?([\s\S]*?)```/);
    return match ? match[1] : generatedCode;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      {/* Sidebar - Chat & Status */}
      <div className="w-[400px] flex flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border flex items-center gap-2 font-bold text-lg">
           <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs text-white">L</div>
           Lovable
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
                <div key={idx} className="bg-muted p-3 rounded-lg text-sm">
                    <div className="font-semibold mb-1 opacity-70">You</div>
                    {msg.content}
                </div>
            ))}

            {status !== "idle" && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-500 text-sm font-medium animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {currentAction}
                    </div>

                    {reasoning && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-600 dark:text-yellow-400">
                             <div className="font-semibold mb-1 flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3" />
                                Thinking Process
                             </div>
                             <div className="opacity-90 whitespace-pre-wrap text-xs font-mono">
                                 {reasoning}
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="p-4 border-t border-border bg-muted/20">
             <div className="bg-background border border-input rounded-lg p-2 flex items-center">
                 <input
                    className="flex-1 bg-transparent outline-none text-sm px-2 text-foreground"
                    placeholder="Refine the design..."
                    disabled={status !== "completed"}
                 />
                 <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                     <ArrowUpIcon className="w-4 h-4" />
                 </button>
             </div>
        </div>
      </div>

      {/* Main Content - Preview & Code */}
      <div className="flex-1 flex flex-col min-w-0">
         <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-muted/20">
             <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                 <button
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                 >
                    <Play className="w-3.5 h-3.5" /> Preview
                 </button>
                 <button
                    onClick={() => setActiveTab("code")}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'code' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                 >
                    <Code className="w-3.5 h-3.5" /> Code
                 </button>
             </div>

             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Daytona Sandbox Active
                 </div>
             </div>
         </div>

         <div className="flex-1 relative bg-muted/50 overflow-hidden">
             {activeTab === "preview" ? (
                 <div className="w-full h-full flex items-center justify-center">
                    <div className="w-full h-full bg-background relative overflow-auto p-4">
                        {/* Mock Browser UI */}
                        {status === "completed" || generatedCode.length > 50 ? (
                            <div className="max-w-4xl mx-auto bg-card border border-border rounded-lg shadow-sm p-8">
                                <h1 className="text-2xl font-bold mb-4">Generated App Preview</h1>
                                <p className="text-muted-foreground mb-4">The code has been generated. In a real environment, this would render the React app via Daytona.</p>
                                <div className="border border-border rounded p-4 bg-muted/30">
                                    <pre className="text-xs overflow-auto max-h-[500px]">
                                        {getPreviewCode()}
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                <p>Generating your app...</p>
                            </div>
                        )}
                    </div>
                 </div>
             ) : (
                 <div className="w-full h-full bg-[#1e1e1e] text-white p-4 overflow-auto font-mono text-sm">
                     <pre>{generatedCode || "// Waiting for code generation..."}</pre>
                 </div>
             )}
         </div>

         {/* Bottom Status Bar */}
         <div className="h-8 border-t border-border bg-card flex items-center px-4 text-xs text-muted-foreground justify-between">
             <div className="flex items-center gap-4">
                 <span className="flex items-center gap-1.5">
                     <Terminal className="w-3 h-3" />
                     Terminals: Ready
                 </span>
                 <span className="flex items-center gap-1.5">
                     <Layout className="w-3 h-3" />
                     Port: 3000
                 </span>
             </div>
             <div>
                 MiniMax M2 Model
             </div>
         </div>
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}

function ArrowUpIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m5 12 7-7 7 7" />
            <path d="M12 19V5" />
        </svg>
    )
}
