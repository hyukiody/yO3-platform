import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lib/queryClient'
import { ThemeProvider } from '@contexts/ThemeContext'
import App from './App'
import './index.css'
import './styles/themes/fresh.css'
import './i18n'

// ═══════════════════════════════════════════════════════════════
// SYSTEM INITIALIZATION
// ═══════════════════════════════════════════════════════════════
import { logger } from '@services/loggerService'
import { systemSettings, applyDeploymentPreset } from '@services/systemSettings'
import { initializeFetchInterception } from '@services/requestLogger'

// Initialize system services
const initializeSystem = () => {
  const startTime = performance.now();
  
  // 1. Initialize logging first
  logger.system.boot('YO3 Platform initializing...', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  });

  // 2. Initialize system settings
  systemSettings.initialize();
  const env = systemSettings.getEnvironment();
  
  // 3. Apply environment-specific deployment tuning
  applyDeploymentPreset(env);
  
  // 4. Initialize API request interception for monitoring
  initializeFetchInterception();
  
  // 5. Log system configuration
  const settings = systemSettings.get();
  logger.system.config('System configuration loaded', {
    environment: env,
    version: settings.deployment.version,
    analysisProfile: settings.analysis.currentProfile.mode,
    enterpriseEdition: settings.enterprise.edition,
    failProofEnabled: settings.enterprise.failProofEnabled,
  });

  // 6. Performance metrics
  const initTime = Math.round(performance.now() - startTime);
  logger.info('SYSTEM', `System initialized in ${initTime}ms`, {
    initTimeMs: initTime,
    sessionId: logger.getSessionId(),
  });

  // Dev mode: expose debug utilities
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__YO3_DEBUG__ = {
      logger,
      systemSettings,
      getStats: () => logger.getStats(),
      getLogs: (limit = 20) => logger.getEntries({ limit }),
      switchProfile: (mode: 'VANILLA' | 'VIGILANT') => 
        systemSettings.switchAnalysisProfile(mode, 'Manual debug switch'),
    };
    logger.debug('SYSTEM', 'Debug utilities exposed on window.__YO3_DEBUG__');
  }
};

// Run initialization
initializeSystem();

// ═══════════════════════════════════════════════════════════════
// APPLICATION BOOTSTRAP
// ═══════════════════════════════════════════════════════════════
// Use VITE_BASE env var for basename, defaulting to '/' for local/Docker deployments
const basename = import.meta.env.VITE_BASE || '/';

// Error boundary for catastrophic failures
const handleRenderError = (error: Error) => {
  logger.fatal('UI', 'React render failed', { 
    error: error.message,
    stack: error.stack,
  });
};

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter basename={basename}>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
  
  logger.system.boot('React application mounted successfully');
} catch (error) {
  handleRenderError(error as Error);
}
