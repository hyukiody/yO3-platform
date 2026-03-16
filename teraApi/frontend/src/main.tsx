import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import './index.css'
import './styles/themes/fresh.css'
import './i18n'

// ═══════════════════════════════════════════════════════════════
// MOCK SERVICE WORKER INITIALIZATION (Contract-Driven Mocking)
// ═══════════════════════════════════════════════════════════════
// MSW intercepts all fetch/XHR requests at the Service Worker level,
// allowing deterministic testing without external backend dependencies.
// Enabled via VITE_API_MODE=mock environment variable.
async function enableMockServiceWorker() {
  // Only initialize MSW if explicitly enabled
  if (import.meta.env.VITE_API_MODE !== 'mock') {
    return; // Use real API (proxy or production)
  }

  try {
    const { initializeMockServiceWorker } = await import('./mocks/browser');
    await initializeMockServiceWorker();
  } catch (error) {
    console.error('[MSW] Initialization failed, falling back to real API:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM INITIALIZATION
// ═══════════════════════════════════════════════════════════════
import { logger } from './services/loggerService'
import { systemSettings, applyDeploymentPreset } from './services/systemSettings'
import { initializeFetchInterception } from './services/requestLogger'

// Initialize system services
const initializeSystem = () => {
  const startTime = performance.now();
  
  // 1. Initialize logging first
  logger.system.boot('YO3 Platform initializing...', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    apiMode: import.meta.env.VITE_API_MODE || 'real',
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
    apiMode: import.meta.env.VITE_API_MODE || 'real',
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
      apiMode: import.meta.env.VITE_API_MODE || 'real',
    };
    logger.debug('SYSTEM', 'Debug utilities exposed on window.__YO3_DEBUG__');
  }
};

// ═══════════════════════════════════════════════════════════════
// APPLICATION BOOTSTRAP SEQUENCE
// ═══════════════════════════════════════════════════════════════

async function bootstrapApplication() {
  try {
    // 1. Enable MSW if configured (must happen before React renders)
    await enableMockServiceWorker();

    // 2. Initialize system services
    initializeSystem();

    // 3. Render React application
    const basename = import.meta.env.VITE_BASE || '/';
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.fatal('SYSTEM', 'Application bootstrap failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// Start the bootstrap sequence
bootstrapApplication();
