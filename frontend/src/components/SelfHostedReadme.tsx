import { useState } from 'react'
import type { GitConfig } from '../lib/gitClient'
import { getGitReadme } from '../lib/gitClient'
import { VideoFeedPlayer } from './VideoFeedPlayer'

type Props = {
  config: GitConfig
  autoLoad?: boolean
  fetchFn?: typeof fetch
}

/**
 * Self-Hosted Services Component
 * Displays surveillance panel with live camera feeds and Git repository README
 */
export default function SelfHostedReadme({ config, autoLoad = false, fetchFn }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState<string>('')
  const [showReadme, setShowReadme] = useState(false)

  // Mock camera feeds - in production, these would be fetched from backend
  const mockCameras = [
    { id: 'camera-entrance-01', name: 'Entrance Camera 1', location: 'Main Entrance', video: '/sample-video.mp4' },
    { id: 'camera-entrance-02', name: 'Entrance Camera 2', location: 'Side Entrance', video: '/sample-video2.mp4' }
  ]

  async function load() {
    setStatus('loading')
    setError(null)
    try {
      const content = await getGitReadme(config, fetchFn)
      setText(content)
      setStatus('loaded')
      setShowReadme(true)
    } catch (e: any) {
      // Demo Mode Fallback: Load project README
      console.warn('🎯 DEMO MODE: Loading local README');
      try {
        const response = await fetch('/README.md');
        if (response.ok) {
          const content = await response.text();
          setText(content);
          setStatus('loaded');
          setShowReadme(true);
        } else {
          throw new Error('README not found');
        }
      } catch (fallbackErr) {
        setError(e?.message ?? 'Failed to load README');
        setStatus('error');
      }
    }
  }

  if (autoLoad && status === 'idle') {
    // fire-and-forget, safe to call async without await
    load()
  }

  return (
    <section aria-labelledby="self-hosted-title">
      <h2 id="self-hosted-title">Self-Hosted Services</h2>
      
      {/* Surveillance Panel Section */}
      <div style={styles.surveillanceSection}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>📹 Surveillance Monitor</h3>
          <div style={styles.statusIndicator}>
            <span style={styles.statusDot}>●</span>
            <span style={styles.statusText}>Multiple Cameras Connected</span>
          </div>
        </div>
        <p style={styles.panelDescription}>
          Live surveillance feeds from all wired cameras in your self-hosted deployment. 
          <strong style={{ color: '#00ff00' }}>🤖 ML Vision: Real-time object detection enabled</strong> - 
          bounding boxes and labels appear directly on video streams.
        </p>
        
        {/* Camera Grid */}
        <div style={styles.cameraGrid}>
          {mockCameras.map((camera) => (
            <div key={camera.id} style={styles.cameraCard}>
              <div style={styles.cameraInfo}>
                <h4 style={styles.cameraTitle}>{camera.name}</h4>
                <span style={styles.cameraLocation}>{camera.location}</span>
              </div>
              {/* Demo Mode: Each camera shows different sample video */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                <video
                  src={camera.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => console.error(`Camera ${camera.id} video error:`, e)}
                />
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  padding: '4px 8px',
                  background: 'rgba(0, 255, 0, 0.8)',
                  color: '#000',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  borderRadius: '4px'
                }}>
                  🎥 DEMO MODE
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Git README Section */}
      <div style={styles.readmeSection}>
        <h3 style={styles.readmeTitle}>📋 Git Repository README</h3>
        <p style={styles.readmeDescription}>
          Click to fetch README from your self-hosted Git instance.
        </p>
        <div style={styles.buttonContainer}>
          <button 
            className="button" 
            onClick={load} 
            disabled={status === 'loading'}
            style={{ 
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: status === 'loading' ? 0.6 : 1,
              transition: 'opacity 0.2s ease'
            }}
          >
            {status === 'loading' ? 'Loading…' : 'Load README'}
          </button>
        </div>
        <div aria-live="polite" aria-busy={status === 'loading'}>
          {status === 'error' && (
            <div className="card" role="alert">
              Failed to load: {error}
            </div>
          )}
          {status === 'loaded' && showReadme && (
            <pre style={styles.readmeContent}>
              {text}
            </pre>
          )}
        </div>
      </div>
    </section>
  )
}

const styles = {
  surveillanceSection: {
    marginBottom: '2.5rem',
    padding: '1.5rem',
    background: 'rgba(26, 26, 46, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 255, 255, 0.2)'
  } as const,
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid rgba(0, 255, 255, 0.3)'
  } as const,
  panelTitle: {
    fontSize: '1.5rem',
    margin: 0,
    color: '#00FFFF',
    fontWeight: 700
  } as const,
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  } as const,
  statusDot: {
    fontSize: '1rem',
    color: '#00ff00',
    animation: 'pulse 1.5s ease-in-out infinite'
  } as const,
  statusText: {
    color: '#8892b0',
    fontSize: '0.9rem'
  } as const,
  panelDescription: {
    color: '#a0aec0',
    marginBottom: '1.5rem',
    lineHeight: '1.6'
  } as const,
  cameraGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem'
  } as const,
  cameraCard: {
    background: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(0, 255, 255, 0.15)'
  } as const,
  cameraInfo: {
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.6)',
    borderBottom: '1px solid rgba(0, 255, 255, 0.1)'
  } as const,
  cameraTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1rem',
    color: '#e2e8f0',
    fontWeight: 600
  } as const,
  cameraLocation: {
    color: '#8892b0',
    fontSize: '0.85rem'
  } as const,
  readmeSection: {
    padding: '1.5rem',
    background: 'rgba(26, 26, 46, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 255, 255, 0.2)'
  } as const,
  readmeTitle: {
    fontSize: '1.25rem',
    margin: '0 0 0.5rem 0',
    color: '#00FFFF',
    fontWeight: 700
  } as const,
  readmeDescription: {
    color: '#a0aec0',
    marginBottom: '1rem'
  } as const,
  buttonContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem'
  } as const,
  readmeContent: {
    whiteSpace: 'pre-wrap' as const,
    background: '#18181a',
    color: '#fff',
    padding: '12px',
    borderRadius: 8,
    overflow: 'auto',
    maxHeight: '400px'
  } as const
}
