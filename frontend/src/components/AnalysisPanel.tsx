import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReports } from '../hooks/useReports';

interface AnalysisPanelProps {
  token: string;
  onClose: () => void;
}

interface Report {
  id: string;
  reportId: string;
  timeWindow: string;
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recurrencePattern: string;
  generatedAt: string;
  startTime: string;
  endTime: string;
  eventLogs: EventLog[];
}

interface EventLog {
  eventId: string;
  type: string;
  deviceId: string;
  timestamp: string;
  confidence: number;
}

export default function AnalysisPanel({ token, onClose }: AnalysisPanelProps) {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Usar React Query para buscar relatórios
  const { data: reports = [], isLoading, error, refetch } = useReports(token);

  // Auto-selecionar primeiro relatório quando os dados carregarem
  if (reports.length > 0 && !selectedReport) {
    setSelectedReport(reports[0]);
  }

  const handleRefresh = () => {
    refetch();
  };

  const noDataMessage = !isLoading && reports.length === 0 
    ? (t('analysis.noReportsAvailable') || 'No reports available. Start monitoring events to generate reports.')
    : null;

  return (
    <div className="analysis-panel-overlay">
      <div className="analysis-panel">
        <div className="analysis-header">
          <h2>📊 {t('analysis.title') || 'Event Analysis Reports'}</h2>
          <div className="header-actions">
            <button className="refresh-btn" onClick={handleRefresh} title="Refresh reports">
              🔄
            </button>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {isLoading && (
          <div className="loading-state">
            <span className="spinner"></span>
            {t('analysis.loading') || 'Loading reports...'}
          </div>
        )}

        {error && (
          <div className="error-state">
            <span>⚠️</span>
            <div>
              <strong>{error instanceof Error ? error.message : 'Error loading reports'}</strong>
              <button onClick={handleRefresh} className="retry-btn">Retry</button>
            </div>
          </div>
        )}

        {noDataMessage && !isLoading && (
          <div className="no-data-state">
            <span className="no-data-icon">📭</span>
            <p>{noDataMessage}</p>
            <small>Events will appear here once your cameras/sensors start sending detection data.</small>
            <button onClick={handleRefresh} className="check-again-btn">
              Check Again
            </button>
          </div>
        )}

        {!isLoading && !error && reports.length > 0 && (
          <div className="reports-container">
            {/* Reports List Sidebar */}
            <div className="reports-list">
              <h3>{t('analysis.availableReports') || 'Available Reports'}</h3>
              <div className="report-items">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`report-item ${selectedReport?.id === report.id ? 'active' : ''}`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="report-item-header">
                      <span className="report-window">{report.timeWindow}</span>
                      <span className="report-events">{report.totalEvents} events</span>
                    </div>
                    <div className="report-item-date">
                      {new Date(report.generatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Details */}
            {selectedReport && (
              <div className="report-details">
                <div className="report-summary">
                  <div className="summary-card">
                    <div className="summary-label">{t('analysis.totalEvents') || 'Total Events'}</div>
                    <div className="summary-value">{selectedReport.totalEvents}</div>
                  </div>
                  
                  <div className="summary-card">
                    <div className="summary-label">{t('analysis.timeWindow') || 'Time Window'}</div>
                    <div className="summary-value">{selectedReport.timeWindow}</div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-label">{t('analysis.recurrence') || 'Recurrence'}</div>
                    <div className="summary-value">{selectedReport.recurrencePattern}</div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-label">{t('analysis.generated') || 'Generated'}</div>
                    <div className="summary-value-time">
                      {new Date(selectedReport.generatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="report-time-range">
                  <span>📅 {new Date(selectedReport.startTime).toLocaleString()}</span>
                  <span>→</span>
                  <span>{new Date(selectedReport.endTime).toLocaleString()}</span>
                </div>

                {/* Events by Type */}
                <div className="analysis-section">
                  <h3>{t('analysis.byType') || 'Events by Type'}</h3>
                  <div className="event-breakdown">
                    {Object.entries(selectedReport.eventsByType).length > 0 ? (
                      Object.entries(selectedReport.eventsByType).map(([type, count]) => (
                        <div key={type} className="breakdown-item">
                          <span className="type-label">{type}</span>
                          <span className="type-count">{count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="empty-text">No event type data</p>
                    )}
                  </div>
                </div>

                {/* Events by Severity */}
                <div className="analysis-section">
                  <h3>{t('analysis.bySeverity') || 'Events by Severity'}</h3>
                  <div className="event-breakdown">
                    {Object.entries(selectedReport.eventsBySeverity).length > 0 ? (
                      Object.entries(selectedReport.eventsBySeverity).map(([severity, count]) => (
                        <div key={severity} className="breakdown-item">
                          <span className="severity-label">{severity}</span>
                          <span className="severity-count">{count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="empty-text">No severity data</p>
                    )}
                  </div>
                </div>

                {/* Event Logs */}
                <div className="analysis-section">
                  <h3>{t('analysis.eventLogs') || 'Event Logs'}</h3>
                  <div className="event-logs">
                    {selectedReport.eventLogs && selectedReport.eventLogs.length > 0 ? (
                      selectedReport.eventLogs.slice(0, 15).map((log) => (
                        <div key={log.eventId} className="log-entry">
                          <div className="log-time">{new Date(log.timestamp).toLocaleString()}</div>
                          <div className="log-info">
                            <span className="log-type">{log.type}</span>
                            <span className="log-device">{log.deviceId}</span>
                            <span className="log-confidence">{(log.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-text">No event logs</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="analysis-footer">
          <button className="btn-continue" onClick={onClose}>
            {t('analysis.continueToDashboard') || 'Continue to Dashboard'} →
          </button>
        </div>
      </div>

      <style>{`
        .analysis-panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          z-index: 1000;
        }

        .analysis-panel {
          width: 100%;
          max-width: 1100px;
          max-height: 90vh;
          background: rgba(26, 26, 46, 0.98);
          border: 2px solid #00FFFF;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 0 40px rgba(0, 255, 255, 0.4);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #00FFFF;
          padding-bottom: 1rem;
        }

        .analysis-header h2 {
          color: #00FFFF;
          font-size: 1.75rem;
          margin: 0;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .refresh-btn, .close-btn {
          background: transparent;
          border: 2px solid #00FFFF;
          color: #00FFFF;
          font-size: 1.25rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .refresh-btn:hover, .close-btn:hover {
          background: rgba(0, 255, 255, 0.1);
          transform: scale(1.1);
        }

        .refresh-btn:hover {
          animation: rotate 0.5s ease;
        }

        @keyframes rotate {
          from { transform: rotate(0deg) scale(1.1); }
          to { transform: rotate(360deg) scale(1.1); }
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 3rem;
          color: #8892b0;
          font-size: 1.1rem;
        }

        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid #00FFFF;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-state {
          padding: 1.5rem;
          background: rgba(255, 69, 58, 0.15);
          border: 1px solid #ff453a;
          color: #ff6961;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .error-state strong {
          color: #ff6961;
        }

        .retry-btn {
          background: rgba(255, 69, 58, 0.3);
          border: 1px solid #ff453a;
          color: #ff6961;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 0.5rem;
          transition: all 0.3s ease;
        }

        .retry-btn:hover {
          background: rgba(255, 69, 58, 0.5);
        }

        .no-data-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          gap: 1rem;
          text-align: center;
        }

        .no-data-icon {
          font-size: 4rem;
          opacity: 0.5;
        }

        .no-data-state p {
          color: #8892b0;
          font-size: 1.1rem;
          margin: 0;
          max-width: 500px;
        }

        .no-data-state small {
          color: #4a5568;
          font-size: 0.95rem;
        }

        .check-again-btn {
          background: linear-gradient(135deg, #00FFFF, #0080FF);
          color: #1a1a2e;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.3s ease;
        }

        .check-again-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 255, 255, 0.4);
        }

        .reports-container {
          flex: 1;
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 2rem;
          min-height: 0;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-right: 2px solid #2d3748;
          padding-right: 1.5rem;
        }

        .reports-list h3 {
          color: #00FFFF;
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .report-items {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .report-item {
          padding: 1rem;
          background: rgba(22, 33, 62, 0.6);
          border: 2px solid #2d3748;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .report-item:hover {
          border-color: #00FFFF;
          background: rgba(22, 33, 62, 0.9);
        }

        .report-item.active {
          border-color: #00FFFF;
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }

        .report-item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .report-window {
          color: #00FFFF;
          font-weight: 600;
        }

        .report-events {
          color: #ffa500;
          font-weight: 600;
        }

        .report-item-date {
          color: #8892b0;
          font-size: 0.85rem;
        }

        .report-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
        }

        .report-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .summary-card {
          padding: 1rem;
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 128, 255, 0.1));
          border: 2px solid #00FFFF;
          border-radius: 8px;
          text-align: center;
        }

        .summary-label {
          color: #8892b0;
          font-size: 0.85rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .summary-value {
          color: #00FFFF;
          font-size: 1.5rem;
          font-weight: 900;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
        }

        .summary-value-time {
          color: #00FFFF;
          font-size: 0.9rem;
          font-weight: 600;
          word-break: break-word;
        }

        .report-time-range {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 255, 255, 0.05);
          border: 1px dashed #00FFFF;
          border-radius: 8px;
          color: #8892b0;
          font-size: 0.9rem;
        }

        .analysis-section {
          background: rgba(0, 255, 255, 0.05);
          border: 2px solid #2d3748;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .analysis-section h3 {
          color: #00FFFF;
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.05rem;
        }

        .event-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: rgba(22, 33, 62, 0.8);
          border-radius: 6px;
          border-left: 3px solid #00FFFF;
        }

        .type-label, .severity-label {
          color: #8892b0;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .type-count, .severity-count {
          color: #00FFFF;
          font-weight: 700;
          font-size: 1rem;
        }

        .event-logs {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .log-entry {
          padding: 0.75rem;
          background: rgba(22, 33, 62, 0.6);
          border-left: 3px solid #0080FF;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }

        .log-time {
          color: #8892b0;
          min-width: 160px;
        }

        .log-info {
          display: flex;
          gap: 1rem;
          flex: 1;
        }

        .log-type {
          color: #00FFFF;
          font-weight: 600;
        }

        .log-device {
          color: #8892b0;
        }

        .log-confidence {
          color: #ffa500;
          font-weight: 600;
          min-width: 50px;
          text-align: right;
        }

        .empty-text {
          color: #4a5568;
          font-size: 0.9rem;
          margin: 1rem 0;
          text-align: center;
        }

        .analysis-footer {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 2px solid #2d3748;
        }

        .btn-continue {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #00FFFF, #0080FF);
          color: #1a1a2e;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .btn-continue:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 255, 255, 0.4);
        }

        @media (max-width: 900px) {
          .reports-container {
            grid-template-columns: 1fr;
          }

          .reports-list {
            border-right: none;
            border-bottom: 2px solid #2d3748;
            padding-right: 0;
            padding-bottom: 1rem;
          }

          .report-items {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
          }

          .report-item {
            min-width: 200px;
          }
        }

        @media (max-width: 640px) {
          .analysis-panel {
            max-height: 95vh;
            padding: 1rem;
          }

          .analysis-header h2 {
            font-size: 1.25rem;
          }

          .report-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .event-breakdown {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
