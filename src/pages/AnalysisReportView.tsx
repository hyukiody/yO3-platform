import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { 
  AlertCircle, BarChart3, TrendingUp, AlertTriangle, Zap, Clock, Eye,
  Search, MapPin, Shield, Play, Pause, XCircle, CheckCircle, Loader2,
  FileSearch, Activity, ClipboardCheck
} from 'lucide-react';
import styles from './AnalysisReportView.module.css';
import { getGDAIMode, applyGDAIConstraints } from '../contracts/Analysis';

// ═══════════════════════════════════════════════════════════════
// INTERFACES - SPEC-001 §4.2 TypeScript Contracts
// ═══════════════════════════════════════════════════════════════

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

// SPEC-001 Extended Analysis Job
interface AnalysisJob {
  jobId: string;
  procedureType: 'FORENSIC' | 'HEATMAP' | 'AUDIT';
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  currentStep: string;
  requestedBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  outputUrl?: string;
  errorMessage?: string;
  parameters: {
    targets: string[];
    timeWindow: { start: string; end: string };
    options: {
      includeSystemEvents?: boolean;
      exportFormat?: 'JSON' | 'CSV' | 'PDF';
      gdiMode?: 'DESKTOP' | 'TABLET' | 'MOBILE';
    };
  };
}

interface JobRequest {
  procedure: 'FORENSIC' | 'HEATMAP' | 'AUDIT';
  targets: string[];
  startTime: string;
  endTime: string;
  options: {
    includeSystemEvents?: boolean;
    exportFormat?: 'JSON' | 'CSV' | 'PDF';
  };
}

// WebSocket message types
interface WSMessage {
  type: 'JOB_UPDATE' | 'JOB_COMPLETE' | 'JOB_FAILED' | 'JOB_QUEUED' | 'SUBSCRIBE_ACK';
  jobId: string;
  status?: string;
  progress?: number;
  currentStep?: string;
  outputUrl?: string;
  errorMessage?: string;
  timestamp: number;
}

const AnalysisReportView: React.FC = () => {
  // Legacy analysis state
  const [analyses, setAnalyses] = useState<AnalysisLog[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'findings' | 'anomalies' | 'recommendations'>('summary');

  // SPEC-001 Extended Analysis state
  const [analysisMode, setAnalysisMode] = useState<'STANDARD' | 'EXTENDED'>('STANDARD');
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<AnalysisJob | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [gdaiMode, setGdaiMode] = useState(getGDAIMode());

  // Job request form
  const [jobForm, setJobForm] = useState<JobRequest>({
    procedure: 'FORENSIC',
    targets: [],
    startTime: '',
    endTime: '',
    options: {
      includeSystemEvents: false,
      exportFormat: 'JSON'
    }
  });
  const [targetInput, setTargetInput] = useState('');

  // Analysis request form (legacy)
  const [formData, setFormData] = useState<AnalysisRequest>({
    camera_id: '',
    start_time: '',
    end_time: '',
    analysis_type: 'DETAILED_REPORT',
    requested_by: 'admin@example.com',
  });

  // ═══════════════════════════════════════════════════════════════
  // GDAI VIEWPORT RESPONSIVE HANDLER
  // SPEC: SPEC-001 §3 - GDAI Assertions
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const handleResize = () => {
      const newMode = getGDAIMode();
      setGdaiMode(newMode);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // WEBSOCKET CONNECTION - Port 8082
  // SPEC: SPEC-001 - WebSocket Integration
  // ═══════════════════════════════════════════════════════════════

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('ws://localhost:8082/ws/jobs');
    
    ws.onopen = () => {
      console.log('[WS] Connected to job updates channel');
      setWsConnected(true);
      // Subscribe to all job updates
      ws.send(JSON.stringify({ type: 'SUBSCRIBE', channel: '/topic/jobs' }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleWSMessage(message);
      } catch (e) {
        console.error('[WS] Failed to parse message:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setWsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    wsRef.current = ws;
  }, []);

  const handleWSMessage = useCallback((message: WSMessage) => {
    console.log('[WS] Received:', message.type, message.jobId);

    setJobs(prevJobs => {
      const idx = prevJobs.findIndex(j => j.jobId === message.jobId);
      if (idx === -1) return prevJobs;

      const updatedJobs = [...prevJobs];
      const job = { ...updatedJobs[idx] };

      switch (message.type) {
        case 'JOB_UPDATE':
          job.status = message.status as AnalysisJob['status'];
          job.progress = message.progress ?? job.progress;
          job.currentStep = message.currentStep ?? job.currentStep;
          break;
        case 'JOB_COMPLETE':
          job.status = 'COMPLETED';
          job.progress = 100;
          job.outputUrl = message.outputUrl;
          break;
        case 'JOB_FAILED':
          job.status = 'FAILED';
          job.errorMessage = message.errorMessage;
          break;
      }

      updatedJobs[idx] = job;
      
      // Update selected job if it matches
      if (selectedJob?.jobId === message.jobId) {
        setSelectedJob(job);
      }

      return updatedJobs;
    });
  }, [selectedJob]);

  // Connect WebSocket when in extended mode
  useEffect(() => {
    if (analysisMode === 'EXTENDED') {
      connectWebSocket();
      fetchRecentJobs();
    }
    return () => {
      wsRef.current?.close();
    };
  }, [analysisMode, connectWebSocket]);

  // Fetch recent analyses on component mount
  useEffect(() => {
    fetchRecentAnalyses();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // EXTENDED ANALYSIS JOB FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  const fetchRecentJobs = async () => {
    try {
      const response = await fetch('http://localhost:8091/api/analysis/jobs/recent');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:8091/api/analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedure: jobForm.procedure,
          targets: jobForm.targets,
          startTime: jobForm.startTime,
          endTime: jobForm.endTime,
          options: jobForm.options,
          requestedBy: 'admin@example.com'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create job');
      }

      const newJob: AnalysisJob = await response.json();
      setJobs([newJob, ...jobs]);
      setSelectedJob(newJob);
      
      // Reset form
      setJobForm({
        procedure: 'FORENSIC',
        targets: [],
        startTime: '',
        endTime: '',
        options: { includeSystemEvents: false, exportFormat: 'JSON' }
      });
      setTargetInput('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:8091/api/analysis/jobs/${jobId}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to cancel job');
      
      // Update local state
      setJobs(jobs.map(j => 
        j.jobId === jobId ? { ...j, status: 'CANCELLED' as const } : j
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    }
  };

  const addTarget = () => {
    if (targetInput.trim() && !jobForm.targets.includes(targetInput.trim())) {
      setJobForm({
        ...jobForm,
        targets: [...jobForm.targets, targetInput.trim()]
      });
      setTargetInput('');
    }
  };

  const removeTarget = (target: string) => {
    setJobForm({
      ...jobForm,
      targets: jobForm.targets.filter(t => t !== target)
    });
  };

  const getProcedureIcon = (procedure: string) => {
    switch (procedure) {
      case 'FORENSIC': return <FileSearch size={18} />;
      case 'HEATMAP': return <Activity size={18} />;
      case 'AUDIT': return <ClipboardCheck size={18} />;
      default: return <Search size={18} />;
    }
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED': return <Clock size={16} className={styles.statusQueued} />;
      case 'PROCESSING': return <Loader2 size={16} className={styles.statusProcessing} />;
      case 'COMPLETED': return <CheckCircle size={16} className={styles.statusCompleted} />;
      case 'FAILED': return <XCircle size={16} className={styles.statusFailed} />;
      case 'CANCELLED': return <Pause size={16} className={styles.statusCancelled} />;
      default: return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LEGACY ANALYSIS FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

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
    <div className={`${styles.container} ${gdaiMode === 'TABLET' ? styles.tabletMode : ''}`}>
      <div className={styles.header}>
        <h1>Analysis & Reporting</h1>
        <p>LLM-powered event analysis and natural language report generation</p>
        
        {/* Mode Toggle - SPEC-001 Extended Analysis */}
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${analysisMode === 'STANDARD' ? styles.active : ''}`}
            onClick={() => setAnalysisMode('STANDARD')}
          >
            <BarChart3 size={16} />
            Standard Analysis
          </button>
          <button
            className={`${styles.modeBtn} ${analysisMode === 'EXTENDED' ? styles.active : ''}`}
            onClick={() => setAnalysisMode('EXTENDED')}
          >
            <Search size={16} />
            Extended Analysis
            {wsConnected && <span className={styles.wsIndicator} title="WebSocket Connected">●</span>}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EXTENDED ANALYSIS MODE - SPEC-001 Procedures
          ═══════════════════════════════════════════════════════════════ */}
      {analysisMode === 'EXTENDED' && (
        <>
          {/* Procedure Selection Form */}
          <div className={styles.formSection}>
            <h2>
              <Search size={20} />
              Create Extended Analysis Job
            </h2>
            
            {/* Procedure Type Tabs */}
            <div className={styles.procedureTabs}>
              <button
                className={`${styles.procedureTab} ${jobForm.procedure === 'FORENSIC' ? styles.active : ''}`}
                onClick={() => setJobForm({ ...jobForm, procedure: 'FORENSIC' })}
              >
                <FileSearch size={18} />
                <span>Forensic Deep Dive</span>
                <small>Incident reconstruction</small>
              </button>
              <button
                className={`${styles.procedureTab} ${jobForm.procedure === 'HEATMAP' ? styles.active : ''}`}
                onClick={() => setJobForm({ ...jobForm, procedure: 'HEATMAP' })}
              >
                <Activity size={18} />
                <span>Heatmap Generation</span>
                <small>Traffic zone visualization</small>
              </button>
              <button
                className={`${styles.procedureTab} ${jobForm.procedure === 'AUDIT' ? styles.active : ''}`}
                onClick={() => setJobForm({ ...jobForm, procedure: 'AUDIT' })}
              >
                <ClipboardCheck size={18} />
                <span>Compliance Audit</span>
                <small>Operator protocol verification</small>
              </button>
            </div>

            <form onSubmit={handleCreateJob} className={styles.form}>
              {/* Targets Input */}
              <div className={styles.targetsSection}>
                <label>Camera Targets</label>
                <div className={styles.targetInputRow}>
                  <input
                    type="text"
                    placeholder="Enter camera ID (e.g., camera-001)"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTarget())}
                  />
                  <button type="button" onClick={addTarget} className={styles.addTargetBtn}>
                    Add
                  </button>
                </div>
                {jobForm.targets.length > 0 && (
                  <div className={styles.targetTags}>
                    {jobForm.targets.map(target => (
                      <span key={target} className={styles.targetTag}>
                        {target}
                        <button type="button" onClick={() => removeTarget(target)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Window */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Start Time</label>
                  <input
                    type="datetime-local"
                    value={jobForm.startTime}
                    onChange={(e) => setJobForm({ ...jobForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Time</label>
                  <input
                    type="datetime-local"
                    value={jobForm.endTime}
                    onChange={(e) => setJobForm({ ...jobForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Options */}
              <div className={styles.optionsRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={jobForm.options.includeSystemEvents}
                    onChange={(e) => setJobForm({
                      ...jobForm,
                      options: { ...jobForm.options, includeSystemEvents: e.target.checked }
                    })}
                  />
                  Include System Events
                </label>
                <select
                  value={jobForm.options.exportFormat}
                  onChange={(e) => setJobForm({
                    ...jobForm,
                    options: { ...jobForm.options, exportFormat: e.target.value as 'JSON' | 'CSV' | 'PDF' }
                  })}
                  className={styles.exportSelect}
                >
                  <option value="JSON">Export: JSON</option>
                  <option value="CSV">Export: CSV</option>
                  <option value="PDF">Export: PDF</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={loading || jobForm.targets.length === 0} 
                className={styles.submitBtn}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Creating Job...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Start {jobForm.procedure} Analysis
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Jobs */}
          <div className={styles.historySection}>
            <h2>
              <Activity size={20} />
              Analysis Jobs
            </h2>
            <div className={styles.jobsList}>
              {jobs.length === 0 ? (
                <p className={styles.emptyState}>No analysis jobs yet. Create one above to get started.</p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.jobId}
                    className={`${styles.jobCard} ${selectedJob?.jobId === job.jobId ? styles.selected : ''}`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className={styles.jobCardHeader}>
                      <div className={styles.procedureIcon}>
                        {getProcedureIcon(job.procedureType)}
                      </div>
                      <div className={styles.jobCardInfo}>
                        <h3>{job.procedureType}</h3>
                        <p>{job.parameters.targets.join(', ')}</p>
                      </div>
                      <div className={styles.jobCardStatus}>
                        {getJobStatusIcon(job.status)}
                        <span className={styles[`status${job.status}`]}>{job.status}</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {(job.status === 'PROCESSING' || job.status === 'QUEUED') && (
                      <div className={styles.progressSection}>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill} 
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className={styles.progressText}>
                          {job.progress}% - {job.currentStep || 'Waiting...'}
                        </span>
                      </div>
                    )}

                    <div className={styles.jobCardFooter}>
                      <span className={styles.jobTime}>
                        <Clock size={14} />
                        {format(new Date(job.createdAt), 'MMM dd, HH:mm:ss')}
                      </span>
                      {job.status === 'PROCESSING' && (
                        <button 
                          className={styles.cancelBtn}
                          onClick={(e) => { e.stopPropagation(); handleCancelJob(job.jobId); }}
                        >
                          <XCircle size={14} />
                          Cancel
                        </button>
                      )}
                      {job.status === 'COMPLETED' && job.outputUrl && (
                        <a 
                          href={job.outputUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.downloadBtn}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Download Results
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Job Details */}
          {selectedJob && selectedJob.status === 'COMPLETED' && (
            <div className={styles.detailsSection}>
              <h2>{selectedJob.procedureType} Analysis Results</h2>
              <div className={styles.metaInfo}>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Job ID:</span>
                  <span>{selectedJob.jobId}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Cameras:</span>
                  <span>{selectedJob.parameters.targets.join(', ')}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Time Window:</span>
                  <span>
                    {format(new Date(selectedJob.parameters.timeWindow.start), 'MMM dd, HH:mm')} - 
                    {format(new Date(selectedJob.parameters.timeWindow.end), 'MMM dd, HH:mm')}
                  </span>
                </div>
              </div>
              {selectedJob.outputUrl && (
                <div className={styles.outputPreview}>
                  <h3>Output Preview</h3>
                  <p>Results available at: <a href={selectedJob.outputUrl}>{selectedJob.outputUrl}</a></p>
                </div>
              )}
            </div>
          )}

          {selectedJob && selectedJob.status === 'FAILED' && (
            <div className={styles.errorBox}>
              <AlertCircle size={20} />
              <div>
                <strong>Job Failed: {selectedJob.jobId}</strong>
                <p>{selectedJob.errorMessage || 'Unknown error occurred'}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STANDARD ANALYSIS MODE - Legacy LLM Analysis
          ═══════════════════════════════════════════════════════════════ */}
      {analysisMode === 'STANDARD' && (
        <>
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
        </>
      )}
    </div>
  );
};

export default AnalysisReportView;
