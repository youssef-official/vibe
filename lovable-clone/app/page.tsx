"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Paperclip } from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Generate a random ID for the project
    const projectId = Math.random().toString(36).substring(7);

    // Navigate to the project page with the prompt
    router.push(`/projects/${projectId}?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-background">
      {/* Background gradients */}
      <div className="absolute inset-0 w-full overflow-hidden pointer-events-none">
        <div className="absolute inset-0 mt-0 blur-[10px] opacity-100">
          <div
            className="absolute left-1/2 aspect-square w-[350%] -translate-x-1/2 overflow-hidden md:w-[190%] bg-gradient-to-b from-transparent via-black/5 to-black"
            style={{
               background: "radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)"
            }}
          ></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex w-full flex-col items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 w-full items-center justify-between px-6">
           <div className="flex items-center gap-2 font-bold text-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                L
              </div>
              <span>Lovable</span>
           </div>
           <div className="flex items-center gap-4">
              <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Log in</button>
              <button className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-md hover:opacity-90 transition-opacity">Get started</button>
           </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center container mx-auto px-4 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-sm text-blue-500 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            Build apps with MiniMax M2
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            Build something <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Lovable</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl">
            Create full-stack apps and websites by chatting with AI.
            Powered by the new MiniMax M2 model for superior reasoning.
          </p>

          <div className="w-full max-w-2xl relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            <form onSubmit={handleSubmit} className="relative bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Lovable to create a blog about..."
                className="w-full bg-transparent p-6 text-lg placeholder:text-muted-foreground/50 resize-none outline-none min-h-[120px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border/50">
                <div className="flex gap-2">
                  <button type="button" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>

          <div className="mt-16 w-full max-w-5xl">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold">From the Community</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="group relative aspect-video bg-muted rounded-xl overflow-hidden border border-border/50 hover:border-blue-500/50 transition-colors">
                   <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50"></div>
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                     <span className="bg-background text-foreground px-4 py-2 rounded-md font-medium text-sm">Preview</span>
                   </div>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
