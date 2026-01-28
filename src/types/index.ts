// Type definitions for yo3 Platform Authentication and Monetization

export interface AuthenticationRequest {
  username: string;
  password: string;
  deviceId?: string;
  seedKey?: string; // For video decryption
}

export interface AuthenticationResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  role: string;
  licenseTier?: string;
  message?: string; // Warning messages (grace period, trial)
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  licenseTier: string;
  trialEndDate?: number;
  storageQuotaGb: number;
  apiRateLimit: number;
  subscriptionStatus: string;
  isActive: boolean;
}

/**
 * License Status for YO3 Platform Commercial License
 * Verified via cryptographic signature (RSA-2048)
 */
export interface LicenseStatus {
  active: boolean;
  valid: boolean;
  tier: LicenseTierType;
  type: LicenseTypeEnum;
  expiresAt?: number;
  daysRemaining: number;
  trial: boolean;
  gracePeriod: boolean;
  expired: boolean;
  perpetual: boolean;
  licensee?: string;
  deploymentId?: string;
  features: LicenseFeature[];
  reason?: string;
}

/**
 * License tier types - determines feature access
 */
export type LicenseTierType = 'NONE' | 'SOLO' | 'PRO' | 'ENTERPRISE';

/**
 * License type - perpetual vs subscription
 */
export type LicenseTypeEnum = 'TRIAL' | 'SUBSCRIPTION' | 'PERPETUAL' | 'GRACE_PERIOD' | 'EXPIRED';

/**
 * Available licensed features
 */
export type LicenseFeature = 
  | 'CORE_ANALYTICS'
  | 'BASIC_ALERTS'
  | 'SINGLE_DEPLOYMENT'
  | 'MULTI_DEPLOYMENT'
  | 'FORENSIC_ANALYSIS'
  | 'HEATMAPS'
  | 'SOURCE_CODE'
  | 'PRIORITY_SUPPORT'
  | 'WHITELABEL'
  | 'OEM_RIGHTS'
  | 'SPEC_001'
  | 'AGENTIC_VISION';

/**
 * License verification request payload
 */
export interface LicenseVerificationRequest {
  licenseKey: string;
}

/**
 * License verification response from backend
 */
export interface LicenseVerificationResponse {
  valid: boolean;
  info?: LicenseStatus;
  error?: string;
}

export interface QuotaUsage {
  cameras: {
    current: number;
    max: number;
    percentage: number;
  };
  storage: {
    currentGb: number;
    maxGb: number;
    percentage: number;
  };
  apiCalls: {
    currentRate: number;
    maxRate: number;
  };
}

export interface DetectionEvent {
  id: number;
  timestamp: number;
  cameraId: string;
  objectType: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: Record<string, any>;
  // Agentic Vision Analysis fields
  deepAnalysis?: string;
  protocolStatus?: 'none' | 'monitoring' | 'alert' | 'critical' | 'emergency';
}

export interface Camera {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastSeen: number;
  location?: string;
  streamUrl?: string;
}

export interface VideoStream {
  storageKey: string;
  cameraId: string;
  timestamp: number;
  encryptedSize: number;
  duration: number;
  hasWatermark: boolean;
}

export type LicenseTier = 'FREE' | 'SOLO' | 'PRO' | 'ENTERPRISE';

/**
 * Tier features with pricing for monetization
 */
export interface TierFeatures {
  tier: LicenseTier;
  price: number;
  priceLabel: string;
  maxCameras: number;
  storageQuotaGb: number;
  apiRateLimit: number;
  retentionDays: number;
  videoQuality: string;
  hasWatermark: boolean;
  realAiDetection: boolean;
  sourceCodeAccess: boolean;
  whitelabelRights: boolean;
  features: string[];
}

/**
 * Pricing tiers for YO3 Platform Commercial License
 */
export const LICENSE_PRICING: Record<LicenseTier, TierFeatures> = {
  FREE: {
    tier: 'FREE',
    price: 0,
    priceLabel: 'Free',
    maxCameras: 1,
    storageQuotaGb: 1,
    apiRateLimit: 100,
    retentionDays: 7,
    videoQuality: '720p',
    hasWatermark: true,
    realAiDetection: false,
    sourceCodeAccess: false,
    whitelabelRights: false,
    features: ['Demo Mode Only'],
  },
  SOLO: {
    tier: 'SOLO',
    price: 499,
    priceLabel: '$499 (One-time)',
    maxCameras: 4,
    storageQuotaGb: 50,
    apiRateLimit: 1000,
    retentionDays: 30,
    videoQuality: '1080p',
    hasWatermark: false,
    realAiDetection: true,
    sourceCodeAccess: false,
    whitelabelRights: false,
    features: ['Core Analytics', 'Basic Alerts', 'Single Deployment', 'Email Support'],
  },
  PRO: {
    tier: 'PRO',
    price: 2499,
    priceLabel: '$2,499 (One-time)',
    maxCameras: 16,
    storageQuotaGb: 500,
    apiRateLimit: 10000,
    retentionDays: 90,
    videoQuality: '4K',
    hasWatermark: false,
    realAiDetection: true,
    sourceCodeAccess: true,
    whitelabelRights: false,
    features: [
      'Core Analytics', 'Forensic Analysis', 'Heatmaps', 
      'Source Code Access', 'ISO Documentation', 'Priority Support'
    ],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    price: 15000,
    priceLabel: '$15,000+ (One-time)',
    maxCameras: -1, // Unlimited
    storageQuotaGb: -1, // Unlimited
    apiRateLimit: -1, // Unlimited
    retentionDays: 365,
    videoQuality: '8K',
    hasWatermark: false,
    realAiDetection: true,
    sourceCodeAccess: true,
    whitelabelRights: true,
    features: [
      'All Pro Features', 'Whitelabel Rights', 'OEM Licensing',
      'Multi-Deployment', 'SPEC-001 Access', 'Agentic Vision',
      'Dedicated Support', 'Architecture Copyright License'
    ],
  },
};

// ===== Camera Management Types (Port 9090) =====

export type CameraType = 'IP' | 'RTSP' | 'ONVIF' | 'USB' | 'WEBCAM' | 'CUSTOM';
export type CameraStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'INITIALIZING';

/**
 * Native webcam device info from MediaDevices API
 */
export interface LocalWebcam {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface CameraFull {
  id: string;
  name: string;
  description?: string;
  streamUrl?: string;
  rtspUrl?: string;
  cameraType: CameraType;
  location?: string;
  isActive: boolean;
  isEnabled: boolean;
  username?: string;
  password?: string;
  port: number;
  fps: number;
  resolution?: string;
  codec?: string;
  bitrateKbps: number;
  connectedAt?: string;
  lastFrameAt?: string;
  status: CameraStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface CameraCreateRequest {
  name: string;
  description?: string;
  streamUrl?: string;
  rtspUrl?: string;
  cameraType: CameraType;
  location?: string;
  username?: string;
  password?: string;
  port?: number;
  fps?: number;
  resolution?: string;
  codec?: string;
  bitrateKbps?: number;
  metadata?: string;
}

export type CameraUpdateRequest = Partial<CameraCreateRequest>;

// ===== System Configuration Types (Port 8081) =====

export type ConfigDataType = 'STRING' | 'INTEGER' | 'BOOLEAN' | 'FLOAT' | 'JSON';

export interface SystemConfig {
  configKey: string;
  configValue: string;
  dataType: ConfigDataType;
  description?: string;
  updatedAt?: string;
}

export interface ConfigUpdateRequest {
  value: string;
}

export interface ConfigBulkUpdateItem {
  configKey: string;
  configValue: string;
}

// ===== Analysis Report Types =====

export interface AnalysisReport {
  id: string;
  reportType: 'HOURLY' | 'DAILY' | 'SECURITY_ALERT';
  timeSpanStart: string;
  timeSpanEnd: string;
  summaryText: string;
  structuredData: {
    totalEvents: number;
    avgConfidence: number;
    dominantClass: string;
    peakHour?: number;
    peakCount?: number;
    anomalyScore?: number;
    classBreakdown: Record<string, number>;
  };
  createdAt: string;
}
