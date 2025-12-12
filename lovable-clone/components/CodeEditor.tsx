'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface CodeEditorProps {
  files: Record<string, string>;
}

export default function CodeEditor({ files }: CodeEditorProps) {
  const filePaths = Object.keys(files).sort();
  const [activeFile, setActiveFile] = useState(filePaths[0] || '');

  if (filePaths.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f0f0f] text-white/40">
        <p>No files generated yet.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#18181b]">
      <Tabs value={activeFile} onValueChange={setActiveFile} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap border-b border-white/10">
          <TabsList className="h-auto rounded-none border-b-0 bg-transparent p-0">
            {filePaths.map((path) => (
              <TabsTrigger
                key={path}
                value={path}
                className="h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-white/60 data-[state=active]:border-blue-500 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                {path.split('/').pop()}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>
        <div className="flex-1 overflow-hidden">
          {filePaths.map((path) => (
            <TabsContent key={path} value={path} className="h-full w-full p-0 m-0">
              <ScrollArea className="h-full w-full p-4">
                <pre className="text-xs font-mono text-white/80 overflow-auto">
                  <code>{files[path]}</code>
                </pre>
              </ScrollArea>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
