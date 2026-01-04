import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Portfolio from './pages/Portfolio'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Showcase from './pages/Showcase'
import ObjectDetectionMonitor from './components/ObjectDetectionMonitor'
import EncryptionDemo from './pages/showcase/EncryptionDemo'
import ArchitectureShowcase from './pages/showcase/ArchitectureShowcase'
import ZeroTrustVideoDemo from './pages/showcase/ZeroTrustVideoDemo'
import TestDashboard from './components/TestDashboard'
import { TelemetryDashboard } from './components/glass-box/TelemetryDashboard'
import styles from './App.module.css'

// Show test dashboard only in development
const SHOW_TEST_DASHBOARD = import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_DASHBOARD === 'true'
const SHOWCASE_MODE = import.meta.env.VITE_SHOWCASE_MODE !== 'false'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Navigation Component
function Navigation() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav aria-label="Primary">
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="app" style={{ padding: 0 }}>
        <div className="card" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div className={styles.navContainer}>
            <Link 
              className={`button ${styles.homeButtonContainer}`}
              to="/" 
            >
              <img 
                src="/cat-logo.svg" 
                alt="Cat logo" 
                className={styles.logoImage}
              />
              {t('nav.home')}
            </Link>
            {isAuthenticated && (
              <Link className="button" to="/dashboard">
                {t('nav.dashboard')}
              </Link>
            )}
            <Link className="button" to="/showcase">
              Showcase
            </Link>
            {SHOW_TEST_DASHBOARD && (
              <Link className={`button ${styles.testButton}`} to="/test-dashboard">
                🧪 Tests
              </Link>
            )}
            <a className="button" href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">{t('nav.docs')}</a>
          </div>
          
          <div className={styles.navControls}>
            {isAuthenticated && user && (
              <span className={styles.userInfo}>
                👤 {user.username}
              </span>
            )}
            <button className="button" onClick={() => i18n.changeLanguage('en')} aria-label="Switch to English">{t('nav.en')}</button>
            <button className="button" onClick={() => i18n.changeLanguage('ja')} aria-label="日本語に切り替え">{t('nav.ja')}</button>
            {isAuthenticated ? (
              <button className="button" onClick={logout}>{t('nav.logout')}</button>
            ) : (
              <Link className="button" to="/login">{t('nav.login')}</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div>
        <Navigation />

        {/* Cyberpunk Neon Divider Section */}
        <div className={styles.neonDividerSection}>
          <div className={styles.neonLine}></div>
          <div className={styles.neonText}>yo3 SURVEILLANCE PLATFORM</div>
          <div className={styles.neonLine}></div>
        </div>

        <Routes>
          <Route path="/" element={<Portfolio />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/showcase" element={<Showcase />} />
          <Route path="/showcase/object-detection" element={<ObjectDetectionMonitor />} />
          <Route path="/showcase/encryption" element={<EncryptionDemo />} />
          <Route path="/showcase/architecture" element={<ArchitectureShowcase />} />
          <Route path="/showcase/zero-trust" element={<ZeroTrustVideoDemo />} />
          {SHOW_TEST_DASHBOARD && (
            <Route path="/test-dashboard" element={<TestDashboard />} />
          )}
        </Routes>
      </div>
    </AuthProvider>
  );
}
