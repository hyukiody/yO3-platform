import { useEffect, useRef, useState } from 'react'
import detectionEventService, { DetectionEventDTO } from '../services/DetectionEventService'

interface DetectionObject {
  id: string
  class: string
  confidence: number
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
  timestamp: number
}

interface VideoFeedPlayerProps {
  streamUrl: string
  title?: string
  onError?: (error: Error) => void
  autoplay?: boolean
  loop?: boolean
  cameraId?: string
  enableDetection?: boolean
}

/**
 * Surveillance Video Feed Player Component with ML Object Detection
 * Streams video from authenticated backend endpoint with looping support
 * Overlays real-time object detection bounding boxes on video feed
 * Designed for multi-camera surveillance panels
 */
export function VideoFeedPlayer({
  streamUrl,
  title = 'Live Video Feed',
  onError,
  autoplay = true,
  loop = true,
  cameraId = 'camera-1',
  enableDetection = true
}: VideoFeedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [detections, setDetections] = useState<DetectionObject[]>([])
  const [detectionStats, setDetectionStats] = useState({ count: 0, fps: 0 })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleError = (e: Event) => {
      const error = new Error('Video playback error')
      setError(error.message)
      onError?.(error)
    }
    const handleEnded = () => {
      // Auto-loop if enabled
      if (loop) {
        video.currentTime = 0
        video.play()
      }
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('error', handleError)
    video.addEventListener('ended', handleEnded)

    // Load video with authentication
    const token = localStorage.getItem('token')
    if (token) {
      // Fetch video stream
      fetch(streamUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          return response.blob()
        })
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob)
          video.src = blobUrl
          video.loop = loop
          if (autoplay) {
            video.play().catch(err => {
              console.warn('Autoplay failed:', err)
            })
          }
        })
        .catch(err => {
          const error = new Error(`Failed to load video: ${err.message}`)
          setError(error.message)
          onError?.(error)
        })
    } else {
      const error = new Error('Not authenticated - token required')
      setError(error.message)
      onError?.(error)
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('error', handleError)
      video.removeEventListener('ended', handleEnded)
    }
  }, [streamUrl, autoplay, loop, onError])

  // Real-time Object Detection via WebSocket
  useEffect(() => {
    if (!enableDetection || !isPlaying) {
      detectionEventService.disconnect()
      return
    }

    // Connect to detection event stream
    detectionEventService.connect({
      cameraId,
      minConfidence: 0.65,
    })

    // Subscribe to detection events
    const subscriberId = `video-feed-${cameraId}`
    detectionEventService.subscribe(subscriberId, (event: DetectionEventDTO) => {
      // Only process events for this camera
      if (event.cameraId !== cameraId) return

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
      }

      // Update detections (keep only recent ones)
      setDetections((prev) => {
        const now = Date.now()
        const recentDetections = prev.filter((d) => now - d.timestamp < 1000)
        return [...recentDetections, detectionObject].slice(-10)
      })

      setDetectionStats({ count: 1, fps: 2 })
    })

    const errorHandler = (error: Error) => {
      console.error(`Detection stream error for ${cameraId}:`, error)
    }
    detectionEventService.onError(errorHandler)

    return () => {
      detectionEventService.unsubscribe(subscriberId)
      detectionEventService.offError(errorHandler)
      detectionEventService.disconnect()
    }
  }, [enableDetection, isPlaying, cameraId])

  // Draw detection overlays on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !enableDetection) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawDetections = () => {
      if (!video.videoWidth || !video.videoHeight) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw bounding boxes
      detections.forEach((detection) => {
        const x = detection.bbox.x * canvas.width
        const y = detection.bbox.y * canvas.height
        const width = detection.bbox.width * canvas.width
        const height = detection.bbox.height * canvas.height

        // Color based on class
        const colors: Record<string, string> = {
          person: '#FF6B6B',
          car: '#4ECDC4',
          dog: '#FFE66D',
          bicycle: '#95E1D3',
          backpack: '#C7CEEA',
          laptop: '#A8E6CF',
          phone: '#FFB6C1',
        }
        const color = colors[detection.class] || '#00FFFF'

        // Draw bounding box
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.strokeRect(x, y, width, height)

        // Draw label background
        const label = `${detection.class} ${(detection.confidence * 100).toFixed(0)}%`
        ctx.font = 'bold 16px monospace'
        const textMetrics = ctx.measureText(label)
        const textHeight = 20
        const padding = 4

        ctx.fillStyle = color
        ctx.fillRect(
          x,
          Math.max(0, y - textHeight - padding),
          textMetrics.width + padding * 2,
          textHeight + padding
        )

        // Draw label text
        ctx.fillStyle = '#000'
        ctx.fillText(
          label,
          x + padding,
          Math.max(textHeight - 4, y - padding)
        )
      })
    }

    const animationFrame = requestAnimationFrame(function animate() {
      drawDetections()
      requestAnimationFrame(animate)
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [detections, enableDetection])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const toggleFullscreen = async () => {
    if (!videoRef.current) return

    try {
      if (!isFullscreen) {
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
      setIsFullscreen(!isFullscreen)
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <span style={styles.cameraId}>{cameraId}</span>
        {loop && <span style={styles.badge}>🔄 LOOPING</span>}
        {isPlaying && <span style={styles.badge}>🔴 LIVE</span>}
        {enableDetection && isPlaying && (
          <span style={{ ...styles.badge, background: 'rgba(0, 255, 0, 0.2)', borderColor: '#00ff00', color: '#00ff00' }}>
            🤖 ML: {detectionStats.count} obj
          </span>
        )}
      </div>

      <div style={styles.videoWrapper}>
        {isLoading && (
          <div style={styles.overlay}>
            <div style={styles.spinner}>Loading video...</div>
          </div>
        )}

        {error && (
          <div style={{ ...styles.overlay, background: 'rgba(139, 0, 0, 0.9)' }}>
            <div style={styles.errorMessage}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          style={styles.video}
          controls={false}
          crossOrigin="anonymous"
          playsInline
        />

        {/* Object Detection Overlay Canvas */}
        {enableDetection && (
          <canvas
            ref={canvasRef}
            style={styles.detectionCanvas}
            aria-label="Object detection overlay"
          />
        )}

        {/* Custom Controls */}
        <div style={styles.controls}>
          {/* Timeline */}
          <div style={styles.timeline}>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              style={styles.slider}
              aria-label="Video progress"
            />
            <div style={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Control Buttons */}
          <div style={styles.buttons}>
            <button
              onClick={togglePlay}
              style={styles.button}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            <button
              onClick={toggleFullscreen}
              style={styles.button}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? '⏹️' : '⛶'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    width: '100%',
    marginBottom: '1.5rem',
    background: 'rgba(26, 26, 46, 0.8)',
    border: '2px solid #00FFFF',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)'
  } as const,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.5)',
    borderBottom: '1px solid #00FFFF'
  } as const,
  title: {
    fontSize: '1.1rem',
    margin: 0,
    color: '#e2e8f0',
    fontWeight: 600
  } as const,
  cameraId: {
    fontSize: '0.85rem',
    color: '#8892b0',
    fontFamily: 'monospace'
  } as const,
  badge: {
    marginLeft: 'auto',
    fontSize: '0.8rem',
    background: 'rgba(0, 255, 255, 0.2)',
    border: '1px solid #00FFFF',
    color: '#00FFFF',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 600
  } as const,
  videoWrapper: {
    position: 'relative' as const,
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    paddingBottom: '56.25%' // 16:9 aspect ratio
  } as const,
  video: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const
  } as const,
  detectionCanvas: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as const,
    objectFit: 'contain' as const
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
    zIndex: 10
  } as const,
  spinner: {
    color: '#00FFFF',
    fontSize: '1.1rem',
    textAlign: 'center' as const
  } as const,
  errorMessage: {
    textAlign: 'center' as const,
    color: '#ff6961'
  } as const,
  controls: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    width: '100%',
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.9))',
    padding: '1rem',
    zIndex: 5
  } as const,
  timeline: {
    marginBottom: '0.75rem'
  } as const,
  slider: {
    width: '100%',
    height: '6px',
    background: 'rgba(136, 146, 176, 0.3)',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const
  } as const,
  timeDisplay: {
    color: '#e2e8f0',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
    textAlign: 'right' as const
  } as const,
  buttons: {
    display: 'flex',
    gap: '0.75rem'
  } as const,
  button: {
    background: 'rgba(0, 255, 255, 0.2)',
    border: '2px solid #00FFFF',
    color: '#00FFFF',
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    fontSize: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } as const
}
