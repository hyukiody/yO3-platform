import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertCircle, BarChart3, TrendingUp, AlertTriangle, Zap, Clock, Eye } from 'lucide-react';
import styles from './AnalysisReportView.module.css';

interface AnalysisLog {
  id: number;
  analysisId: string;
  cameraId: string;
  analysisType: string;
  analysisStatus: string;
  eventCount: number;
  analysisStartTime: string;
  analysisEndTime: string;
  summary: string;
  detailedReport: string;
  keyFindings: string;
  anomalies: string;
  recommendations: string;
  statistics: string;
  llmModel: string;
  promptTokens: number;
  completionTokens: number;
  processingTimeMs: number;
  confidenceScore: number;
  createdAt: string;
}

interface AnalysisRequest {
  camera_id: string;
  start_time: string;
  end_time: string;
  analysis_type: 'SUMMARY' | 'DETAILED_REPORT' | 'TREND' | 'ANOMALY';
  requested_by: string;
}

const AnalysisReportView: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisLog[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'findings' | 'anomalies' | 'recommendations'>('summary');

  // Analysis request form
  const [formData, setFormData] = useState<AnalysisRequest>({
    camera_id: '',
    start_time: '',
    end_time: '',
    analysis_type: 'DETAILED_REPORT',
    requested_by: 'admin@example.com',
  });

  // Fetch recent analyses on component mount
  useEffect(() => {
    fetchRecentAnalyses();
  }, []);

  const fetchRecentAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8080/api/analysis/recent');
      if (!response.ok) throw new Error('Failed to fetch analyses');
      const data = await response.json();
      setAnalyses(data.analyses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:8080/api/analysis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create analysis');
      const result = await response.json();

      // Fetch the new analysis
      const analysisResponse = await fetch(`http://localhost:8080/api/analysis/${result.databaseId}`);
      if (analysisResponse.ok) {
        const newAnalysis = await analysisResponse.json();
        setAnalyses([newAnalysis, ...analyses]);
        setSelectedAnalysis(newAnalysis);
        setFormData({
          camera_id: '',
          start_time: '',
          end_time: '',
          analysis_type: 'DETAILED_REPORT',
          requested_by: 'admin@example.com',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const parseJson = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return jsonStr;
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      COMPLETED: '#10b981',
      PROCESSING: '#f59e0b',
      QUEUED: '#8b5cf6',
      FAILED: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getAnalysisTypeIcon = (type: string) => {
    switch (type) {
      case 'SUMMARY':
        return <BarChart3 size={18} />;
      case 'DETAILED_REPORT':
        return <Eye size={18} />;
      case 'TREND':
        return <TrendingUp size={18} />;
      case 'ANOMALY':
        return <AlertTriangle size={18} />;
      default:
        return <Zap size={18} />;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Analysis & Reporting</h1>
        <p>LLM-powered event analysis and natural language report generation</p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Request Form */}
      <div className={styles.formSection}>
        <h2>Create New Analysis</h2>
        <form onSubmit={handleCreateAnalysis} className={styles.form}>
          <div className={styles.formRow}>
            <input
              type="text"
              placeholder="Camera ID (e.g., camera-001)"
              value={formData.camera_id}
              onChange={(e) => setFormData({ ...formData, camera_id: e.target.value })}
              required
            />
            <select
              value={formData.analysis_type}
              onChange={(e) => setFormData({ ...formData, analysis_type: e.target.value as any })}
            >
              <option value="SUMMARY">Summary</option>
              <option value="DETAILED_REPORT">Detailed Report</option>
              <option value="TREND">Trend Analysis</option>
              <option value="ANOMALY">Anomaly Detection</option>
            </select>
          </div>

          <div className={styles.formRow}>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Processing...' : 'Run Analysis'}
          </button>
        </form>
      </div>

      {/* Analysis History */}
      <div className={styles.historySection}>
        <h2>Recent Analyses</h2>
        <div className={styles.analysisList}>
          {analyses.length === 0 ? (
            <p className={styles.emptyState}>No analyses yet. Create one above to get started.</p>
          ) : (
            analyses.map((analysis) => (
              <div
                key={analysis.id}
                className={`${styles.analysisCard} ${selectedAnalysis?.id === analysis.id ? styles.selected : ''}`}
                onClick={() => setSelectedAnalysis(analysis)}
              >
                <div className={styles.analysisCardHeader}>
                  <div className={styles.typeIcon}>{getAnalysisTypeIcon(analysis.analysisType)}</div>
                  <div className={styles.analysisCardInfo}>
                    <h3>{analysis.analysisType}</h3>
                    <p>{analysis.cameraId}</p>
                  </div>
                  <div className={styles.analysisCardMeta}>
                    <span
                      className={styles.status}
                      style={{ backgroundColor: getStatusColor(analysis.analysisStatus) }}
                    >
                      {analysis.analysisStatus}
                    </span>
                    <span className={styles.eventCount}>{analysis.eventCount} events</span>
                  </div>
                </div>
                <div className={styles.analysisCardTime}>
                  <Clock size={14} />
                  {format(new Date(analysis.createdAt), 'MMM dd, HH:mm:ss')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Analysis Details */}
      {selectedAnalysis && selectedAnalysis.analysisStatus === 'COMPLETED' && (
        <div className={styles.detailsSection}>
          <h2>Analysis Report: {selectedAnalysis.analysisType}</h2>

          <div className={styles.metaInfo}>
            <div className={styles.metaItem}>
              <span className={styles.label}>Camera:</span>
              <span>{selectedAnalysis.cameraId}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.label}>Events Analyzed:</span>
              <span>{selectedAnalysis.eventCount}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.label}>Processing Time:</span>
              <span>{selectedAnalysis.processingTimeMs}ms</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.label}>LLM Model:</span>
              <span>{selectedAnalysis.llmModel}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.label}>Confidence:</span>
              <span>{(selectedAnalysis.confidenceScore * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'summary' ? styles.active : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'detailed' ? styles.active : ''}`}
              onClick={() => setActiveTab('detailed')}
            >
              Detailed Report
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'findings' ? styles.active : ''}`}
              onClick={() => setActiveTab('findings')}
            >
              Key Findings
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'anomalies' ? styles.active : ''}`}
              onClick={() => setActiveTab('anomalies')}
            >
              Anomalies
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'recommendations' ? styles.active : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              Recommendations
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === 'summary' && (
              <div className={styles.content}>
                <h3>Analysis Summary</h3>
                <p>{selectedAnalysis.summary || 'No summary available'}</p>
              </div>
            )}

            {activeTab === 'detailed' && (
              <div className={styles.content}>
                <h3>Detailed Report</h3>
                <p>{selectedAnalysis.detailedReport || 'No detailed report available'}</p>
              </div>
            )}

            {activeTab === 'findings' && (
              <div className={styles.content}>
                <h3>Key Findings</h3>
                <p>{selectedAnalysis.keyFindings || 'No key findings available'}</p>
              </div>
            )}

            {activeTab === 'anomalies' && (
              <div className={styles.content}>
                <h3>Detected Anomalies</h3>
                <p>{selectedAnalysis.anomalies || 'No anomalies detected'}</p>
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className={styles.content}>
                <h3>Recommendations</h3>
                <p>{selectedAnalysis.recommendations || 'No recommendations available'}</p>
              </div>
            )}
          </div>

          {/* Statistics */}
          {selectedAnalysis.statistics && (
            <div className={styles.statisticsSection}>
              <h3>Statistics</h3>
              <pre className={styles.statsJson}>
                {JSON.stringify(parseJson(selectedAnalysis.statistics), null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {selectedAnalysis && selectedAnalysis.analysisStatus !== 'COMPLETED' && (
        <div className={styles.processingBox}>
          <div className={styles.spinner}></div>
          <p>Analysis Status: <strong>{selectedAnalysis.analysisStatus}</strong></p>
          <p>This analysis is currently being processed. Check back shortly for results.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisReportView;
