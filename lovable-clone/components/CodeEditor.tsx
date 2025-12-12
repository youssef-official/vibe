'use client';

import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  files: Record<string, string>;
}

// Helper to determine language for Monaco
const getLanguage = (path: string) => {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.html')) return 'html';
  return 'plaintext';
};

export default function CodeEditor({ files }: CodeEditorProps) {
  const filePaths = useMemo(() => Object.keys(files).sort(), [files]);
  const [activeFile, setActiveFile] = useState(filePaths[0] || '');

  // Update active file state if the currently active file is removed or if it's the initial load
  if (activeFile && !files[activeFile] && filePaths.length > 0) {
    setActiveFile(filePaths[0]);
  } else if (!activeFile && filePaths.length > 0) {
    setActiveFile(filePaths[0]);
  }

  if (filePaths.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-white/40">
        <p>No files generated yet.</p>
      </div>
    );
  }

  const currentContent = files[activeFile] || '';
  const currentLanguage = getLanguage(activeFile);

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      {/* File Tabs */}
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
      </Tabs>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={currentLanguage}
          value={currentContent}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            contextmenu: false,
          }}
        />
      </div>
    </div>
  );
}
