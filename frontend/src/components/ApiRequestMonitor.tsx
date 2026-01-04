import { useState, useEffect } from 'react';
import { requestLogger, type ApiRequest } from '../services/requestLogger';
import './ApiRequestMonitor.css';

interface ApiRequestMonitorProps {
  className?: string;
}

export default function ApiRequestMonitor({ className = '' }: ApiRequestMonitorProps) {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0, avgResponseTime: 0 });
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');

  useEffect(() => {
    // Subscribe to request log updates
    const unsubscribe = requestLogger.subscribe((logs) => {
      setRequests(logs);
      setStats(requestLogger.getStats());
    });

    return unsubscribe;
  }, []);

  const filteredRequests = requests.filter((req) => {
    if (filter === 'success') return req.success;
    if (filter === 'error') return !req.success;
    return true;
  });

  const getStatusColor = (success: boolean | undefined, status?: number) => {
    if (!success && status === undefined) return '#ff6b6b'; // Error/no response
    if (success) return '#51cf66'; // Success
    return '#ffa94d'; // Warning/other
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url, 'http://localhost');
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  };

  return (
    <div className={`api-request-monitor ${className}`}>
      {/* Header */}
      <div className="monitor-header">
        <div className="header-title" onClick={() => setExpanded(!expanded)}>
          <span className="title-icon">📡</span>
          <span className="title-text">API Request Monitor</span>
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
        </div>
        
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item success">
            <span className="stat-label">✓</span>
            <span className="stat-value">{stats.successful}</span>
          </div>
          <div className="stat-item error">
            <span className="stat-label">✕</span>
            <span className="stat-value">{stats.failed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg:</span>
            <span className="stat-value">{formatTime(stats.avgResponseTime)}</span>
          </div>
        </div>

        <button
          className="clear-btn"
          onClick={() => {
            requestLogger.clearLogs();
          }}
          title="Clear request logs"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="monitor-content">
          {/* Filter Tabs */}
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({requests.length})
            </button>
            <button
              className={`filter-tab ${filter === 'success' ? 'active' : ''}`}
              onClick={() => setFilter('success')}
            >
              Success ({stats.successful})
            </button>
            <button
              className={`filter-tab ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
            >
              Errors ({stats.failed})
            </button>
          </div>

          {/* Request List */}
          <div className="requests-list">
            {filteredRequests.length === 0 ? (
              <div className="empty-state">
                <span>📭 No {filter !== 'all' ? filter : ''} requests logged</span>
              </div>
            ) : (
              filteredRequests.slice(0, 20).map((req) => (
                <div key={req.id} className="request-item">
                  <div className="request-header">
                    <span
                      className="method-badge"
                      style={{
                        backgroundColor: {
                          GET: '#3498db',
                          POST: '#2ecc71',
                          PUT: '#f39c12',
                          DELETE: '#e74c3c',
                          PATCH: '#9b59b6',
                        }[req.method] || '#95a5a6',
                      }}
                    >
                      {req.method}
                    </span>

                    <div className="request-path">
                      <span className="port-badge">{req.port}</span>
                      <span className="endpoint">{formatUrl(req.url)}</span>
                    </div>

                    <div className="request-meta">
                      {req.status && (
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: getStatusColor(req.success, req.status),
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {req.status} {req.statusText}
                        </span>
                      )}
                      <span className="response-time" style={{ color: getStatusColor(req.success, req.status) }}>
                        {formatTime(req.responseTime)}
                      </span>
                    </div>
                  </div>

                  <div className="request-footer">
                    <span className="timestamp">
                      {new Date(req.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="status-indicator">
                      {req.success ? '✓ Success' : '✕ Failed'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
