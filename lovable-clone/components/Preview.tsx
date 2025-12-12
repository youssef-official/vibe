
import React, { useEffect, useRef } from 'react';

interface PreviewProps {
  code: string;
}

export default function Preview({ code }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !code) return;

    // Safer "replace" logic:
    // We want to remove "export default" so it becomes a local variable/function.
    // And we need to know the name to render it.

    let processedCode = code;
    if (processedCode.includes('export default function')) {
        processedCode = processedCode.replace(/export default function\s+(\w+)/, 'function $1');
        const match = code.match(/export default function\s+(\w+)/);
        const name = match ? match[1] : 'App';

        processedCode += `\n\nimport { createRoot } from 'react-dom/client';\nconst root = createRoot(document.getElementById('root'));\nroot.render(<${name} />);`;
    } else if (processedCode.includes('export default')) {
         // Handle "const X = ...; export default X;"
         const match = processedCode.match(/export default\s+(\w+)/);
         const name = match ? match[1] : 'App';
         processedCode = processedCode.replace(/export default\s+\w+;?/, '');
         processedCode += `\n\nimport { createRoot } from 'react-dom/client';\nconst root = createRoot(document.getElementById('root'));\nroot.render(<${name} />);`;
    } else {
        // Fallback, maybe no export?
        processedCode += `\n\nimport { createRoot } from 'react-dom/client';\nconst root = createRoot(document.getElementById('root'));\nroot.render(<App />);`;
    }

    const finalHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              border: "hsl(var(--border))",
              input: "hsl(var(--input))",
              ring: "hsl(var(--ring))",
              background: "hsl(var(--background))",
              foreground: "hsl(var(--foreground))",
              primary: {
                DEFAULT: "hsl(var(--primary))",
                foreground: "hsl(var(--primary-foreground))",
              },
              secondary: {
                DEFAULT: "hsl(var(--secondary))",
                foreground: "hsl(var(--secondary-foreground))",
              },
              destructive: {
                DEFAULT: "hsl(var(--destructive))",
                foreground: "hsl(var(--destructive-foreground))",
              },
              muted: {
                DEFAULT: "hsl(var(--muted))",
                foreground: "hsl(var(--muted-foreground))",
              },
              accent: {
                DEFAULT: "hsl(var(--accent))",
                foreground: "hsl(var(--accent-foreground))",
              },
              popover: {
                DEFAULT: "hsl(var(--popover))",
                foreground: "hsl(var(--popover-foreground))",
              },
              card: {
                DEFAULT: "hsl(var(--card))",
                foreground: "hsl(var(--card-foreground))",
              },
            },
          }
        }
      }
    </script>
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@18.2.0",
          "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
          "lucide-react": "https://esm.sh/lucide-react@0.263.1"
        }
      }
    </script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
      body { background-color: #000; color: #fff; margin: 0; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel" data-type="module">
${processedCode}
    </script>
  </body>
</html>`;

    if (iframeRef.current) {
        iframeRef.current.srcdoc = finalHtml;
    }
  }, [code]);

  return (
    <div className="w-full h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-white/10">
      <iframe
        ref={iframeRef}
        title="Preview"
        className="w-full h-full border-none bg-white"
        sandbox="allow-scripts allow-same-origin allow-modals"
      />
    </div>
  );
}
