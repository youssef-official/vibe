
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
}

export default function SandpackClient({ files }: SandpackClientProps) {
  // Ensure we have at least one file to prevent crashes
  const safeFiles = Object.keys(files).length > 0 ? files : {
      "App.tsx": `export default function App() { return <div className="p-4 text-white">Generating code...</div> }`
  };

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
        dependencies: {
          "lucide-react": "latest",
          "framer-motion": "latest",
          "clsx": "latest",
          "tailwind-merge": "latest"
        }
      }}
    >
      <SandpackLayout className="h-full !bg-[#0f0f0f]">
        <SandpackFileExplorer className="!h-full !bg-[#151515] !border-r !border-white/10" />
        <SandpackCodeEditor
            showTabs
            closableTabs
            showLineNumbers
            showInlineErrors
            wrapContent
            className="!h-full"
        />
        <SandpackPreview
            showNavigator={false}
            showRefreshButton={true}
            className="!h-full"
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}
