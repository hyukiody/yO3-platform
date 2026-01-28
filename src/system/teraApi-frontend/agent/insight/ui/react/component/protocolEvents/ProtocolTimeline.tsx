import { useMemo } from 'react';
import styles from './ProtocolTimeline.module.css';
import { getProtocolColor, getProtocolLabel } from '@agent/insight/ui/react/component/insightCards/AgentInsightPanel';

export interface ProtocolEvent {
  id: string;
  timestamp: number;
  protocolStatus: 'none' | 'monitoring' | 'alert' | 'critical' | 'emergency';
  objectClass: string;
  description?: string;
  cameraId?: string;
}

interface ProtocolTimelineProps {
  events: ProtocolEvent[];
  maxEvents?: number;
  onEventClick?: (event: ProtocolEvent) => void;
  showTimeLabels?: boolean;
  filterStatus?: string | null;
}

const SEVERITY_ORDER: Record<string, number> = {
  emergency: 5,
  critical: 4,
  alert: 3,
  monitoring: 2,
  none: 1,
};

export default function ProtocolTimeline({
  events,
  maxEvents = 20,
  onEventClick,
  showTimeLabels = true,
  filterStatus = null,
}: ProtocolTimelineProps) {
  const sortedEvents = useMemo(() => {
    const filtered = filterStatus 
      ? events.filter(e => e.protocolStatus === filterStatus)
      : events;
    
    return [...filtered]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxEvents);
  }, [events, maxEvents, filterStatus]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    const recent = events.filter(e => e.timestamp > Date.now() - 3600000); // Last hour
    
    recent.forEach(e => {
      counts[e.protocolStatus] = (counts[e.protocolStatus] || 0) + 1;
    });

    const maxSeverity = events.length > 0 
      ? events.reduce((max, e) => 
          SEVERITY_ORDER[e.protocolStatus] > SEVERITY_ORDER[max.protocolStatus] ? e : max
        )
      : null;

    return { counts, maxSeverity, recentCount: recent.length };
  }, [events]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (events.length === 0) {
    return (
      <div className={styles.timeline} data-testid="protocol-timeline">
        <div className={styles.header}>
          <span className={styles.icon}>📊</span>
          <h4 className={styles.title}>Protocol Timeline</h4>
        </div>
        <div className={styles.emptyState} data-testid="empty-timeline">
          <span className={styles.emptyIcon}>⏳</span>
          <p>No protocol events recorded yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.timeline} data-testid="protocol-timeline">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>📊</span>
          <h4 className={styles.title}>Protocol Timeline</h4>
        </div>
        <div className={styles.statsBar}>
          <span className={styles.statItem} data-testid="recent-count">
            🕐 {stats.recentCount} events/hr
          </span>
          {stats.maxSeverity && stats.maxSeverity.protocolStatus !== 'none' && (
            <span 
              className={styles.maxSeverity}
              style={{ backgroundColor: getProtocolColor(stats.maxSeverity.protocolStatus) }}
              data-testid="max-severity"
            >
              Peak: {getProtocolLabel(stats.maxSeverity.protocolStatus)}
            </span>
          )}
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className={styles.filterPills} role="group" aria-label="Filter by status">
        {['monitoring', 'alert', 'critical', 'emergency'].map(status => (
          <button
            key={status}
            className={`${styles.filterPill} ${filterStatus === status ? styles.active : ''}`}
            style={{ 
              borderColor: getProtocolColor(status),
              backgroundColor: filterStatus === status ? getProtocolColor(status) : 'transparent'
            }}
            data-testid={`filter-${status}`}
            aria-pressed={filterStatus === status}
          >
            {stats.counts[status] || 0} {getProtocolLabel(status)}
          </button>
        ))}
      </div>

      {/* Timeline Events */}
      <div className={styles.eventList}>
        {sortedEvents.map((event, index) => (
          <div
            key={event.id}
            className={`${styles.eventItem} ${onEventClick ? styles.clickable : ''}`}
            onClick={() => onEventClick?.(event)}
            data-testid={`timeline-event-${event.id}`}
            role={onEventClick ? 'button' : undefined}
            tabIndex={onEventClick ? 0 : undefined}
          >
            {/* Timeline connector */}
            <div className={styles.connector}>
              <div 
                className={styles.dot}
                style={{ backgroundColor: getProtocolColor(event.protocolStatus) }}
              />
              {index < sortedEvents.length - 1 && (
                <div className={styles.line} />
              )}
            </div>

            {/* Event content */}
            <div className={styles.eventContent}>
              <div className={styles.eventHeader}>
                <span 
                  className={styles.statusBadge}
                  style={{ backgroundColor: getProtocolColor(event.protocolStatus) }}
                >
                  {event.protocolStatus.toUpperCase()}
                </span>
                <span className={styles.objectClass}>{event.objectClass}</span>
                {showTimeLabels && (
                  <span className={styles.timestamp}>{formatTime(event.timestamp)}</span>
                )}
              </div>
              
              {event.description && (
                <p className={styles.description}>{event.description}</p>
              )}
              
              {event.cameraId && (
                <span className={styles.cameraTag}>📷 {event.cameraId}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {events.length > maxEvents && (
        <div className={styles.moreIndicator}>
          Showing {maxEvents} of {events.length} events
        </div>
      )}
    </div>
  );
}
