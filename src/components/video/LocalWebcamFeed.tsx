/**
 * LocalWebcamFeed.tsx - Local Webcam Video Feed with Real-Time Detection
 * 
 * Enables native webcam streaming directly in the browser with:
 * - MediaDevices API integration
 * - Real-time object detection overlay
 * - Detection event service integration
 * - Configurable resolution and FPS
 * 
 * GDAI Assertion: Camera access requires explicit user permission
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import detectionEventService, { DetectionEventDTO } from '@services/DetectionEventService';

interface DetectionObject {
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

interface LocalWebcamFeedProps {
  deviceId: string;
  title?: string;
  enableDetection?: boolean;
  resolution?: { width: number; height: number };
  fps?: number;
  onError?: (error: Error) => void;
  onStreamReady?: (stream: MediaStream) => void;
  autoStart?: boolean;
}

/**
 * LocalWebcamFeed Component
 * Streams video from local webcam with ML object detection overlay
 */
export function LocalWebcamFeed({
  deviceId,
  title = 'Local Webcam',
  enableDetection = true,
  resolution = { width: 1280, height: 720 },
  fps = 30,
  onError,
  onStreamReady,
  autoStart = true,
}: LocalWebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [detections, setDetections] = useState<DetectionObject[]>([]);
  const [detectionStats, setDetectionStats] = useState({ count: 0, fps: 0 });
  const [actualResolution, setActualResolution] = useState<string>('');

  /**
   * Start webcam stream
   */
  const startStream = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error('Camera access not supported in this browser');
      setError(err.message);
      onError?.(err);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request specific camera with resolution constraints
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
          frameRate: { ideal: fps },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermissionGranted(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Get actual video track settings
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        setActualResolution(`${settings.width}x${settings.height}`);
        
        await videoRef.current.play();
        setIsPlaying(true);
        onStreamReady?.(stream);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access failed';
      
      if (message.includes('NotAllowedError') || message.includes('Permission denied')) {
        setError('Camera permission denied. Please allow camera access.');
      } else if (message.includes('NotFoundError') || message.includes('DevicesNotFoundError')) {
        setError('Camera not found. Please check connection.');
      } else if (message.includes('NotReadableError') || message.includes('TrackStartError')) {
        setError('Camera is in use by another application.');
      } else if (message.includes('OverconstrainedError')) {
        setError('Camera does not support requested resolution.');
      } else {
        setError(message);
      }
      
      onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, resolution, fps, onError, onStreamReady]);

  /**
   * Stop webcam stream
   */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsPlaying(false);
  }, []);

  /**
   * Toggle stream on/off
   */
  const toggleStream = useCallback(() => {
    if (isPlaying) {
      stopStream();
    } else {
      startStream();
    }
  }, [isPlaying, startStream, stopStream]);

  // Auto-start stream on mount
  useEffect(() => {
    if (autoStart) {
      startStream();
    }

    return () => {
      stopStream();
    };
  }, [autoStart, startStream, stopStream]);

  // Real-time Object Detection via WebSocket/Mock
  useEffect(() => {
    if (!enableDetection || !isPlaying) {
      detectionEventService.disconnect();
      return;
    }

    // Connect to detection event stream with video element reference
    detectionEventService.connect({
      cameraId: `webcam-${deviceId.substring(0, 8)}`,
      minConfidence: 0.65,
      videoElement: videoRef.current || undefined,
    });

    // Subscribe to detection events
    const subscriberId = `webcam-feed-${deviceId.substring(0, 8)}`;
    detectionEventService.subscribe(subscriberId, (event: DetectionEventDTO) => {
      const detectionObject: DetectionObject = {
        id: event.eventId,
        class: event.objectType,
        confidence: event.confidence,
        bbox: event.bbox || {
          x: Math.random() * 0.7,
          y: Math.random() * 0.7,
          width: 0.15,
          height: 0.15,
        },
        timestamp: event.timestamp,
      };

      // Update detections (keep only recent ones)
      setDetections((prev) => {
        const now = Date.now();
        const recentDetections = prev.filter((d) => now - d.timestamp < 1000);
        return [...recentDetections, detectionObject].slice(-10);
      });

      setDetectionStats(prev => ({ ...prev, count: prev.count + 1 }));
    });

    const errorHandler = (error: Error) => {
      console.error(`Detection stream error for webcam ${deviceId}:`, error);
    };
    detectionEventService.onError(errorHandler);

    return () => {
      detectionEventService.unsubscribe(subscriberId);
      detectionEventService.offError(errorHandler);
      detectionEventService.disconnect();
    };
  }, [enableDetection, isPlaying, deviceId]);

  // Draw detection overlays on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !enableDetection) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const drawDetections = () => {
      if (!video.videoWidth || !video.videoHeight) {
        animationId = requestAnimationFrame(drawDetections);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw bounding boxes
      detections.forEach((detection) => {
        const x = detection.bbox.x * canvas.width;
        const y = detection.bbox.y * canvas.height;
        const width = detection.bbox.width * canvas.width;
        const height = detection.bbox.height * canvas.height;

        // Color based on class
        const colors: Record<string, string> = {
          person: '#FF6B6B',
          car: '#4ECDC4',
          dog: '#FFE66D',
          cat: '#DDA0DD',
          bicycle: '#95E1D3',
          backpack: '#C7CEEA',
          laptop: '#A8E6CF',
          phone: '#FFB6C1',
          chair: '#87CEEB',
          bottle: '#98FB98',
        };
        const color = colors[detection.class] || '#00FFFF';

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        const label = `${detection.class} ${(detection.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 14px monospace';
        const textMetrics = ctx.measureText(label);
        const textHeight = 18;
        const padding = 4;

        ctx.fillStyle = color;
        ctx.fillRect(
          x,
          Math.max(0, y - textHeight - padding),
          textMetrics.width + padding * 2,
          textHeight + padding
        );

        // Draw label text
        ctx.fillStyle = '#000';
        ctx.fillText(
          label,
          x + padding,
          Math.max(textHeight - 4, y - padding)
        );
      });

      animationId = requestAnimationFrame(drawDetections);
    };

    animationId = requestAnimationFrame(drawDetections);

    return () => cancelAnimationFrame(animationId);
  }, [detections, enableDetection]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🎥 {title}</h3>
        <span style={styles.cameraId}>
          {deviceId.substring(0, 12)}...
        </span>
        {actualResolution && (
          <span style={styles.badge}>{actualResolution}</span>
        )}
        {isPlaying && <span style={styles.liveBadge}>● LIVE</span>}
        {enableDetection && isPlaying && (
          <span style={styles.mlBadge}>
            🤖 ML Active
          </span>
        )}
      </div>

      <div style={styles.videoWrapper}>
        {isLoading && (
          <div style={styles.overlay}>
            <div style={styles.spinner}>
              <div style={styles.spinnerIcon}>📷</div>
              <div>Initializing camera...</div>
            </div>
          </div>
        )}

        {error && (
          <div style={styles.errorOverlay}>
            <div style={styles.errorMessage}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <div>{error}</div>
              <button 
                style={styles.retryButton} 
                onClick={startStream}
              >
                🔄 Retry
              </button>
            </div>
          </div>
        )}

        {!permissionGranted && !isLoading && !error && (
          <div style={styles.permissionOverlay}>
            <div style={styles.permissionContent}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
              <div style={{ marginBottom: '1rem' }}>Camera permission required</div>
              <button 
                style={styles.permissionButton} 
                onClick={startStream}
              >
                Grant Access
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          style={styles.video}
          autoPlay
          playsInline
          muted
        />

        {/* Object Detection Overlay Canvas */}
        {enableDetection && (
          <canvas
            ref={canvasRef}
            style={styles.detectionCanvas}
            aria-label="Object detection overlay"
          />
        )}

        {/* Controls */}
        <div style={styles.controls}>
          <button
            onClick={toggleStream}
            style={isPlaying ? styles.stopButton : styles.playButton}
            title={isPlaying ? 'Stop Camera' : 'Start Camera'}
          >
            {isPlaying ? '⏹️ Stop' : '▶️ Start'}
          </button>
          
          {isPlaying && (
            <div style={styles.statusBar}>
              <span style={styles.statusItem}>📊 {fps} FPS target</span>
              {enableDetection && (
                <span style={styles.statusItem}>
                  🎯 {detections.length} detections
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    marginBottom: '1.5rem',
    background: 'rgba(26, 26, 46, 0.9)',
    border: '2px solid #00FFFF',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
  } as const,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.5)',
    borderBottom: '1px solid #00FFFF',
    flexWrap: 'wrap' as const,
  } as const,
  title: {
    fontSize: '1.1rem',
    margin: 0,
    color: '#e2e8f0',
    fontWeight: 600,
  } as const,
  cameraId: {
    fontSize: '0.8rem',
    color: '#8892b0',
    fontFamily: 'monospace',
  } as const,
  badge: {
    fontSize: '0.75rem',
    background: 'rgba(0, 255, 255, 0.2)',
    border: '1px solid #00FFFF',
    color: '#00FFFF',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 500,
  } as const,
  liveBadge: {
    marginLeft: 'auto',
    fontSize: '0.8rem',
    background: 'rgba(255, 0, 0, 0.3)',
    border: '1px solid #ff4444',
    color: '#ff6666',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 600,
    animation: 'pulse 2s ease-in-out infinite',
  } as const,
  mlBadge: {
    fontSize: '0.75rem',
    background: 'rgba(0, 255, 0, 0.2)',
    border: '1px solid #00ff00',
    color: '#00ff00',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 500,
  } as const,
  videoWrapper: {
    position: 'relative' as const,
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    paddingBottom: '56.25%', // 16:9 aspect ratio
  } as const,
  video: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    transform: 'scaleX(-1)', // Mirror for natural webcam view
  } as const,
  detectionCanvas: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as const,
    objectFit: 'cover' as const,
    transform: 'scaleX(-1)', // Mirror to match video
  } as const,
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.9)',
    zIndex: 10,
  } as const,
  spinner: {
    color: '#00FFFF',
    fontSize: '1.1rem',
    textAlign: 'center' as const,
  } as const,
  spinnerIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    animation: 'spin 2s linear infinite',
  } as const,
  errorOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(139, 0, 0, 0.9)',
    zIndex: 10,
  } as const,
  errorMessage: {
    textAlign: 'center' as const,
    color: '#ff6961',
    padding: '1rem',
  } as const,
  retryButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    background: 'rgba(0, 255, 255, 0.2)',
    border: '1px solid #00FFFF',
    borderRadius: '4px',
    color: '#00FFFF',
    cursor: 'pointer',
    fontSize: '0.9rem',
  } as const,
  permissionOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 50, 0.95)',
    zIndex: 10,
  } as const,
  permissionContent: {
    textAlign: 'center' as const,
    color: '#e2e8f0',
    padding: '2rem',
  } as const,
  permissionButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #00FFFF 0%, #0099CC 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
  } as const,
  controls: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    width: '100%',
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.9))',
    padding: '1rem',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  } as const,
  playButton: {
    background: 'rgba(0, 255, 0, 0.2)',
    border: '2px solid #00ff00',
    color: '#00ff00',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: 600,
  } as const,
  stopButton: {
    background: 'rgba(255, 0, 0, 0.2)',
    border: '2px solid #ff4444',
    color: '#ff6666',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: 600,
  } as const,
  statusBar: {
    display: 'flex',
    gap: '1rem',
    marginLeft: 'auto',
  } as const,
  statusItem: {
    fontSize: '0.8rem',
    color: '#8892b0',
  } as const,
};

export default LocalWebcamFeed;
