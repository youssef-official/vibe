'use client';

import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

interface DaytonaPreviewProps {
  files: Record<string, string>;
  viewMode?: 'split' | 'code' | 'preview';
}

export default function DaytonaPreview({ files }: DaytonaPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A unique ID based on the files content to trigger re-generation/re-fetch
  const filesHash = useMemo(() => {
    return JSON.stringify(files);
  }, [files]);

  useEffect(() => {
    const fetchPreviewUrl = async () => {
      setLoading(true);
      setError(null);
      // Keep previous previewUrl while loading new one to avoid flicker if desired,
      // but for now clearing it to show loading state is safer to indicate activity.
      // setPreviewUrl(null);

      if (Object.keys(files).length === 0) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/daytona/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: files, filesHash: filesHash }),
        });

        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Failed to get Daytona preview URL');
        }

        const data = await response.json();
        setPreviewUrl(data.previewUrl);
      } catch (err) {
        console.error('Daytona Preview Error:', err);
        setError('Preview unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewUrl();
  }, [filesHash, files]);

  if (Object.keys(files).length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white text-gray-400">
        <div className="text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-20" />
            <p className="text-sm">Waiting for code...</p>
        </div>
      </div>
    );
  }

  // If we have a URL, show it even if "loading" is true (re-generating in background?)
  // Actually, Daytona might need a fresh URL.
  // For now, simple state:

  if (loading && !previewUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500 font-medium">Starting Preview Environment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white text-red-500">
        <div className="text-center max-w-md px-4">
             <p className="font-medium mb-1">Preview Error</p>
             <p className="text-xs opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white relative group">
       {loading && (
           <div className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur px-2 py-1 rounded-full text-xs font-medium text-blue-600 flex items-center gap-1.5 shadow-sm border border-blue-100">
               <Loader2 className="w-3 h-3 animate-spin" />
               Updating...
           </div>
       )}
      {previewUrl && (
        <iframe
          src={previewUrl}
          title="Daytona Sandbox Preview"
          className="h-full w-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        />
      )}
    </div>
  );
}
