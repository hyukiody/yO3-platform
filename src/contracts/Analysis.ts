/**
 * Analysis API Contracts - Frontend Module
 * 
 * SPEC: SPEC-001_EXTENDED_ANALYSIS.md §4.2
 * Re-exports from shared contracts with frontend-specific GDAI utilities
 * 
 * Source: teraApi/contracts/analysis/Analysis.ts
 */

// ═══════════════════════════════════════════════════════════════
// EVENT TAXONOMY
// ═══════════════════════════════════════════════════════════════

/**
 * Event Categories - Discriminator Union
 */
export type EventCategory = 'DETECTION' | 'BEHAVIOR' | 'SYSTEM';

/**
 * Detection Event Types - Basic object classification
 */
export type DetectionEventType = 'person' | 'car' | 'truck' | 'bicycle' | 'motorcycle' | 'animal';

/**
 * Behavioral Event Types - Temporal/contextual intelligence
 * Requires DeepSORT + state tracking across multiple frames
 */
export type BehaviorEventType = 'loitering' | 'tailgating' | 'abandoned' | 'aggression';

/**
 * System Integrity Event Types - Watchdog events
 */
export type SystemEventType = 'occlusion' | 'signal_loss' | 'vault_locked';

/**
 * Combined Event Type Union
 */
export type EventType = DetectionEventType | BehaviorEventType | SystemEventType;

/**
 * Severity Levels - Matches SPEC-001 §1 definitions
 */
export type EventSeverity = 'MONITORING' | 'ALERT' | 'CRITICAL' | 'EMERGENCY';

/**
 * Bounding Box - Detection region
 */
export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Behavioral Metadata - Extended context for behavior events
 */
export interface BehaviorMetadata {
  velocity?: number;           // m/s
  loiterDuration?: number;     // seconds
  roiTime?: number;            // seconds in Region of Interest
  ownerDistance?: number;      // meters (for abandoned objects)
  staticTime?: number;         // seconds stationary
  relatedObjectId?: string;    // For tailgating - the authorized user
}

/**
 * Comprehensive Event - Full event taxonomy
 * SPEC: SPEC-001 §4.2
 */
export interface ComprehensiveEvent {
  id: string;
  timestamp: number;
  sourceId: string; // Camera or System Node ID
  
  // Discriminator Union
  category: EventCategory;
  
  // Detailed Classification
  type: EventType;
  
  // Severity Level
  severity: EventSeverity;
  
  // Contextual Data
  metadata: {
    confidence: number;
    boundingBox?: BoundingBox;
    logicAssertion?: string;      // e.g., "Time > 30s"
    snapshotUrl?: string;         // Encrypted Blob URL
    behaviorData?: BehaviorMetadata;
  };
  
  // Event Chaining
  relatedEventId?: string;        // Self-referencing for event chains
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS PROFILES - SHOWCASE & PRODUCTION MODES
// ═══════════════════════════════════════════════════════════════

/**
 * Analysis Profile Mode
 * 
 * VANILLA: Showcase mode - Balanced detection with demo-friendly settings
 * VIGILANT: Production mode - Maximum sensitivity, rigorous full analysis
 */
export type AnalysisProfileMode = 'VANILLA' | 'VIGILANT';

/**
 * Detection Sensitivity Levels
 */
export type DetectionSensitivity = 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';

/**
 * Analysis Profile Configuration
 * Defines operational parameters for live analysis
 */
export interface AnalysisProfile {
  mode: AnalysisProfileMode;
  name: string;
  description: string;
  
  // Detection Parameters
  detection: {
    sensitivity: DetectionSensitivity;
    confidenceThreshold: number;      // 0.0-1.0 (VANILLA: 0.65, VIGILANT: 0.35)
    minObjectSize: number;            // pixels (VANILLA: 50, VIGILANT: 20)
    maxObjectSize: number;            // pixels (VANILLA: 2000, VIGILANT: 5000)
    enableTracking: boolean;          // DeepSORT multi-frame tracking
    trackingPersistence: number;      // frames to maintain lost tracks
  };
  
  // Behavioral Analysis
  behavioral: {
    enabled: boolean;
    loiteringThreshold: number;       // seconds (VANILLA: 60, VIGILANT: 30)
    tailgatingWindow: number;         // seconds (VANILLA: 2.0, VIGILANT: 1.5)
    abandonedObjectTimeout: number;   // seconds (VANILLA: 180, VIGILANT: 120)
    aggressionDetection: boolean;     // pose estimation analysis
  };
  
  // System Integrity Monitoring
  integrity: {
    occlusionDetection: boolean;
    signalLossThreshold: number;      // percentage (VANILLA: 60, VIGILANT: 40)
    frameGapTolerance: number;        // seconds (VANILLA: 10, VIGILANT: 5)
    autoRecovery: boolean;
  };
  
  // Alert Configuration
  alerts: {
    enableRealtime: boolean;
    minSeverity: EventSeverity;       // Minimum severity to trigger alerts
    cooldownPeriod: number;           // seconds between same-type alerts
    escalationEnabled: boolean;       // Auto-escalate repeated events
  };
  
  // Performance Tuning
  performance: {
    maxFPS: number;                   // Target frame rate
    gpuAcceleration: boolean;
    batchSize: number;                // Inference batch size
    asyncProcessing: boolean;
  };
}

/**
 * VANILLA PROFILE - Showcase/Demo Mode
 * 
 * Optimized for demonstrations with balanced detection.
 * Reduces false positives for cleaner showcase experience.
 */
export const VANILLA_PROFILE: AnalysisProfile = {
  mode: 'VANILLA',
  name: 'Vanilla Showcase',
  description: 'Balanced detection profile for demonstrations and showcases',
  
  detection: {
    sensitivity: 'MEDIUM',
    confidenceThreshold: 0.65,
    minObjectSize: 50,
    maxObjectSize: 2000,
    enableTracking: true,
    trackingPersistence: 15,
  },
  
  behavioral: {
    enabled: true,
    loiteringThreshold: 60,
    tailgatingWindow: 2.0,
    abandonedObjectTimeout: 180,
    aggressionDetection: false,
  },
  
  integrity: {
    occlusionDetection: true,
    signalLossThreshold: 60,
    frameGapTolerance: 10,
    autoRecovery: true,
  },
  
  alerts: {
    enableRealtime: true,
    minSeverity: 'ALERT',
    cooldownPeriod: 30,
    escalationEnabled: false,
  },
  
  performance: {
    maxFPS: 15,
    gpuAcceleration: true,
    batchSize: 4,
    asyncProcessing: true,
  },
};

/**
 * VIGILANT PROFILE - Rigorous Production Mode
 * 
 * Maximum sensitivity for full live analysis.
 * Prioritizes detection coverage over false positive reduction.
 * SPEC: SPEC-001 §5.1 - Production Requirements
 */
export const VIGILANT_PROFILE: AnalysisProfile = {
  mode: 'VIGILANT',
  name: 'Rigorous Vigilant',
  description: 'Maximum sensitivity profile for production surveillance',
  
  detection: {
    sensitivity: 'MAXIMUM',
    confidenceThreshold: 0.35,
    minObjectSize: 20,
    maxObjectSize: 5000,
    enableTracking: true,
    trackingPersistence: 30,
  },
  
  behavioral: {
    enabled: true,
    loiteringThreshold: 30,
    tailgatingWindow: 1.5,
    abandonedObjectTimeout: 120,
    aggressionDetection: true,
  },
  
  integrity: {
    occlusionDetection: true,
    signalLossThreshold: 40,
    frameGapTolerance: 5,
    autoRecovery: true,
  },
  
  alerts: {
    enableRealtime: true,
    minSeverity: 'MONITORING',
    cooldownPeriod: 10,
    escalationEnabled: true,
  },
  
  performance: {
    maxFPS: 30,
    gpuAcceleration: true,
    batchSize: 8,
    asyncProcessing: true,
  },
};

/**
 * Get analysis profile by mode
 */
export const getAnalysisProfile = (mode: AnalysisProfileMode): AnalysisProfile => {
  return mode === 'VIGILANT' ? VIGILANT_PROFILE : VANILLA_PROFILE;
};

/**
 * Runtime profile state for live switching
 */
export interface AnalysisProfileState {
  currentProfile: AnalysisProfile;
  activeSince: number;           // Unix timestamp
  eventsProcessed: number;
  alertsGenerated: number;
  lastSwitchReason?: string;
}

/**
 * Create initial profile state
 */
export const createProfileState = (
  mode: AnalysisProfileMode = 'VANILLA'
): AnalysisProfileState => ({
  currentProfile: getAnalysisProfile(mode),
  activeSince: Date.now(),
  eventsProcessed: 0,
  alertsGenerated: 0,
});

/**
 * Switch analysis profile at runtime
 */
export const switchProfile = (
  state: AnalysisProfileState,
  newMode: AnalysisProfileMode,
  reason?: string
): AnalysisProfileState => ({
  currentProfile: getAnalysisProfile(newMode),
  activeSince: Date.now(),
  eventsProcessed: 0,
  alertsGenerated: 0,
  lastSwitchReason: reason,
});

// ═══════════════════════════════════════════════════════════════
// ENTERPRISE FAIL-PROOF SYSTEM - VIGILANT LIVE PREVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Enterprise Edition Type
 */
export type EnterpriseEdition = 'STANDARD' | 'ENTERPRISE' | 'ENTERPRISE_PLUS';

/**
 * Fail-Proof Recovery Strategy
 */
export type RecoveryStrategy = 
  | 'IMMEDIATE_RESTART'      // Restart analysis pipeline instantly
  | 'GRACEFUL_DEGRADATION'   // Reduce functionality, maintain core
  | 'FAILOVER_BACKUP'        // Switch to backup processing node
  | 'QUEUE_AND_RETRY';       // Queue events for later processing

/**
 * Health Check Status
 */
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';

/**
 * Enterprise Fail-Proof Configuration
 * RIGOROUS VIGILANT MODE - Zero tolerance for data loss
 */
export interface FailProofConfig {
  enabled: boolean;
  edition: EnterpriseEdition;
  
  // Redundancy Settings
  redundancy: {
    enableMultiNode: boolean;          // Distributed processing
    backupNodeCount: number;           // Hot standby nodes
    dataReplication: boolean;          // Real-time event replication
    replicationFactor: number;         // 1-3 replicas
  };
  
  // Health Monitoring
  healthCheck: {
    intervalMs: number;                // Health check frequency
    timeoutMs: number;                 // Max response time
    consecutiveFailures: number;       // Failures before action
    autoRecover: boolean;              // Automatic recovery attempts
  };
  
  // Circuit Breaker Pattern
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;          // Failures to open circuit
    resetTimeoutMs: number;            // Time before retry
    halfOpenRequests: number;          // Test requests in half-open
  };
  
  // Event Persistence
  persistence: {
    enableWAL: boolean;                // Write-Ahead Logging
    bufferSize: number;                // Events before flush
    flushIntervalMs: number;           // Max time before flush
    retentionDays: number;             // Event retention period
  };
  
  // Recovery Actions
  recovery: {
    strategy: RecoveryStrategy;
    maxRetries: number;
    retryDelayMs: number;
    escalateAfterRetries: number;      // Alert after N retries
  };
}

/**
 * Live Preview Session State
 */
export interface LivePreviewSession {
  sessionId: string;
  startedAt: number;
  profile: AnalysisProfile;
  failProof: FailProofConfig;
  
  // Real-time Metrics
  metrics: {
    framesProcessed: number;
    eventsDetected: number;
    alertsTriggered: number;
    avgLatencyMs: number;
    peakLatencyMs: number;
    droppedFrames: number;
    recoveryCount: number;
  };
  
  // Health Status
  health: {
    status: HealthStatus;
    lastCheckAt: number;
    uptime: number;
    errorRate: number;               // Errors per minute
    memoryUsageMB: number;
    cpuUsagePercent: number;
    gpuUsagePercent?: number;
  };
  
  // Active Sources
  sources: {
    cameraId: string;
    status: HealthStatus;
    fps: number;
    resolution: string;
    lastFrameAt: number;
  }[];
}

/**
 * ENTERPRISE FAIL-PROOF CONFIGURATION
 * Maximum reliability for production surveillance
 */
export const ENTERPRISE_FAILPROOF_CONFIG: FailProofConfig = {
  enabled: true,
  edition: 'ENTERPRISE_PLUS',
  
  redundancy: {
    enableMultiNode: true,
    backupNodeCount: 2,
    dataReplication: true,
    replicationFactor: 3,
  },
  
  healthCheck: {
    intervalMs: 1000,                  // Check every second
    timeoutMs: 500,                    // 500ms timeout
    consecutiveFailures: 3,            // 3 strikes
    autoRecover: true,
  },
  
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeoutMs: 30000,             // 30 second reset
    halfOpenRequests: 3,
  },
  
  persistence: {
    enableWAL: true,                   // Write-ahead logging
    bufferSize: 100,                   // Flush every 100 events
    flushIntervalMs: 1000,             // Or every second
    retentionDays: 90,                 // 90 day retention
  },
  
  recovery: {
    strategy: 'FAILOVER_BACKUP',
    maxRetries: 5,
    retryDelayMs: 1000,
    escalateAfterRetries: 3,
  },
};

/**
 * Create Enterprise Live Preview Session
 * RIGOROUS VIGILANT MODE with FAIL-PROOF guarantees
 */
export const createLivePreviewSession = (
  cameraIds: string[],
  options?: Partial<{ profile: AnalysisProfileMode; failProof: Partial<FailProofConfig> }>
): LivePreviewSession => {
  const profile = getAnalysisProfile(options?.profile ?? 'VIGILANT');
  
  return {
    sessionId: `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startedAt: Date.now(),
    profile,
    failProof: {
      ...ENTERPRISE_FAILPROOF_CONFIG,
      ...options?.failProof,
    },
    metrics: {
      framesProcessed: 0,
      eventsDetected: 0,
      alertsTriggered: 0,
      avgLatencyMs: 0,
      peakLatencyMs: 0,
      droppedFrames: 0,
      recoveryCount: 0,
    },
    health: {
      status: 'HEALTHY',
      lastCheckAt: Date.now(),
      uptime: 0,
      errorRate: 0,
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
    },
    sources: cameraIds.map(cameraId => ({
      cameraId,
      status: 'HEALTHY' as HealthStatus,
      fps: profile.performance.maxFPS,
      resolution: '1920x1080',
      lastFrameAt: Date.now(),
    })),
  };
};

/**
 * Update session metrics
 */
export const updateSessionMetrics = (
  session: LivePreviewSession,
  update: Partial<LivePreviewSession['metrics']>
): LivePreviewSession => ({
  ...session,
  metrics: { ...session.metrics, ...update },
  health: {
    ...session.health,
    lastCheckAt: Date.now(),
    uptime: Date.now() - session.startedAt,
  },
});

/**
 * Handle session recovery
 */
export const handleSessionRecovery = (
  session: LivePreviewSession,
  error: string
): LivePreviewSession => {
  const { recovery } = session.failProof;
  const newRecoveryCount = session.metrics.recoveryCount + 1;
  
  // Determine new health status
  let newStatus: HealthStatus = 'DEGRADED';
  if (newRecoveryCount >= recovery.maxRetries) {
    newStatus = 'CRITICAL';
  }
  
  return {
    ...session,
    metrics: {
      ...session.metrics,
      recoveryCount: newRecoveryCount,
    },
    health: {
      ...session.health,
      status: newStatus,
      lastCheckAt: Date.now(),
      errorRate: session.health.errorRate + 1,
    },
  };
};

/**
 * Check if session requires escalation
 */
export const requiresEscalation = (session: LivePreviewSession): boolean => {
  const { recovery } = session.failProof;
  return (
    session.metrics.recoveryCount >= recovery.escalateAfterRetries ||
    session.health.status === 'CRITICAL' ||
    session.health.errorRate > 10 // More than 10 errors/min
  );
};

/**
 * VIGILANT LIVE ANALYSIS ASSERTION
 * Validates session is in rigorous mode with fail-proof guarantees
 */
export const assertVigilantMode = (session: LivePreviewSession): boolean => {
  return (
    session.profile.mode === 'VIGILANT' &&
    session.failProof.enabled &&
    session.failProof.edition === 'ENTERPRISE_PLUS' &&
    session.failProof.persistence.enableWAL &&
    session.failProof.redundancy.dataReplication &&
    session.health.status !== 'OFFLINE'
  );
};

// ═══════════════════════════════════════════════════════════════
// ANALYSIS JOB CONTRACTS
// ═══════════════════════════════════════════════════════════════

/**
 * Analysis Procedure Types
 * SPEC: SPEC-001 §2.1
 */
export type AnalysisProcedure = 'FORENSIC' | 'HEATMAP' | 'AUDIT';

/**
 * Export Formats
 */
export type ExportFormat = 'PDF' | 'ZIP' | 'JSON';

/**
 * GDAI Device Mode - General Design Access Interface
 * SPEC: SPEC-001 §3.1
 */
export type GDAIMode = 'TABLET' | 'DESKTOP';

/**
 * Time Window for Analysis
 */
export interface TimeWindow {
  start: string; // ISO-8601
  end: string;   // ISO-8601
}

/**
 * Analysis Job Request Options
 */
export interface AnalysisJobOptions {
  includeSystemEvents: boolean;
  exportFormat: ExportFormat;
  gdiMode?: GDAIMode; // GDAI Context for responsive adjustments
}

/**
 * Analysis Job Request Payload
 * SPEC: SPEC-001 §4.2
 */
export interface AnalysisJobRequest {
  procedure: AnalysisProcedure;
  targets: string[];           // Camera IDs
  timeWindow: TimeWindow;
  options: AnalysisJobOptions;
}

/**
 * Analysis Job Status
 */
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Analysis Job Response
 */
export interface AnalysisJobResponse {
  jobId: string;
  status: JobStatus;
  procedure: AnalysisProcedure;
  createdAt: string;
  completedAt?: string;
  outputUrl?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// GDAI ASSERTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extended GDAI Mode - Includes mobile for fine-grained control
 */
export type GDAIModeExtended = GDAIMode | 'MOBILE';

/**
 * Portable Medium Assertion
 * SPEC: SPEC-001 §3.1
 * 
 * Determines device mode based on viewport width:
 * - DESKTOP: >= 1024px
 * - TABLET: 768px - 1023px
 * - MOBILE: < 768px (extended mode)
 */
export const getGDAIMode = (): GDAIMode => {
  if (typeof window === 'undefined') return 'DESKTOP';
  return window.innerWidth < 1024 ? 'TABLET' : 'DESKTOP';
};

/**
 * Get extended GDAI mode including mobile
 */
export const getGDAIModeExtended = (): GDAIModeExtended => {
  if (typeof window === 'undefined') return 'DESKTOP';
  if (window.innerWidth < 768) return 'MOBILE';
  if (window.innerWidth < 1024) return 'TABLET';
  return 'DESKTOP';
};

/**
 * Generic GDAI config interface for constraint application
 */
export interface GDAIConfig {
  showSidebar?: boolean;
  columnsCount?: number;
  chartSize?: 'small' | 'medium' | 'large';
  [key: string]: unknown;
}

/**
 * Apply GDAI constraints to any configuration object
 * SPEC: SPEC-001 §3.1
 * 
 * Overload 1: Auto-detect mode from viewport
 * Overload 2: Apply specific mode constraints
 */
export function applyGDAIConstraints<T extends GDAIConfig>(config: T): T;
export function applyGDAIConstraints<T extends GDAIConfig>(config: T, mode: GDAIModeExtended): T;
export function applyGDAIConstraints<T extends GDAIConfig>(config: T, mode?: GDAIModeExtended): T {
  if (!config) return config;
  
  const effectiveMode = mode ?? getGDAIModeExtended();
  
  if (effectiveMode === 'DESKTOP') {
    return config;
  }
  
  if (effectiveMode === 'TABLET') {
    return {
      ...config,
      columnsCount: config.columnsCount ? Math.min(config.columnsCount, 2) : config.columnsCount,
      chartSize: config.chartSize === 'large' ? 'medium' : config.chartSize,
    };
  }
  
  // MOBILE mode - most constrained
  return {
    ...config,
    showSidebar: false,
    columnsCount: 1,
    chartSize: 'small',
  };
}

/**
 * Apply GDAI constraints specifically to AnalysisJobOptions
 * SPEC: SPEC-001 §3.1
 * 
 * Automatically adapts export format for portable devices:
 * - TABLET: Forces JSON export for bandwidth efficiency
 * - DESKTOP: Preserves user selection
 */
export const applyGDAIConstraintsToAnalysis = (options: AnalysisJobOptions): AnalysisJobOptions => {
  const mode = getGDAIMode();
  
  if (mode === 'TABLET') {
    return {
      ...options,
      exportFormat: 'JSON', // Lightweight data for portable
      gdiMode: 'TABLET',
    };
  }
  
  return {
    ...options,
    gdiMode: 'DESKTOP',
  };
};

// ═══════════════════════════════════════════════════════════════
// BEHAVIORAL EVENT TRIGGER CONFIGS
// ═══════════════════════════════════════════════════════════════

/**
 * Loitering Detection Config
 * SPEC: SPEC-001 §1.1
 */
export interface LoiteringConfig {
  maxVelocity: number;      // m/s (default: 0.2)
  minRoiTime: number;       // seconds (default: 30)
  targetClass: 'person';
}

/**
 * Tailgating Detection Config
 * SPEC: SPEC-001 §1.1
 */
export interface TailgatingConfig {
  maxTimeDelta: number;     // seconds (default: 1.5)
  gateZoneId: string;
}

/**
 * Abandoned Object Detection Config
 * SPEC: SPEC-001 §1.1
 */
export interface AbandonedObjectConfig {
  maxOwnerDistance: number; // meters (default: 5)
  minStaticTime: number;    // seconds (default: 120)
  targetClasses: string[];  // ['backpack', 'suitcase', 'bag']
}

/**
 * Occlusion Detection Config
 * SPEC: SPEC-001 §1.2
 */
export interface OcclusionConfig {
  minLux: number;           // (default: 10)
  minVariance: number;      // (default: 5)
}

/**
 * Signal Loss Detection Config
 * SPEC: SPEC-001 §1.2
 */
export interface SignalLossConfig {
  maxPacketLoss: number;    // percentage (default: 50)
  maxFrameGap: number;      // seconds (default: 5)
}
