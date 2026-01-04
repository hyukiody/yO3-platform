import { useState, useEffect, useRef } from 'react';
import detectionEventService, { DetectionEventDTO } from '../services/DetectionEventService';
import './ObjectDetectionMonitor.css';

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

interface DetectionFrameData {
  frameId: string;
  timestamp: number;
  objects: DetectionObject[];
  processingTime: number;
}

export default function ObjectDetectionMonitor() {
  const [frameData, setFrameData] = useState<DetectionFrameData | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<DetectionFrameData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [stats, setStats] = useState({
    totalDetections: 0,
    averageConfidence: 0,
    mostCommonClass: '',
    processingSpeed: 0,
  });

  const currentFrameDetections = useRef<DetectionObject[]>([]);
  const frameAggregationTimer = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Real-time detection via WebSocket
  useEffect(() => {
    if (!isMonitoring) {
      detectionEventService.disconnect();
      setConnectionStatus('disconnected');
      return;
    }

    // Connect to detection event stream with video reference
    setConnectionStatus('connecting');
    detectionEventService.connect({
      minConfidence: 0.6,
      videoElement: videoRef.current || undefined,
    });

    // Subscribe to detection events
    const subscriberId = 'object-detection-monitor';
    detectionEventService.subscribe(subscriberId, handleDetectionEvent);

    // Error handler
    const errorHandler = (error: Error) => {
      console.error('Detection stream error:', error);
      setConnectionStatus('disconnected');
    };
    detectionEventService.onError(errorHandler);

    // Check connection status
    const statusCheckInterval = setInterval(() => {
      const isConnected = detectionEventService.isConnected();
      setConnectionStatus(isConnected ? 'connected' : 'connecting');
      // In demo mode, we're always "connected"
      if (!isConnected && isMonitoring) {
        setConnectionStatus('connected'); // Mock connection in demo mode
      }
    }, 1000);

    return () => {
      clearInterval(statusCheckInterval);
      detectionEventService.unsubscribe(subscriberId);
      detectionEventService.offError(errorHandler);
      detectionEventService.disconnect();
      
      if (frameAggregationTimer.current) {
        clearTimeout(frameAggregationTimer.current);
      }
    };
  }, [isMonitoring]);

  // Handle incoming detection events
  const handleDetectionEvent = (event: DetectionEventDTO) => {
    console.log('🎯 Detection event received:', event.objectType, 'confidence:', event.confidence.toFixed(2));
    
    const detectionObject: DetectionObject = {
      id: event.eventId,
      class: event.objectType,
      confidence: event.confidence,
      bbox: event.bbox || {
        x: Math.random() * 0.8,
        y: Math.random() * 0.8,
        width: 0.15,
        height: 0.15,
      },
      timestamp: event.timestamp,
    };

    // Aggregate detections into frames (every 500ms)
    currentFrameDetections.current.push(detectionObject);

    if (frameAggregationTimer.current) {
      clearTimeout(frameAggregationTimer.current);
    }

    frameAggregationTimer.current = window.setTimeout(() => {
      if (currentFrameDetections.current.length > 0) {
        const newFrame: DetectionFrameData = {
          frameId: `frame-${Date.now()}`,
          timestamp: Date.now(),
          objects: [...currentFrameDetections.current],
          processingTime: Math.random() * 30 + 10, // Simulated processing time
        };

        setFrameData(newFrame);
        setDetectionHistory((prev) => [newFrame, ...prev.slice(0, 49)]);
        updateStats(currentFrameDetections.current);

        currentFrameDetections.current = [];
      }
    }, 500);
  };

  const updateStats = (objects: DetectionObject[]) => {
    setStats((prev) => {
      const totalDetections = prev.totalDetections + objects.length;
      const avgConfidence =
        objects.length > 0
          ? objects.reduce((sum, obj) => sum + obj.confidence, 0) / objects.length
          : prev.averageConfidence;

      const classFrequency: Record<string, number> = {};
      objects.forEach((obj) => {
        classFrequency[obj.class] = (classFrequency[obj.class] || 0) + 1;
      });

      const mostCommonClass =
        Object.entries(classFrequency).sort(([, a], [, b]) => b - a)[0]?.[0] || prev.mostCommonClass;

      return {
        totalDetections,
        averageConfidence: avgConfidence,
        mostCommonClass,
        processingSpeed: frameData?.processingTime || prev.processingSpeed,
      };
    });
  };

  const getClassColor = (detectionClass: string): string => {
    const colors: Record<string, string> = {
      person: '#FF6B6B',
      car: '#4ECDC4',
      dog: '#FFE66D',
      bicycle: '#95E1D3',
      backpack: '#C7CEEA',
    };
    return colors[detectionClass] || '#00FFFF';
  };

  const filteredObjects = selectedClass
    ? frameData?.objects.filter((obj) => obj.class === selectedClass) || []
    : frameData?.objects || [];

  return (
    <div className="object-detection-monitor">
      {/* Demo Mode Banner */}
      {isMonitoring && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
        }}>
          <span style={{ fontSize: '24px' }}>🎯</span>
          <div>
            <strong>DEMO MODE:</strong> Simulated YOLOv8 object detection with random mock events
          </div>
        </div>
      )}

      <div className="detection-header">
        <div className="header-content">
          <h3 className="detection-title">🎥 Live Object Detection</h3>
          <p className="detection-subtitle">
            Real-time Stream Processing
            {connectionStatus === 'connected' && <span className="status-indicator connected">● Connected</span>}
            {connectionStatus === 'connecting' && <span className="status-indicator connecting">● Connecting...</span>}
            {connectionStatus === 'disconnected' && <span className="status-indicator disconnected">● Disconnected</span>}
          </p>
        </div>

        <button
          className={`monitoring-btn ${isMonitoring ? 'active' : ''}`}
          onClick={() => setIsMonitoring(!isMonitoring)}
        >
          {isMonitoring ? '⏹ Stop Monitoring' : '▶ Start Monitoring'}
        </button>
      </div>

      {/* Main Detection Canvas */}
      {isMonitoring && (
        <div className="detection-canvas-container" style={{ position: 'relative' }}>
          {/* Background Video - YOLOv8 Live Object Detection */}
          <video
            ref={videoRef}
            src="/sample-video.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
          
          {frameData && (
            <>
              <div className="canvas-info" style={{ position: 'relative', zIndex: 2 }}>
                <span className="frame-id">{frameData.frameId}</span>
                <span className="processing-time">⚡ {frameData.processingTime.toFixed(0)}ms</span>
              </div>

              <svg className="detection-canvas" viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 1 }}>
                {/* Transparent background to show video */}
                <rect width="1000" height="600" fill="transparent" />

                {/* Detection Boxes */}
                {filteredObjects.map((obj) => (
              <g key={obj.id}>
                {/* Bounding Box */}
                <rect
                  x={obj.bbox.x * 1000}
                  y={obj.bbox.y * 600}
                  width={obj.bbox.width * 1000}
                  height={obj.bbox.height * 600}
                  fill="none"
                  stroke={getClassColor(obj.class)}
                  strokeWidth="2"
                  opacity={obj.confidence}
                />

                {/* Class Label Background */}
                <rect
                  x={obj.bbox.x * 1000}
                  y={Math.max(0, obj.bbox.y * 600 - 24)}
                  width={Math.max(80, obj.class.length * 7 + 30)}
                  height="20"
                  fill={getClassColor(obj.class)}
                  opacity={obj.confidence}
                />

                {/* Class Label Text */}
                <text
                  x={obj.bbox.x * 1000 + 8}
                  y={Math.max(14, obj.bbox.y * 600 - 8)}
                  fill="#000"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {obj.class} {(obj.confidence * 100).toFixed(0)}%
                </text>
              </g>
            ))}
          </svg>
            </>
          )}
        </div>
      )}

      {/* Detection Statistics */}
      <div className="detection-stats">
        <div className="stat-card">
          <div className="stat-label">Total Detections</div>
          <div className="stat-value">{stats.totalDetections}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Confidence</div>
          <div className="stat-value">{(stats.averageConfidence * 100).toFixed(0)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Most Common</div>
          <div className="stat-value">{stats.mostCommonClass || 'N/A'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Speed</div>
          <div className="stat-value">{stats.processingSpeed.toFixed(0)}ms</div>
        </div>
      </div>

      {/* Class Filter */}
      <div className="class-filter">
        <span className="filter-label">Filter by Class:</span>
        <button
          className={`class-btn ${selectedClass === null ? 'active' : ''}`}
          onClick={() => setSelectedClass(null)}
        >
          All
        </button>
        {['person', 'car', 'dog', 'bicycle', 'backpack'].map((cls) => (
          <button
            key={cls}
            className={`class-btn ${selectedClass === cls ? 'active' : ''}`}
            onClick={() => setSelectedClass(cls)}
            style={{
              borderColor: getClassColor(cls),
              ...(selectedClass === cls && { backgroundColor: getClassColor(cls), color: '#000' }),
            }}
          >
            {cls}
          </button>
        ))}
      </div>

      {/* Detection History */}
      {detectionHistory.length > 0 && (
        <div className="detection-history">
          <div className="history-header">
            <h4>Recent Detections ({detectionHistory.length})</h4>
          </div>
          <div className="history-list">
            {detectionHistory.slice(0, 10).map((frame) => (
              <div key={frame.frameId} className="history-item">
                <span className="history-time">
                  {new Date(frame.timestamp).toLocaleTimeString()}
                </span>
                <span className="history-count">{frame.objects.length} objects</span>
                <div className="object-classes">
                  {Array.from(new Set(frame.objects.map((obj) => obj.class))).map((cls) => (
                    <span
                      key={cls}
                      className="class-badge"
                      style={{ backgroundColor: getClassColor(cls), color: '#000' }}
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMonitoring && (
        <div className="empty-state">
          <span className="empty-icon">📸</span>
          <p>Click "Start Monitoring" to view live object detection from the sample video feed</p>
        </div>
      )}
    </div>
  );
}
