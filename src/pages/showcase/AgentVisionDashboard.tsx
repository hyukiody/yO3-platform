import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AgentInsightPanel, {
  type AgentInsight,
} from '@agent/insight/ui/react/component/insightCards/AgentInsightPanel';
import ProtocolTimeline, {
  type ProtocolEvent,
} from '@agent/insight/ui/react/component/protocolEvents/ProtocolTimeline';
import VisionEngineStatus, {
  type VisionEngineHealth,
} from '@agent/status/ui/react/component/visionEngine/VisionEngineStatus';
import styles from './AgentVisionDashboard.module.css';

// Demo data generators
const OBJECT_CLASSES = ['person', 'car', 'bicycle', 'dog', 'backpack', 'fire', 'weapon'];
const PROTOCOL_STATUSES: ('none' | 'monitoring' | 'alert' | 'critical' | 'emergency')[] = 
  ['none', 'monitoring', 'alert', 'critical', 'emergency'];

const ANALYSIS_TEMPLATES: Record<string, string[]> = {
  person: [
    'Individual walking through monitored area, normal activity pattern detected.',
    'Person detected wearing safety equipment in industrial zone.',
    'Multiple individuals congregating near entrance area.',
    'Individual appearing distressed, unusual movement patterns observed.',
  ],
  car: [
    'Vehicle entering parking area, license plate captured.',
    'Vehicle stationary for extended period in restricted zone.',
    'High-speed vehicle detected on monitored road.',
  ],
  fire: [
    'Smoke and flames detected in warehouse section B. Immediate evacuation recommended.',
    'Thermal anomaly suggesting fire hazard detected in electrical panel area.',
  ],
  weapon: [
    'Potential weapon-like object detected. Security alert triggered.',
    'Individual with suspicious object near entry checkpoint.',
  ],
  bicycle: [
    'Cyclist moving through pedestrian area.',
    'Bicycle parked in designated area.',
  ],
  dog: [
    'Unaccompanied animal detected in restricted zone.',
    'Service animal accompanying individual.',
  ],
  backpack: [
    'Unattended bag detected near entrance. Monitoring initiated.',
    'Individual with large bag entering secure area.',
  ],
};

function generateMockInsight(index: number): AgentInsight {
  const objectClass = OBJECT_CLASSES[Math.floor(Math.random() * OBJECT_CLASSES.length)];
  const templates = ANALYSIS_TEMPLATES[objectClass] || ANALYSIS_TEMPLATES.person;
  
  // Higher severity for certain objects
  let protocolStatus: typeof PROTOCOL_STATUSES[number];
  if (objectClass === 'fire') {
    protocolStatus = Math.random() > 0.3 ? 'emergency' : 'critical';
  } else if (objectClass === 'weapon') {
    protocolStatus = Math.random() > 0.2 ? 'critical' : 'emergency';
  } else {
    protocolStatus = PROTOCOL_STATUSES[Math.floor(Math.random() * PROTOCOL_STATUSES.length)];
  }

  return {
    id: `insight-${Date.now()}-${index}`,
    objectClass,
    confidence: 0.7 + Math.random() * 0.3,
    deepAnalysis: templates[Math.floor(Math.random() * templates.length)],
    protocolStatus,
    timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    cameraId: `CAM-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
  };
}

function generateMockEvent(insight: AgentInsight): ProtocolEvent {
  return {
    id: `event-${insight.id}`,
    timestamp: insight.timestamp,
    protocolStatus: insight.protocolStatus,
    objectClass: insight.objectClass,
    description: insight.deepAnalysis,
    cameraId: insight.cameraId,
  };
}

export default function AgentVisionDashboard() {
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [events, setEvents] = useState<ProtocolEvent[]>([]);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AgentInsight | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [engineHealth, setEngineHealth] = useState<VisionEngineHealth>({
    status: 'ready',
    model: 'vikhyatk/moondream2',
    device: 'cpu',
    memoryUsage: 512 * 1024 * 1024,
    requestsPerMinute: 12,
    avgResponseTime: 450,
  });

  // Generate initial mock data
  useEffect(() => {
    const initialInsights = Array.from({ length: 10 }, (_, i) => generateMockInsight(i));
    setInsights(initialInsights);
    setEvents(initialInsights.map(generateMockEvent));
  }, []);

  // Live mode - generate new insights periodically
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      const newInsight = generateMockInsight(Date.now());
      setInsights(prev => [newInsight, ...prev.slice(0, 49)]);
      setEvents(prev => [generateMockEvent(newInsight), ...prev.slice(0, 99)]);

      // Randomly update engine stats
      setEngineHealth(prev => ({
        ...prev,
        requestsPerMinute: Math.max(1, prev.requestsPerMinute! + Math.floor(Math.random() * 5) - 2),
        avgResponseTime: Math.max(100, prev.avgResponseTime! + Math.floor(Math.random() * 100) - 50),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveMode]);

  const handleInsightClick = useCallback((insight: AgentInsight) => {
    setSelectedInsight(insight);
  }, []);

  const handleEventClick = useCallback((event: ProtocolEvent) => {
    const relatedInsight = insights.find(i => i.id === event.id.replace('event-', ''));
    if (relatedInsight) {
      setSelectedInsight(relatedInsight);
    }
  }, [insights]);

  const handleClearData = () => {
    setInsights([]);
    setEvents([]);
    setSelectedInsight(null);
  };

  const handleSimulateEmergency = () => {
    const emergencyInsight: AgentInsight = {
      id: `emergency-${Date.now()}`,
      objectClass: 'fire',
      confidence: 0.98,
      deepAnalysis: '🚨 EMERGENCY: Fire and smoke detected in warehouse area. Multiple heat signatures. Immediate evacuation protocol activated.',
      protocolStatus: 'emergency',
      timestamp: Date.now(),
      cameraId: 'CAM-001',
    };
    setInsights(prev => [emergencyInsight, ...prev]);
    setEvents(prev => [generateMockEvent(emergencyInsight), ...prev]);
    setSelectedInsight(emergencyInsight);
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/showcase" className={styles.backLink}>← Back to Showcase</Link>
          <h1 className={styles.title}>🤖 Agent Vision Dashboard</h1>
          <p className={styles.subtitle}>AI-Powered Scene Analysis & Protocol Management</p>
        </div>
        <div className={styles.controls}>
          <button
            className={`${styles.controlBtn} ${isLiveMode ? styles.active : ''}`}
            onClick={() => setIsLiveMode(!isLiveMode)}
            data-testid="live-mode-toggle"
          >
            {isLiveMode ? '⏸ Pause' : '▶ Live Mode'}
          </button>
          <button
            className={styles.controlBtn}
            onClick={handleSimulateEmergency}
            data-testid="simulate-emergency"
          >
            🚨 Simulate Emergency
          </button>
          <button
            className={`${styles.controlBtn} ${styles.danger}`}
            onClick={handleClearData}
            data-testid="clear-data"
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Demo Banner */}
      <div className={styles.demoBanner}>
        <span className={styles.demoIcon}>🎯</span>
        <div>
          <strong>DEMO MODE:</strong> Simulated agentic vision analysis. 
          In production, this connects to the Vision Engine backend for real-time VLM analysis.
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className={styles.mainGrid}>
        {/* Left Column - Vision Engine Status */}
        <div className={styles.leftColumn}>
          <VisionEngineStatus
            mockHealth={engineHealth}
            refreshInterval={30000}
            onStatusChange={setEngineHealth}
          />

          {/* Selected Insight Detail */}
          {selectedInsight && (
            <div className={styles.detailCard} data-testid="selected-insight-detail">
              <div className={styles.detailHeader}>
                <h4>📍 Selected Detection</h4>
                <button 
                  className={styles.closeBtn}
                  onClick={() => setSelectedInsight(null)}
                  aria-label="Close detail"
                >
                  ✕
                </button>
              </div>
              <div className={styles.detailContent}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Object</span>
                  <span className={styles.detailValue}>{selectedInsight.objectClass}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Confidence</span>
                  <span className={styles.detailValue}>
                    {(selectedInsight.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={`${styles.detailValue} ${styles[selectedInsight.protocolStatus]}`}>
                    {selectedInsight.protocolStatus.toUpperCase()}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Camera</span>
                  <span className={styles.detailValue}>{selectedInsight.cameraId}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Time</span>
                  <span className={styles.detailValue}>
                    {new Date(selectedInsight.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className={styles.detailAnalysis}>
                  <span className={styles.detailLabel}>Analysis</span>
                  <p>{selectedInsight.deepAnalysis}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Column - Agent Insights */}
        <div className={styles.centerColumn}>
          <AgentInsightPanel
            insights={insights}
            maxDisplay={8}
            onInsightClick={handleInsightClick}
            showTimestamp={true}
          />
        </div>

        {/* Right Column - Protocol Timeline */}
        <div className={styles.rightColumn}>
          <ProtocolTimeline
            events={events}
            maxEvents={15}
            onEventClick={handleEventClick}
            filterStatus={filterStatus}
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div className={styles.footerStats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{insights.length}</span>
          <span className={styles.statLabel}>Total Insights</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {insights.filter(i => i.protocolStatus !== 'none').length}
          </span>
          <span className={styles.statLabel}>Active Protocols</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {insights.filter(i => i.protocolStatus === 'emergency' || i.protocolStatus === 'critical').length}
          </span>
          <span className={styles.statLabel}>High Priority</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {new Set(insights.map(i => i.cameraId)).size}
          </span>
          <span className={styles.statLabel}>Active Cameras</span>
        </div>
      </div>
    </div>
  );
}
