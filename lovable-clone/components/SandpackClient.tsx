
'use client';

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";

interface SandpackClientProps {
  files: Record<string, string>;
  viewMode?: 'split' | 'code' | 'preview';
}

export default function SandpackClient({ files, viewMode = 'split' }: SandpackClientProps) {
  // Use an empty object if no files are present to suppress template files,
  // and let the UI handle the "Generating code..." message.
  const safeFiles = files;

  if (Object.keys(safeFiles).length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f0f0f] text-white/40">
        <p>Generating code...</p>
      </div>
    );
  }

  return (
    <SandpackProvider
      template="react-ts"
      theme="dark"
      files={safeFiles}
      options={{

        externalResources: ["https://cdn.tailwindcss.com"],
        classes: {
            "sp-layout": "!h-full !rounded-none !border-none",
            "sp-wrapper": "!h-full",
        }
      }}
      customSetup={{
        entry: "/App.tsx",
        dependencies: {
          "lucide-react": "latest",
          "framer-motion": "latest",
          "clsx": "latest",
          "tailwind-merge": "latest"
        }
      }}
    >
      <SandpackLayout className="h-full !bg-[#0f0f0f]">
        {(viewMode === 'split' || viewMode === 'code') && (
          <>
            <SandpackFileExplorer className="!h-full !bg-[#151515] !border-r !border-white/10" />
            <SandpackCodeEditor
                showTabs
                closableTabs
                showLineNumbers
                showInlineErrors
                wrapContent
                className="!h-full"
            />
          </>
        )}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <SandpackPreview
              showNavigator={false}
              showRefreshButton={true}
              className="!h-full"
          />
        )}
      </SandpackLayout>
    </SandpackProvider>
  );
}
