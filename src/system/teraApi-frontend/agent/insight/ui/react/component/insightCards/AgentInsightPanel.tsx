import { useMemo } from 'react';
import styles from './AgentInsightPanel.module.css';

export interface AgentInsight {
  id: string;
  objectClass: string;
  confidence: number;
  deepAnalysis: string;
  protocolStatus: 'none' | 'monitoring' | 'alert' | 'critical' | 'emergency';
  timestamp: number;
  cameraId?: string;
}

interface AgentInsightPanelProps {
  insights: AgentInsight[];
  maxDisplay?: number;
  onInsightClick?: (insight: AgentInsight) => void;
  showTimestamp?: boolean;
  compact?: boolean;
}

const PROTOCOL_COLORS: Record<string, string> = {
  none: '#4a4a4a',
  monitoring: '#4ECDC4',
  alert: '#FFE66D',
  critical: '#FF6B6B',
  emergency: '#e94560',
};

const PROTOCOL_LABELS: Record<string, string> = {
  none: 'Normal',
  monitoring: 'Monitoring',
  alert: 'Alert',
  critical: 'Critical',
  emergency: 'Emergency',
};

export function getProtocolColor(status: string): string {
  return PROTOCOL_COLORS[status] || PROTOCOL_COLORS.none;
}

export function getProtocolLabel(status: string): string {
  return PROTOCOL_LABELS[status] || 'Unknown';
}

export default function AgentInsightPanel({
  insights,
  maxDisplay = 5,
  onInsightClick,
  showTimestamp = true,
  compact = false,
}: AgentInsightPanelProps) {
  const displayedInsights = useMemo(() => 
    insights.slice(0, maxDisplay), 
    [insights, maxDisplay]
  );

  const hasHighPriority = useMemo(() =>
    insights.some(i => i.protocolStatus === 'critical' || i.protocolStatus === 'emergency'),
    [insights]
  );

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    insights.forEach(i => {
      counts[i.protocolStatus] = (counts[i.protocolStatus] || 0) + 1;
    });
    return counts;
  }, [insights]);

  if (insights.length === 0) {
    return (
      <div className={styles.panel} data-testid="agent-insight-panel">
        <div className={styles.header}>
          <span className={styles.icon}>🤖</span>
          <h4 className={styles.title}>Agent Insight</h4>
        </div>
        <div className={styles.emptyState} data-testid="empty-state">
          <span className={styles.emptyIcon}>🔍</span>
          <p>No agent insights available. Start monitoring to see AI-powered scene analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.panel} ${compact ? styles.compact : ''}`}
      data-testid="agent-insight-panel"
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>🤖</span>
          <h4 className={styles.title}>Agent Insight</h4>
          <span className={styles.count}>({insights.length})</span>
        </div>
        
        {hasHighPriority && (
          <span className={styles.priorityBadge} data-testid="high-priority-badge">
            ⚠️ HIGH PRIORITY
          </span>
        )}
      </div>

      {/* Protocol Summary Bar */}
      <div className={styles.summaryBar} data-testid="protocol-summary">
        {Object.entries(priorityCounts).map(([status, count]) => (
          <div 
            key={status} 
            className={styles.summaryItem}
            style={{ borderColor: getProtocolColor(status) }}
          >
            <span 
              className={styles.summaryDot} 
              style={{ backgroundColor: getProtocolColor(status) }}
            />
            <span className={styles.summaryLabel}>{getProtocolLabel(status)}</span>
            <span className={styles.summaryCount}>{count}</span>
          </div>
        ))}
      </div>

      {/* Insight Cards */}
      <div className={styles.insightList}>
        {displayedInsights.map((insight) => (
          <div
            key={insight.id}
            className={`${styles.insightCard} ${onInsightClick ? styles.clickable : ''}`}
            style={{ borderLeftColor: getProtocolColor(insight.protocolStatus) }}
            onClick={() => onInsightClick?.(insight)}
            data-testid={`insight-card-${insight.id}`}
            role={onInsightClick ? 'button' : undefined}
            tabIndex={onInsightClick ? 0 : undefined}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardLeft}>
                <span className={styles.objectClass}>{insight.objectClass}</span>
                <span className={styles.confidence}>
                  {(insight.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className={styles.cardRight}>
                {insight.protocolStatus !== 'none' && (
                  <span 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getProtocolColor(insight.protocolStatus) }}
                    data-testid={`status-badge-${insight.protocolStatus}`}
                  >
                    {insight.protocolStatus.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            
            <p className={styles.analysis}>{insight.deepAnalysis}</p>
            
            {showTimestamp && (
              <div className={styles.cardFooter}>
                <span className={styles.timestamp}>
                  {new Date(insight.timestamp).toLocaleTimeString()}
                </span>
                {insight.cameraId && (
                  <span className={styles.cameraId}>📷 {insight.cameraId}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {insights.length > maxDisplay && (
        <div className={styles.moreIndicator}>
          +{insights.length - maxDisplay} more insights
        </div>
      )}
    </div>
  );
}
