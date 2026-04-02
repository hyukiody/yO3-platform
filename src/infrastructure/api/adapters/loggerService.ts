/**
 * Enterprise Logger Service
 * Centralized logging with levels, persistence, and telemetry integration
 * 
 * SPEC: DEPLOYMENT_OPERATIONS.md - System Logging Requirements
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogCategory = 'SYSTEM' | 'API' | 'AUTH' | 'VIDEO' | 'ANALYSIS' | 'NETWORK' | 'UI';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;
  source?: string;
  stackTrace?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enablePersistence: boolean;
  enableTelemetry: boolean;
  maxEntries: number;
  persistenceKey: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG: 'color: #9E9E9E',
  INFO: 'color: #2196F3',
  WARN: 'color: #FF9800',
  ERROR: 'color: #F44336',
  FATAL: 'color: #D32F2F; font-weight: bold',
};

const LOG_CATEGORY_EMOJI: Record<LogCategory, string> = {
  SYSTEM: '⚙️',
  API: '🌐',
  AUTH: '🔐',
  VIDEO: '🎬',
  ANALYSIS: '🔬',
  NETWORK: '📡',
  UI: '🖥️',
};

class LoggerService {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private listeners: Set<(entry: LogEntry) => void> = new Set();
  private entryId = 0;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.config = {
      minLevel: import.meta.env.DEV ? 'DEBUG' : 'INFO',
      enableConsole: true,
      enablePersistence: true,
      enableTelemetry: import.meta.env.PROD,
      maxEntries: 500,
      persistenceKey: 'yo3_logs',
    };
    this.loadPersistedLogs();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadPersistedLogs(): void {
    if (!this.config.enablePersistence) return;
    try {
      const stored = localStorage.getItem(this.config.persistenceKey);
      if (stored) {
        const parsed = JSON.parse(stored) as LogEntry[];
        // Only load entries from last 24 hours
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        this.entries = parsed.filter(e => e.timestamp > cutoff);
      }
    } catch {
      // Silent fail - start fresh
    }
  }

  private persistLogs(): void {
    if (!this.config.enablePersistence) return;
    try {
      localStorage.setItem(this.config.persistenceKey, JSON.stringify(this.entries.slice(0, 100)));
    } catch {
      // Storage full - continue without persistence
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  private formatConsoleMessage(entry: LogEntry): string[] {
    const emoji = LOG_CATEGORY_EMOJI[entry.category];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `${emoji} [${timestamp}] [${entry.level}] [${entry.category}]`;
    return [prefix, entry.message];
  }

  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    source?: string
  ): LogEntry | null {
    if (!this.shouldLog(level)) return null;

    const entry: LogEntry = {
      id: `${this.sessionId}_${++this.entryId}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      source,
    };

    // Capture stack trace for errors
    if (level === 'ERROR' || level === 'FATAL') {
      entry.stackTrace = new Error().stack;
    }

    // Store entry
    this.entries.unshift(entry);
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(0, this.config.maxEntries);
    }

    // Console output
    if (this.config.enableConsole) {
      const [prefix, msg] = this.formatConsoleMessage(entry);
      const style = LOG_LEVEL_STYLES[level];
      
      switch (level) {
        case 'DEBUG':
          console.debug(`%c${prefix}`, style, msg, data || '');
          break;
        case 'INFO':
          console.info(`%c${prefix}`, style, msg, data || '');
          break;
        case 'WARN':
          console.warn(`%c${prefix}`, style, msg, data || '');
          break;
        case 'ERROR':
        case 'FATAL':
          console.error(`%c${prefix}`, style, msg, data || '', entry.stackTrace || '');
          break;
      }
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Persist critical logs
    if (level === 'ERROR' || level === 'FATAL') {
      this.persistLogs();
    }

    return entry;
  }

  // Public API - Category-specific loggers
  debug(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('DEBUG', category, message, data);
  }

  info(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('INFO', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('WARN', category, message, data);
  }

  error(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('ERROR', category, message, data);
  }

  fatal(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('FATAL', category, message, data);
  }

  // System-specific convenience methods
  system = {
    boot: (message: string, data?: Record<string, unknown>) => 
      this.info('SYSTEM', `🚀 ${message}`, data),
    shutdown: (message: string, data?: Record<string, unknown>) => 
      this.info('SYSTEM', `⏹️ ${message}`, data),
    config: (message: string, data?: Record<string, unknown>) => 
      this.debug('SYSTEM', `⚙️ ${message}`, data),
    health: (status: string, data?: Record<string, unknown>) => 
      this.info('SYSTEM', `💚 Health: ${status}`, data),
  };

  // API-specific convenience methods
  api = {
    request: (method: string, url: string, data?: Record<string, unknown>) =>
      this.debug('API', `→ ${method} ${url}`, data),
    response: (method: string, url: string, status: number, time: number) =>
      this.debug('API', `← ${method} ${url} [${status}] ${time}ms`),
    error: (method: string, url: string, error: string) =>
      this.error('API', `✗ ${method} ${url}: ${error}`),
  };

  // Analysis-specific convenience methods
  analysis = {
    profileSwitch: (from: string, to: string, reason?: string) =>
      this.info('ANALYSIS', `Profile switch: ${from} → ${to}`, { reason }),
    detection: (type: string, confidence: number, source: string) =>
      this.debug('ANALYSIS', `Detection: ${type} (${(confidence * 100).toFixed(1)}%)`, { source }),
    alert: (severity: string, type: string, message: string) =>
      this.warn('ANALYSIS', `[${severity}] ${type}: ${message}`),
  };

  // Subscription for real-time log monitoring
  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Get recent logs
  getEntries(filter?: { level?: LogLevel; category?: LogCategory; limit?: number }): LogEntry[] {
    let result = [...this.entries];
    
    if (filter?.level) {
      const minPriority = LOG_LEVEL_PRIORITY[filter.level];
      result = result.filter(e => LOG_LEVEL_PRIORITY[e.level] >= minPriority);
    }
    
    if (filter?.category) {
      result = result.filter(e => e.category === filter.category);
    }
    
    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }
    
    return result;
  }

  // Get statistics
  getStats(): { total: number; byLevel: Record<LogLevel, number>; byCategory: Record<LogCategory, number> } {
    const byLevel = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 };
    const byCategory = { SYSTEM: 0, API: 0, AUTH: 0, VIDEO: 0, ANALYSIS: 0, NETWORK: 0, UI: 0 };
    
    this.entries.forEach(entry => {
      byLevel[entry.level]++;
      byCategory[entry.category]++;
    });
    
    return { total: this.entries.length, byLevel, byCategory };
  }

  // Clear logs
  clear(): void {
    this.entries = [];
    this.persistLogs();
  }

  // Update configuration
  configure(updates: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton export
export const logger = new LoggerService();

// Global error handler integration
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.fatal('SYSTEM', `Uncaught error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.fatal('SYSTEM', `Unhandled promise rejection: ${event.reason}`);
  });
}
