/**
 * LiveWebcamDemo.tsx - Local Webcam Object Detection Demo
 * 
 * Test page for live webcam streaming with real-time ML detection overlay.
 * Enables camera from host device with one-click permission grant.
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocalWebcams } from '@hooks/useLocalWebcams';
import { LocalWebcamFeed } from '@components/video/LocalWebcamFeed';

export default function LiveWebcamDemo() {
  const { 
    webcams, 
    loading, 
    error, 
    hasPermission, 
    requestPermission, 
    refreshWebcams 
  } = useLocalWebcams();
  
  const [activeWebcam, setActiveWebcam] = useState<string | null>(null);
  const [enableDetection, setEnableDetection] = useState(true);
  const [resolution, setResolution] = useState({ width: 1280, height: 720 });
  const [streamError, setStreamError] = useState<string | null>(null);

  const handleGrantPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      await refreshWebcams();
    }
  }, [requestPermission, refreshWebcams]);

  const handleSelectWebcam = useCallback((deviceId: string) => {
    setActiveWebcam(deviceId);
    setStreamError(null);
  }, []);

  const handleStreamError = useCallback((error: Error) => {
    setStreamError(error.message);
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Link to="/showcase" style={styles.backLink}>← Back to Showcase</Link>
        <h1 style={styles.title}>🎥 Live Webcam Detection</h1>
        <p style={styles.subtitle}>
          Real-time object detection using your local webcam
        </p>
      </div>

      {/* Permission Section */}
      {!hasPermission && (
        <div style={styles.permissionSection}>
          <div style={styles.permissionCard}>
            <div style={styles.permissionIcon}>🔐</div>
            <h2 style={styles.permissionTitle}>Camera Permission Required</h2>
            <p style={styles.permissionText}>
              To enable live webcam detection, please grant camera access.
              Your camera feed stays local and is never uploaded.
            </p>
            <button 
              style={styles.grantButton}
              onClick={handleGrantPermission}
              disabled={loading}
            >
              {loading ? '⏳ Requesting...' : '✓ Grant Camera Access'}
            </button>
            {error && <div style={styles.errorText}>⚠️ {error}</div>}
          </div>
        </div>
      )}

      {/* Main Content */}
      {hasPermission && (
        <div style={styles.content}>
          {/* Webcam Selection */}
          <div style={styles.webcamList}>
            <div style={styles.sectionHeader}>
              <h2>📷 Available Cameras ({webcams.length})</h2>
              <button style={styles.refreshButton} onClick={refreshWebcams}>
                🔄 Refresh
              </button>
            </div>

            {webcams.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No cameras detected. Please connect a webcam and click Refresh.</p>
              </div>
            ) : (
              <div style={styles.webcamGrid}>
                {webcams.map((webcam, index) => (
                  <div 
                    key={webcam.deviceId}
                    style={{
                      ...styles.webcamCard,
                      ...(activeWebcam === webcam.deviceId ? styles.webcamCardActive : {})
                    }}
                    onClick={() => handleSelectWebcam(webcam.deviceId)}
                  >
                    <div style={styles.webcamCardIcon}>📷</div>
                    <div style={styles.webcamCardInfo}>
                      <div style={styles.webcamName}>
                        {webcam.label || `Camera ${index + 1}`}
                      </div>
                      <div style={styles.webcamId}>
                        {webcam.deviceId.substring(0, 16)}...
                      </div>
                    </div>
                    {activeWebcam === webcam.deviceId && (
                      <div style={styles.activeBadge}>● Active</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>
                <input 
                  type="checkbox" 
                  checked={enableDetection}
                  onChange={(e) => setEnableDetection(e.target.checked)}
                  style={styles.checkbox}
                />
                🤖 ML Object Detection
              </label>
            </div>

            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Resolution:</span>
              <select 
                style={styles.select}
                value={`${resolution.width}x${resolution.height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  setResolution({ width: w, height: h });
                }}
              >
                <option value="640x480">640x480 (VGA)</option>
                <option value="1280x720">1280x720 (HD)</option>
                <option value="1920x1080">1920x1080 (Full HD)</option>
              </select>
            </div>
          </div>

          {/* Video Feed */}
          <div style={styles.videoSection}>
            {activeWebcam ? (
              <>
                <LocalWebcamFeed
                  deviceId={activeWebcam}
                  title={webcams.find(w => w.deviceId === activeWebcam)?.label || 'Webcam'}
                  enableDetection={enableDetection}
                  resolution={resolution}
                  fps={30}
                  onError={handleStreamError}
                  autoStart={true}
                />
                {streamError && (
                  <div style={styles.streamError}>
                    ⚠️ Stream Error: {streamError}
                  </div>
                )}
              </>
            ) : (
              <div style={styles.selectPrompt}>
                <div style={styles.selectPromptIcon}>👆</div>
                <p>Select a camera above to start streaming</p>
              </div>
            )}
          </div>

          {/* Status Panel */}
          <div style={styles.statusPanel}>
            <h3 style={styles.statusTitle}>📊 System Status</h3>
            <div style={styles.statusGrid}>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>Camera Permission</span>
                <span style={styles.statusValue}>✅ Granted</span>
              </div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>Detected Devices</span>
                <span style={styles.statusValue}>{webcams.length}</span>
              </div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>Active Stream</span>
                <span style={styles.statusValue}>{activeWebcam ? '● Live' : '○ Idle'}</span>
              </div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>ML Detection</span>
                <span style={styles.statusValue}>{enableDetection ? '✅ Active' : '⏸️ Disabled'}</span>
              </div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>Target Resolution</span>
                <span style={styles.statusValue}>{resolution.width}x{resolution.height}</span>
              </div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>Mode</span>
                <span style={styles.statusValue}>🎯 Demo (Mock ML)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          💡 Tip: Enable detection to see simulated object bounding boxes on your webcam feed.
          In production, this connects to real ML inference services.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)',
    padding: '2rem',
    color: '#e2e8f0',
  } as React.CSSProperties,
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  } as React.CSSProperties,
  backLink: {
    color: '#00FFFF',
    textDecoration: 'none',
    fontSize: '0.9rem',
    display: 'inline-block',
    marginBottom: '1rem',
  } as React.CSSProperties,
  title: {
    fontSize: '2.5rem',
    margin: 0,
    background: 'linear-gradient(90deg, #00FFFF 0%, #00ff00 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  subtitle: {
    color: '#8892b0',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  permissionSection: {
    display: 'flex',
    justifyContent: 'center',
    padding: '3rem 0',
  } as React.CSSProperties,
  permissionCard: {
    background: 'rgba(26, 26, 46, 0.9)',
    border: '2px solid #00FFFF',
    borderRadius: '16px',
    padding: '3rem',
    textAlign: 'center' as const,
    maxWidth: '500px',
  } as React.CSSProperties,
  permissionIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  permissionTitle: {
    fontSize: '1.5rem',
    margin: '0 0 1rem 0',
    color: '#e2e8f0',
  } as React.CSSProperties,
  permissionText: {
    color: '#8892b0',
    marginBottom: '1.5rem',
    lineHeight: 1.6,
  } as React.CSSProperties,
  grantButton: {
    background: 'linear-gradient(135deg, #00FFFF 0%, #0099CC 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#000',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  } as React.CSSProperties,
  errorText: {
    color: '#ff6b6b',
    marginTop: '1rem',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,
  webcamList: {
    marginBottom: '2rem',
  } as React.CSSProperties,
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  } as React.CSSProperties,
  refreshButton: {
    background: 'rgba(0, 255, 255, 0.1)',
    border: '1px solid #00FFFF',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    color: '#00FFFF',
    cursor: 'pointer',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  webcamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  } as React.CSSProperties,
  webcamCard: {
    background: 'rgba(26, 26, 46, 0.8)',
    border: '2px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  webcamCardActive: {
    borderColor: '#00ff00',
    background: 'rgba(0, 255, 0, 0.1)',
  } as React.CSSProperties,
  webcamCardIcon: {
    fontSize: '2rem',
  } as React.CSSProperties,
  webcamCardInfo: {
    flex: 1,
  } as React.CSSProperties,
  webcamName: {
    fontWeight: 600,
    marginBottom: '0.25rem',
  } as React.CSSProperties,
  webcamId: {
    fontSize: '0.75rem',
    color: '#8892b0',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  activeBadge: {
    background: 'rgba(0, 255, 0, 0.2)',
    border: '1px solid #00ff00',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    color: '#00ff00',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: '#8892b0',
  } as React.CSSProperties,
  controls: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '2rem',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  } as React.CSSProperties,
  controlLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#e2e8f0',
  } as React.CSSProperties,
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#00FFFF',
  } as React.CSSProperties,
  select: {
    background: 'rgba(26, 26, 46, 0.9)',
    border: '1px solid #00FFFF',
    borderRadius: '4px',
    padding: '0.5rem',
    color: '#e2e8f0',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  videoSection: {
    marginBottom: '2rem',
  } as React.CSSProperties,
  selectPrompt: {
    background: 'rgba(26, 26, 46, 0.8)',
    border: '2px dashed rgba(0, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '4rem',
    textAlign: 'center' as const,
    color: '#8892b0',
  } as React.CSSProperties,
  selectPromptIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  streamError: {
    background: 'rgba(255, 0, 0, 0.1)',
    border: '1px solid #ff6b6b',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '1rem',
    color: '#ff6b6b',
  } as React.CSSProperties,
  statusPanel: {
    background: 'rgba(26, 26, 46, 0.8)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '1.5rem',
  } as React.CSSProperties,
  statusTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    color: '#00FFFF',
  } as React.CSSProperties,
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  } as React.CSSProperties,
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
  } as React.CSSProperties,
  statusLabel: {
    color: '#8892b0',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  statusValue: {
    color: '#e2e8f0',
    fontWeight: 500,
  } as React.CSSProperties,
  footer: {
    marginTop: '3rem',
    textAlign: 'center' as const,
    padding: '2rem',
    borderTop: '1px solid rgba(0, 255, 255, 0.1)',
  } as React.CSSProperties,
  footerText: {
    color: '#8892b0',
    fontSize: '0.9rem',
    maxWidth: '600px',
    margin: '0 auto',
  } as React.CSSProperties,
};
