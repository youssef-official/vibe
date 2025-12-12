'use client';

import { SandpackProvider, SandpackPreview as SandpackPreviewComponent, SandpackLayout } from '@codesandbox/sandpack-react';
import { useTheme } from 'next-themes';

interface SandpackPreviewProps {
  files: Record<string, string>;
}

export default function SandpackPreview({ files }: SandpackPreviewProps) {
  const { theme } = useTheme();

  // Detect template based on files
  const isNext = Object.keys(files).some(f => f.includes('next.config') || f.includes('app/page'));
  // Default to vite-react-ts if typescript is present, else vite-react
  const hasTs = Object.keys(files).some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  const template = isNext ? 'nextjs' : (hasTs ? 'vite-react-ts' : 'vite-react');

  // Enhance dependencies if package.json exists in files, parse it?
  // Sandpack handles package.json in files automatically.
  // But we can also add global dependencies if needed.

  return (
    <div className="h-full w-full bg-white">
      <SandpackProvider
        template={template}
        theme={theme === 'dark' ? 'dark' : 'light'}
        files={files}
        options={{
          externalResources: ['https://cdn.tailwindcss.com'], // Add Tailwind support by default for many generated apps
        }}
        customSetup={{
            dependencies: {
                "lucide-react": "latest",
                "clsx": "latest",
                "tailwind-merge": "latest",
                "framer-motion": "latest",
                "date-fns": "latest",
                "react-day-picker": "latest",
                "@radix-ui/react-slot": "latest",
                "class-variance-authority": "latest"
            }
        }}
      >
        <SandpackLayout style={{ height: '100%', border: 'none', borderRadius: 0 }}>
            <SandpackPreviewComponent
                style={{ height: '100%' }}
                showNavigator={true}
                showOpenInCodeSandbox={false}
            />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
