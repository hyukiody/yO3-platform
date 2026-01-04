import React, { useEffect, useRef, useState } from 'react';
import { keyStorage } from '../services/KeyStorageService';

interface SecureVideoPlayerProps {
  videoId: string;
  deviceId: string;
  autoPlay?: boolean;
}

/**
 * Secure video player with client-side data processing
 * Master key never leaves the browser
 */
export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  videoId,
  deviceId,
  autoPlay = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<'loading' | 'processing' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    loadAndProcessVideo();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      // Clean up blob URL to prevent memory leaks
      if (videoRef.current?.src && videoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoRef.current.src);
      }
    };
  }, [videoId, deviceId]);

  const loadAndProcessVideo = async () => {
    try {
      setStatus('loading');
      setProgress(10);

      // 1. Initialize Web Worker
      const worker = new Worker(
        new URL('../workers/data.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;
      setProgress(20);

      // 2. Get master key from IndexedDB
      const masterKey = await keyStorage.getMasterKey(deviceId);
      
      if (!masterKey) {
        throw new Error('Master key not found. Please pair device first.');
      }
      setProgress(40);

      // 3. Fetch encoded video from Microkernel
      const microkernelUrl = import.meta.env.VITE_MICROKERNEL_URL || 'http://localhost:9090';
      const response = await fetch(`${microkernelUrl}/api/stream/${videoId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const encodedData = await response.arrayBuffer();
      setProgress(60);
      setStatus('processing');

      // 4. Process in Web Worker
      worker.onmessage = (e) => {
        if (e.data.type === 'processed') {
          setProgress(90);
          const processedBlob = new Blob([e.data.data], { type: 'video/mp4' });
          const url = URL.createObjectURL(processedBlob);

          if (videoRef.current) {
            videoRef.current.src = url;
            setStatus('ready');
            setProgress(100);
          }
        } else if (e.data.type === 'error') {
          setError(e.data.error);
          setStatus('error');
        }
      };

      worker.postMessage({
        type: 'process',
        encodedData,
        dataKey: masterKey,
      });
      setProgress(70);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  return (
    <div className="secure-video-player">
      {status === 'loading' && (
        <div className="status-overlay">
          <div className="spinner" />
          <p>Loading video... {progress}%</p>
        </div>
      )}

      {status === 'processing' && (
        <div className="status-overlay">
          <div className="spinner" />
          <p>Processing data... {progress}%</p>
          <p className="help-text">Decrypting with your local key</p>
        </div>
      )}

      {status === 'error' && (
        <div className="error-overlay">
          <p>⚠️ {error}</p>
          <button onClick={loadAndProcessVideo}>Retry</button>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        style={{ display: status === 'ready' ? 'block' : 'none', width: '100%' }}
      />
    </div>
  );
};

export default SecureVideoPlayer;
