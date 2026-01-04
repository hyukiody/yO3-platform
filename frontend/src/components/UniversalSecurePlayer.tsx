import React, { useEffect, useRef, useState } from 'react';
import { keyStorage } from '../services/KeyStorageService';

export type VideoMode = 'archive' | 'live';
export type KeyStrategy = 'master' | 'seed';

export interface UniversalSecurePlayerProps {
  // Required props
  videoId?: string;
  streamUrl?: string;
  
  // Configuration
  mode: VideoMode;
  keyStrategy: KeyStrategy;
  
  // Keys
  deviceId?: string; // For master key strategy
  seedKey?: string; // For seed key strategy
  
  // Optional features
  autoPlay?: boolean;
  loop?: boolean;
  enableDetection?: boolean;
  enableSnapshot?: boolean;
  
  // Callbacks
  onError?: (error: Error) => void;
  onDetections?: (detections: DetectionObject[]) => void;
  
  // Display
  title?: string;
  cameraId?: string;
}

export interface DetectionObject {
  id: string;
  class: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: number;
}

/**
 * Universal Secure Video Player
 * Consolidates SecureVideoPlayer, VideoPlayer, and VideoFeedPlayer
 * 
 * Modes:
 * - archive: Encrypted video from Microkernel (requires videoId)
 * - live: Real-time stream from backend (requires streamUrl)
 * 
 * Key Strategies:
 * - master: Uses master key from IndexedDB (requires deviceId)
 * - seed: Uses provided seed key (requires seedKey)
 */
export const UniversalSecurePlayer: React.FC<UniversalSecurePlayerProps> = ({
  videoId,
  streamUrl,
  mode,
  keyStrategy,
  deviceId,
  seedKey,
  autoPlay = false,
  loop = false,
  enableDetection = false,
  enableSnapshot = false,
  onError,
  onDetections,
  title,
  cameraId = 'camera-1',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  
  const [status, setStatus] = useState<'loading' | 'processing' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [detections, setDetections] = useState<DetectionObject[]>([]);

  // Validation
  useEffect(() => {
    if (mode === 'archive' && !videoId) {
      const err = new Error('videoId is required for archive mode');
      setError(err.message);
      setStatus('error');
      onError?.(err);
    }
    if (mode === 'live' && !streamUrl) {
      const err = new Error('streamUrl is required for live mode');
      setError(err.message);
      setStatus('error');
      onError?.(err);
    }
    if (keyStrategy === 'master' && !deviceId) {
      const err = new Error('deviceId is required for master key strategy');
      setError(err.message);
      setStatus('error');
      onError?.(err);
    }
    if (keyStrategy === 'seed' && !seedKey) {
      const err = new Error('seedKey is required for seed key strategy');
      setError(err.message);
      setStatus('error');
      onError?.(err);
    }
  }, [mode, keyStrategy, videoId, streamUrl, deviceId, seedKey, onError]);

  useEffect(() => {
    loadVideo();

    return () => {
      cleanup();
    };
  }, [videoId, streamUrl, deviceId, seedKey, mode, keyStrategy]);

  const cleanup = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    
    if (videoRef.current?.src && videoRef.current.src.startsWith('blob:')) {
      URL.revokeObjectURL(videoRef.current.src);
    }
  };

  const loadVideo = async () => {
    try {
      setStatus('loading');
      setProgress(10);
      setError('');

      if (mode === 'archive') {
        await loadArchiveVideo();
      } else {
        await loadLiveStream();
      }

      if (autoPlay && videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
      setStatus('error');
      onError?.(error);
    }
  };

  const loadArchiveVideo = async () => {
    if (!videoId) return;

    // Initialize Web Worker
    const worker = keyStrategy === 'master' 
      ? new Worker(new URL('../workers/data.worker.ts', import.meta.url), { type: 'module' })
      : new Worker(new URL('../workers/stream.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setProgress(20);

    // Get decryption key
    let cryptoKey: ArrayBuffer | string;
    if (keyStrategy === 'master' && deviceId) {
      const masterKey = await keyStorage.getMasterKey(deviceId);
      if (!masterKey) {
        throw new Error('Master key not found. Please pair device first.');
      }
      cryptoKey = masterKey;
    } else if (keyStrategy === 'seed' && seedKey) {
      cryptoKey = seedKey;
      // Initialize worker with seed key
      worker.postMessage({ type: 'INIT', seedKey });
      await new Promise((resolve) => {
        worker.onmessage = (e) => {
          if (e.data.type === 'INIT_SUCCESS' || e.data.type === 'ready') {
            resolve(true);
          }
        };
      });
    } else {
      throw new Error('Invalid key configuration');
    }
    setProgress(40);

    // Fetch encrypted video from Microkernel
    const microkernelUrl = import.meta.env.VITE_MICROKERNEL_URL || 'http://localhost:9090';
    const response = await fetch(`${microkernelUrl}/api/stream/${videoId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    const encodedData = await response.arrayBuffer();
    setProgress(60);
    setStatus('processing');

    // Process in Web Worker
    worker.onmessage = (e) => {
      if (e.data.type === 'processed' || e.data.type === 'PROCESS_SUCCESS') {
        setProgress(90);
        const processedData = e.data.data;
        const processedBlob = new Blob([processedData], { type: 'video/mp4' });
        const url = URL.createObjectURL(processedBlob);
        blobUrlRef.current = url;

        if (videoRef.current) {
          videoRef.current.src = url;
          videoRef.current.loop = loop;
          setStatus('ready');
          setProgress(100);
        }
      } else if (e.data.type === 'error' || e.data.type === 'ERROR') {
        setError(e.data.error);
        setStatus('error');
      }
    };

    const messageType = keyStrategy === 'master' ? 'process' : 'PROCESS';
    worker.postMessage({
      type: messageType,
      encodedData,
      dataKey: keyStrategy === 'master' ? cryptoKey : undefined,
      data: keyStrategy === 'seed' ? encodedData : undefined,
    });
    setProgress(70);
  };

  const loadLiveStream = async () => {
    if (!streamUrl) return;

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated - token required');
    }

    setProgress(50);

    const response = await fetch(streamUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.loop = loop;
      setStatus('ready');
      setProgress(100);
    }
  };

  // Detection overlay (if enabled)
  useEffect(() => {
    if (!enableDetection || !canvasRef.current || !videoRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawDetections = () => {
      if (!video.videoWidth || !video.videoHeight) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      detections.forEach((detection) => {
        const x = detection.bbox.x * canvas.width;
        const y = detection.bbox.y * canvas.height;
        const width = detection.bbox.width * canvas.width;
        const height = detection.bbox.height * canvas.height;

        const colors: Record<string, string> = {
          person: '#FF6B6B',
          car: '#4ECDC4',
          dog: '#FFE66D',
          bicycle: '#95E1D3',
          backpack: '#C7CEEA',
        };
        const color = colors[detection.class] || '#00FFFF';

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        const label = `${detection.class} ${(detection.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 16px monospace';
        const textMetrics = ctx.measureText(label);
        const textHeight = 20;
        const padding = 4;

        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - textHeight - padding), textMetrics.width + padding * 2, textHeight + padding);

        ctx.fillStyle = '#000';
        ctx.fillText(label, x + padding, Math.max(textHeight - 4, y - padding));
      });
    };

    const animationFrame = requestAnimationFrame(function animate() {
      drawDetections();
      requestAnimationFrame(animate);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [detections, enableDetection, isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (!isFullscreen) {
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const captureSnapshot = () => {
    if (!canvasRef.current || !videoRef.current || !enableSnapshot) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapshot-${cameraId}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="universal-secure-player">
      {title && <h3 className="player-title">{title}</h3>}
      
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
          <button onClick={loadVideo}>Retry</button>
        </div>
      )}

      <div className="video-container" style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          className="video-element"
          controls={!enableDetection}
          autoPlay={autoPlay}
          loop={loop}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{ display: status === 'ready' ? 'block' : 'none', width: '100%' }}
        />

        {enableDetection && (
          <canvas
            ref={canvasRef}
            className="detection-canvas"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
        )}

        {status === 'ready' && (enableDetection || enableSnapshot) && (
          <div className="custom-controls">
            <button onClick={togglePlay}>{isPlaying ? '⏸️' : '▶️'}</button>
            {enableSnapshot && <button onClick={captureSnapshot}>📸</button>}
            <button onClick={toggleFullscreen}>{isFullscreen ? '⏹️' : '⛶'}</button>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalSecurePlayer;
