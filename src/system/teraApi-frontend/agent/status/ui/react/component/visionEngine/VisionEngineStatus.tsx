import { useState, useEffect, useCallback } from 'react';
import styles from './VisionEngineStatus.module.css';

export interface VisionEngineHealth {
  status: 'ready' | 'loading' | 'error' | 'offline';
  model: string;
  device: 'cpu' | 'cuda' | 'mps';
  memoryUsage?: number;
  requestsPerMinute?: number;
  avgResponseTime?: number;
  lastHealthCheck?: number;
  errorMessage?: string;
}

interface VisionEngineStatusProps {
  endpoint?: string;
  refreshInterval?: number;
  onStatusChange?: (health: VisionEngineHealth) => void;
  mockHealth?: VisionEngineHealth; // For testing/demo mode
}

const STATUS_CONFIG = {
  ready: { color: '#4ECDC4', label: 'Ready', icon: '✅' },
  loading: { color: '#FFE66D', label: 'Loading', icon: '⏳' },
  error: { color: '#FF6B6B', label: 'Error', icon: '❌' },
  offline: { color: '#666', label: 'Offline', icon: '⚫' },
};

export default function VisionEngineStatus({
  endpoint = '/api/v1/vision/health',
  refreshInterval = 30000,
  onStatusChange,
  mockHealth,
}: VisionEngineStatusProps) {
  const [health, setHealth] = useState<VisionEngineHealth>({
    status: 'offline',
    model: 'Unknown',
    device: 'cpu',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    // Use mock health if provided (demo mode)
    if (mockHealth) {
      setHealth(mockHealth);
      setLastUpdate(new Date());
      setIsLoading(false);
      onStatusChange?.(mockHealth);
      return;
    }

    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        const newHealth: VisionEngineHealth = {
          status: data.ready ? 'ready' : 'loading',
          model: data.model || 'vikhyatk/moondream2',
          device: data.device || 'cpu',
          memoryUsage: data.memory_usage,
          requestsPerMinute: data.requests_per_minute,
          avgResponseTime: data.avg_response_time,
          lastHealthCheck: Date.now(),
        };
        setHealth(newHealth);
        onStatusChange?.(newHealth);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const errorHealth: VisionEngineHealth = {
        status: 'error',
        model: health.model,
        device: health.device,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        lastHealthCheck: Date.now(),
      };
      setHealth(errorHealth);
      onStatusChange?.(errorHealth);
    } finally {
      setIsLoading(false);
      setLastUpdate(new Date());
    }
  }, [endpoint, mockHealth, onStatusChange, health.model, health.device]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchHealth, refreshInterval]);

  const statusConfig = STATUS_CONFIG[health.status];
  const formatTime = (ms?: number) => ms ? `${ms.toFixed(0)}ms` : '-';
  const formatMemory = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)}MB`;
  };

  return (
    <div className={styles.container} data-testid="vision-engine-status">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>🧠</span>
          <h4 className={styles.title}>Vision Engine</h4>
        </div>
        <div 
          className={styles.statusIndicator}
          style={{ backgroundColor: statusConfig.color }}
          data-testid="status-indicator"
        >
          <span className={styles.statusIcon}>{statusConfig.icon}</span>
          <span className={styles.statusLabel}>{statusConfig.label}</span>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingState} data-testid="loading-state">
          <div className={styles.spinner} />
          <span>Checking Vision Engine...</span>
        </div>
      ) : (
        <>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Model</span>
              <span className={styles.infoValue} data-testid="model-name">
                {health.model}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Device</span>
              <span className={styles.infoValue} data-testid="device-type">
                <span className={`${styles.deviceBadge} ${styles[health.device]}`}>
                  {health.device.toUpperCase()}
                </span>
              </span>
            </div>
          </div>

          <div className={styles.metricsRow}>
            <div className={styles.metric}>
              <span className={styles.metricValue} data-testid="response-time">
                {formatTime(health.avgResponseTime)}
              </span>
              <span className={styles.metricLabel}>Avg Response</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue} data-testid="requests-per-minute">
                {health.requestsPerMinute ?? '-'}
              </span>
              <span className={styles.metricLabel}>Req/min</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue} data-testid="memory-usage">
                {formatMemory(health.memoryUsage)}
              </span>
              <span className={styles.metricLabel}>Memory</span>
            </div>
          </div>

          {health.status === 'error' && health.errorMessage && (
            <div className={styles.errorMessage} data-testid="error-message">
              ⚠️ {health.errorMessage}
            </div>
          )}

          <div className={styles.footer}>
            {lastUpdate && (
              <span className={styles.lastUpdate}>
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button 
              className={styles.refreshBtn}
              onClick={fetchHealth}
              disabled={isLoading}
              aria-label="Refresh status"
              data-testid="refresh-button"
            >
              🔄 Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
