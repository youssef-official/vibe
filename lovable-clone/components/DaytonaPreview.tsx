'use client';

import { useEffect, useState, useMemo } from 'react';
// import { Daytona } from '@daytonaio/sdk'; // Removed as it's not used on the client side
import { Loader2 } from 'lucide-react';

interface DaytonaPreviewProps {
  files: Record<string, string>;
  viewMode?: 'split' | 'code' | 'preview';
}

// NOTE: This is a simplified implementation. A full implementation would require
// a backend API to handle the Daytona Sandbox creation, file synchronization,
// and fetching the secure preview URL using the DAYTONA_API_KEY.
// Since the user requested to use DAYTONA_API_KEY, we must assume a backend
// service will handle the actual Daytona interaction.
// For the frontend component, we will simulate the process by displaying an iframe
// with a placeholder URL, and we will need to update the backend API to handle
// the actual Daytona logic.

export default function DaytonaPreview({ files, viewMode = 'split' }: DaytonaPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A unique ID based on the files content to trigger re-generation/re-fetch
  const filesHash = useMemo(() => {
    return JSON.stringify(files);
  }, [files]);

  useEffect(() => {
    // This effect should ideally call a custom API route in Next.js
    // that handles the Daytona Sandbox creation/update and returns the preview URL.
    // The API route would use the DAYTONA_API_KEY from the environment.
    
    // Since we are in a frontend component, we will simulate the process.
    // The actual logic will be implemented in the API route later.
    
    const fetchPreviewUrl = async () => {
      setLoading(true);
      setError(null);
      setPreviewUrl(null);

      if (Object.keys(files).length === 0) {
        setLoading(false);
        return;
      }

      try {
        // 1. Call the backend API to create/update the Daytona Sandbox
        // We will create a new API route: /api/daytona/preview
        const response = await fetch('/api/daytona/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: files, filesHash: filesHash }),
        });

        if (!response.ok) {
          throw new Error('Failed to get Daytona preview URL from backend.');
        }

        const data = await response.json();
        setPreviewUrl(data.previewUrl);
      } catch (err) {
        console.error('Daytona Preview Error:', err);
        setError('Could not load Daytona preview. Check API key and backend service.');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewUrl();
  }, [filesHash, files]);

  if (Object.keys(files).length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f0f0f] text-white/40">
        <p>Generating code...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f0f0f] text-white/40">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="ml-2">Loading Daytona Sandbox...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f0f0f] text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  // The viewMode logic is now simplified as Daytona provides a single preview URL.
  // The user's request is to replace Sandpack, which had code/preview tabs.
  // Daytona's primary use here is for the live preview.
  // The code view will be handled by a separate component (e.g., a simple code editor)
  // or by the existing SandpackCodeEditor if we keep it just for file viewing.
  // For now, we focus on the preview.

  return (
    <div className="h-full w-full">
      {previewUrl && (
        <iframe
          src={previewUrl}
          title="Daytona Sandbox Preview"
          className="h-full w-full border-none"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        />
      )}
    </div>
  );
}
