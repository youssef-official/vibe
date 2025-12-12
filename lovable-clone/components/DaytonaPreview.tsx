'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface DaytonaPreviewProps {
  files: Record<string, string>;
  viewMode?: 'split' | 'code' | 'preview';
}

export default function DaytonaPreview({ files }: DaytonaPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Initializing environment...');
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // A unique ID based on the files content to trigger re-generation/re-fetch
  const filesHash = useMemo(() => {
    return JSON.stringify(files);
  }, [files]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchPreviewUrl = async () => {
      if (!mountedRef.current) return;

      setLoading(true);
      setError(null);
      setStatusMsg('Initializing environment...');

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

        if (response.status === 202) {
             // Sandbox is starting, retry after delay
             const data = await response.json();
             setStatusMsg(data.message || 'Sandbox starting...');

             // Retry in 3 seconds
             retryTimeoutRef.current = setTimeout(() => {
                 fetchPreviewUrl();
             }, 3000);
             return;
        }

        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Failed to get Daytona preview URL');
        }

        const data = await response.json();
        if (mountedRef.current) {
            setPreviewUrl(data.previewUrl);
            setLoading(false);
        }
      } catch (err) {
        console.error('Daytona Preview Error:', err);
        if (mountedRef.current) {
             setError('Preview unavailable. Please try again.');
             setLoading(false);
        }
      }
    };

    // Clear any pending retries when hash changes
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

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

  if (loading && !previewUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500 font-medium">{statusMsg}</p>
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
             <button
                onClick={() => window.location.reload()} // Or trigger re-fetch cleaner
                className="mt-3 text-xs underline opacity-60 hover:opacity-100"
             >
                Reload
             </button>
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
