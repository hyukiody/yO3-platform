/**
 * System Settings & Configuration Service
 * Centralized runtime configuration with deployment tuning
 * 
 * SPEC: Analysis.ts - Enterprise Configuration
 */

import { logger } from './loggerService';
import { 
  AnalysisProfileMode, 
  getAnalysisProfile, 
  type AnalysisProfile,
  type EnterpriseEdition,
  type RecoveryStrategy 
} from '../contracts/Analysis';

// ═══════════════════════════════════════════════════════════════
// DEPLOYMENT ENVIRONMENT
// ═══════════════════════════════════════════════════════════════

export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export interface DeploymentConfig {
  environment: DeploymentEnvironment;
  version: string;
  buildTime: string;
  apiBaseUrl: string;
  wsBaseUrl: string;
  telemetryEndpoint: string;
  enableDevTools: boolean;
  enableMocking: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface SystemSettings {
  // Deployment
  deployment: DeploymentConfig;
  
  // Analysis
  analysis: {
    defaultProfile: AnalysisProfileMode;
    currentProfile: AnalysisProfile;
    autoSwitchEnabled: boolean;
    switchThreshold: number; // Events per minute to trigger switch
  };
  
  // Enterprise Features
  enterprise: {
    edition: EnterpriseEdition;
    failProofEnabled: boolean;
    recoveryStrategy: RecoveryStrategy;
    redundancyLevel: number;
  };
  
  // Performance
  performance: {
    targetFPS: number;
    maxConcurrentStreams: number;
    bufferSizeKB: number;
    enableHardwareAcceleration: boolean;
    adaptiveBitrate: boolean;
  };
  
  // Network
  network: {
    requestTimeout: number;
    retryAttempts: number;
    retryDelay: number;
    enableCompression: boolean;
    keepAliveInterval: number;
  };
  
  // Logging
  logging: {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    enableRemote: boolean;
    sampleRate: number; // 0.0-1.0 for remote logging
    persistLocal: boolean;
  };
  
  // UI/UX
  ui: {
    theme: 'light' | 'dark' | 'system';
    animationsEnabled: boolean;
    compactMode: boolean;
    refreshInterval: number; // ms for live data
  };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

const getDeploymentConfig = (): DeploymentConfig => {
  const isDev = import.meta.env.DEV;
  const isStaging = import.meta.env.VITE_ENV === 'staging';
  
  return {
    environment: isDev ? 'development' : isStaging ? 'staging' : 'production',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
    apiBaseUrl: import.meta.env.VITE_API_BASE || (isDev ? 'http://localhost:8091' : '/api'),
    wsBaseUrl: import.meta.env.VITE_WS_BASE || (isDev ? 'ws://localhost:9093' : '/ws'),
    telemetryEndpoint: import.meta.env.VITE_TELEMETRY || '/telemetry',
    enableDevTools: isDev,
    enableMocking: isDev && import.meta.env.VITE_MOCK === 'true',
  };
};

const DEFAULT_SETTINGS: SystemSettings = {
  deployment: getDeploymentConfig(),
  
  analysis: {
    defaultProfile: 'VANILLA',
    currentProfile: getAnalysisProfile('VANILLA'),
    autoSwitchEnabled: true,
    switchThreshold: 100,
  },
  
  enterprise: {
    edition: 'ENTERPRISE_PLUS',
    failProofEnabled: true,
    recoveryStrategy: 'FAILOVER_BACKUP',
    redundancyLevel: 2,
  },
  
  performance: {
    targetFPS: 30,
    maxConcurrentStreams: 4,
    bufferSizeKB: 2048,
    enableHardwareAcceleration: true,
    adaptiveBitrate: true,
  },
  
  network: {
    requestTimeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableCompression: true,
    keepAliveInterval: 30000,
  },
  
  logging: {
    level: import.meta.env.DEV ? 'DEBUG' : 'INFO',
    enableRemote: import.meta.env.PROD,
    sampleRate: 0.1,
    persistLocal: true,
  },
  
  ui: {
    theme: 'system',
    animationsEnabled: true,
    compactMode: false,
    refreshInterval: 5000,
  },
};

// ═══════════════════════════════════════════════════════════════
// SETTINGS SERVICE
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'yo3_system_settings';

class SystemSettingsService {
  private settings: SystemSettings;
  private listeners: Set<(settings: SystemSettings) => void> = new Set();
  private initialized = false;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): SystemSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to ensure new fields are included
        return this.mergeDeep(DEFAULT_SETTINGS, parsed);
      }
    } catch {
      logger.warn('SYSTEM', 'Failed to load settings, using defaults');
    }
    return { ...DEFAULT_SETTINGS };
  }

  private mergeDeep<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(result[key], source[key] as Partial<T[Extract<keyof T, string>]>);
      } else if (source[key] !== undefined) {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
    return result;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      logger.error('SYSTEM', 'Failed to persist settings');
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  /**
   * Initialize the settings service
   */
  initialize(): void {
    if (this.initialized) return;
    
    logger.system.boot('System Settings Service initialized', {
      environment: this.settings.deployment.environment,
      version: this.settings.deployment.version,
      profile: this.settings.analysis.defaultProfile,
      enterprise: this.settings.enterprise.edition,
    });
    
    this.initialized = true;
  }

  /**
   * Get current settings
   */
  get(): SystemSettings {
    return { ...this.settings };
  }

  /**
   * Get specific setting section
   */
  getSection<K extends keyof SystemSettings>(section: K): SystemSettings[K] {
    return { ...this.settings[section] };
  }

  /**
   * Update settings
   */
  update(updates: Partial<SystemSettings>): void {
    this.settings = this.mergeDeep(this.settings, updates);
    this.saveSettings();
    this.notifyListeners();
    
    logger.system.config('Settings updated', updates);
  }

  /**
   * Update specific section
   */
  updateSection<K extends keyof SystemSettings>(
    section: K, 
    updates: Partial<SystemSettings[K]>
  ): void {
    this.settings[section] = { ...this.settings[section], ...updates };
    this.saveSettings();
    this.notifyListeners();
    
    logger.system.config(`Settings.${section} updated`, updates as Record<string, unknown>);
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS, deployment: getDeploymentConfig() };
    this.saveSettings();
    this.notifyListeners();
    
    logger.system.config('Settings reset to defaults');
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(callback: (settings: SystemSettings) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Switch analysis profile
   */
  switchAnalysisProfile(mode: AnalysisProfileMode, reason?: string): void {
    const profile = getAnalysisProfile(mode);
    this.updateSection('analysis', {
      currentProfile: profile,
    });
    
    logger.analysis.profileSwitch(
      this.settings.analysis.currentProfile.mode,
      mode,
      reason
    );
  }

  /**
   * Get deployment environment
   */
  getEnvironment(): DeploymentEnvironment {
    return this.settings.deployment.environment;
  }

  /**
   * Check if in development mode
   */
  isDevelopment(): boolean {
    return this.settings.deployment.environment === 'development';
  }

  /**
   * Check if in production mode
   */
  isProduction(): boolean {
    return this.settings.deployment.environment === 'production';
  }

  /**
   * Export settings for debugging
   */
  export(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings
   */
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      this.settings = this.mergeDeep(DEFAULT_SETTINGS, parsed);
      this.saveSettings();
      this.notifyListeners();
      logger.system.config('Settings imported');
      return true;
    } catch {
      logger.error('SYSTEM', 'Failed to import settings');
      return false;
    }
  }
}

// Singleton export
export const systemSettings = new SystemSettingsService();

// Deployment tuning presets
export const DEPLOYMENT_PRESETS = {
  development: {
    logging: { level: 'DEBUG' as const, enableRemote: false, sampleRate: 1.0 },
    performance: { targetFPS: 30, maxConcurrentStreams: 2 },
    network: { requestTimeout: 60000, retryAttempts: 1 },
  },
  staging: {
    logging: { level: 'INFO' as const, enableRemote: true, sampleRate: 0.5 },
    performance: { targetFPS: 30, maxConcurrentStreams: 4 },
    network: { requestTimeout: 30000, retryAttempts: 2 },
  },
  production: {
    logging: { level: 'WARN' as const, enableRemote: true, sampleRate: 0.1 },
    performance: { targetFPS: 30, maxConcurrentStreams: 8 },
    network: { requestTimeout: 15000, retryAttempts: 3 },
  },
};

/**
 * Apply deployment preset
 */
export const applyDeploymentPreset = (env: DeploymentEnvironment): void => {
  const preset = DEPLOYMENT_PRESETS[env];
  systemSettings.update({
    logging: { ...systemSettings.getSection('logging'), ...preset.logging },
    performance: { ...systemSettings.getSection('performance'), ...preset.performance },
    network: { ...systemSettings.getSection('network'), ...preset.network },
  });
  logger.system.config(`Applied ${env} deployment preset`);
};
