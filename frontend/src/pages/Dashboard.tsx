import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import ApiRequestMonitor from '../components/ApiRequestMonitor';
import { initializeFetchInterception } from '../services/requestLogger';
import type { QuotaUsage, DetectionEvent, Camera } from '../types';

interface DeploymentStatus {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    name: string;
    status: 'healthy' | 'unhealthy';
    endpoint: string;
    responseTime: number;
    message?: string;
  }>;
  databases: Array<{
    name: string;
    status: 'connected' | 'disconnected';
    connection: string;
    database: string;
  }>;
  responseTime: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage | null>(null);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Initialize fetch request logging
    initializeFetchInterception();

    loadDashboardData();
    loadDeploymentStatus();
    
    // Refresh deployment status every 30 seconds
    const statusInterval = setInterval(loadDeploymentStatus, 30000);
    return () => clearInterval(statusInterval);
  }, [isAuthenticated, navigate]);

  const loadDeploymentStatus = async () => {
    try {
      const response = await fetch('/api/v1/status');
      if (response.ok) {
        const data = await response.json();
        setDeploymentStatus(data);
        setStatusError(null);
      }
    } catch (err) {
      // Demo mode: Use mock deployment status
      console.warn('🎯 DEMO MODE: Using mock deployment status');
      setDeploymentStatus({
        status: 'operational',
        overallStatus: 'healthy',
        version: 'v1.0.0-demo',
        uptime: '99.9%',
        responseTime: 45,
        timestamp: Date.now(),
        services: [
          { name: 'Identity Service', status: 'healthy', responseTime: 23 },
          { name: 'Stream Processing', status: 'healthy', responseTime: 18 },
          { name: 'Data Core', status: 'healthy', responseTime: 31 },
          { name: 'Edge Node', status: 'healthy', responseTime: 27 }
        ],
        databases: [
          { name: 'PostgreSQL', status: 'healthy', responseTime: 12 },
          { name: 'Redis Cache', status: 'healthy', responseTime: 5 }
        ]
      });
      setStatusError(null);
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [quotaData, eventsData, camerasData] = await Promise.all([
        apiService.getQuotaUsage().catch(() => mockQuotaUsage()),
        apiService.getDetectionEvents(20).catch(() => mockEvents()),
        apiService.getCameras().catch(() => mockCameras()),
      ]);

      setQuotaUsage(quotaData);
      setEvents(eventsData);
      setCameras(camerasData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'healthy') return '✅';
    if (status === 'degraded') return '⚠️';
    return '❌';
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return '#00d4d4';
    if (status === 'degraded') return '#ffa500';
    return '#ff453a';
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'PRO': return '#00d4d4';
      case 'ENTERPRISE': return '#ffa500';
      default: return '#8892b0';
    }
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return '#ff453a';
    if (percentage >= 75) return '#ffa500';
    return '#00d4d4';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTrialDaysRemaining = () => {
    if (!user?.trialEndDate) return 0;
    const remaining = user.trialEndDate - Date.now();
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">⏳ {t('login.loading')}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1 className="dashboard-title">{t('dashboard.title')}</h1>
            <p className="dashboard-subtitle">
              {t('dashboard.welcome')}, {user?.username}
            </p>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            {t('nav.logout')}
          </button>
        </div>
      </header>

      {/* Tier Badge and Trial Warning */}
      {/* Work in Progress Banner */}
      <div className="wip-banner" style={{
        padding: '12px 20px',
        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
      }}>
        <span style={{ fontSize: '24px' }}>🚧</span>
        <div>
          <strong style={{ color: '#fff', fontSize: '16px', display: 'block' }}>WORK IN PROGRESS</strong>
          <span style={{ color: '#fff', opacity: 0.9, fontSize: '14px' }}>
            Active development - Core features functional, UI/UX refinements ongoing
          </span>
        </div>
      </div>

      <div className="dashboard-alerts">
        <div className="tier-badge" style={{ borderColor: getTierBadgeColor(user?.licenseTier || 'FREE') }}>
          <span className="tier-icon">
            {user?.licenseTier === 'ENTERPRISE' ? '👑' : user?.licenseTier === 'PRO' ? '⭐' : '🎁'}
          </span>
          <span className="tier-name">
            {t(`dashboard.tier.${user?.licenseTier || 'FREE'}`)}
          </span>
        </div>

        {user?.licenseTier === 'FREE' && user?.trialEndDate && (
          <div className="trial-warning">
            <span className="warning-icon">⏰</span>
            {getTrialDaysRemaining()} days remaining in trial
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Deployment Status Section */}
      {deploymentStatus && (
        <section className="dashboard-card status-card">
          <div className="status-header">
            <h2 className="card-title">
              {getStatusBadge(deploymentStatus.overallStatus)} Deployment Status
            </h2>
            <span className="status-time">
              Updated: {new Date(deploymentStatus.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {statusError && (
            <div className="status-error">{statusError}</div>
          )}

          {/* Services Status Grid */}
          <div className="services-grid">
            <div className="services-column">
              <h3 className="section-title">Backend Services</h3>
              {deploymentStatus.services.map((service) => (
                <div key={service.name} className="service-item">
                  <span className="service-status">
                    {service.status === 'healthy' ? '✅' : '❌'}
                  </span>
                  <span className="service-name">{service.name}</span>
                  <span className="service-time">
                    {service.responseTime > 0 ? `${service.responseTime}ms` : 'N/A'}
                  </span>
                </div>
              ))}
            </div>

            <div className="services-column">
              <h3 className="section-title">Databases</h3>
              {deploymentStatus.databases.map((db) => (
                <div key={db.name} className="service-item">
                  <span className="service-status">
                    {db.status === 'connected' ? '✅' : '❌'}
                  </span>
                  <span className="service-name">{db.name}</span>
                  <span className="service-port">{db.connection}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="status-footer">
            <span 
              className="overall-badge"
              style={{ borderColor: getStatusColor(deploymentStatus.overallStatus) }}
            >
              {deploymentStatus.overallStatus.toUpperCase()}
            </span>
            <span className="response-time">
              Response: {deploymentStatus.responseTime}ms
            </span>
          </div>
        </section>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* API Request Monitor */}
        <ApiRequestMonitor className="monitor-card" />

        {/* Quota Usage Section */}
        <section className="dashboard-card quota-card">
          <h2 className="card-title">{t('dashboard.quota')}</h2>
          
          {quotaUsage ? (
            <div className="quota-grid">
              {/* Cameras Quota */}
              <div className="quota-item">
                <div className="quota-header">
                  <span className="quota-label">📹 {t('dashboard.stats.activeCameras')}</span>
                  <span className="quota-value">
                    {quotaUsage.cameras.current} / {quotaUsage.cameras.max === -1 ? '∞' : quotaUsage.cameras.max}
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${quotaUsage.cameras.percentage}%`,
                      backgroundColor: getQuotaColor(quotaUsage.cameras.percentage)
                    }}
                  />
                </div>
              </div>

              {/* Storage Quota */}
              <div className="quota-item">
                <div className="quota-header">
                  <span className="quota-label">💾 {t('dashboard.stats.storageUsed')}</span>
                  <span className="quota-value">
                    {quotaUsage.storage.currentGb.toFixed(1)} / {quotaUsage.storage.maxGb === -1 ? '∞' : quotaUsage.storage.maxGb} GB
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${quotaUsage.storage.percentage}%`,
                      backgroundColor: getQuotaColor(quotaUsage.storage.percentage)
                    }}
                  />
                </div>
              </div>

              {/* API Rate */}
              <div className="quota-item">
                <div className="quota-header">
                  <span className="quota-label">⚡ {t('dashboard.stats.apiCalls')}</span>
                  <span className="quota-value">
                    {quotaUsage.apiCalls.currentRate} / {quotaUsage.apiCalls.maxRate} req/s
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(quotaUsage.apiCalls.currentRate / quotaUsage.apiCalls.maxRate) * 100}%`,
                      backgroundColor: '#00d4d4'
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">No quota data available</div>
          )}

          {user?.licenseTier === 'FREE' && (
            <button className="btn-upgrade">
              ⬆️ {t('dashboard.upgrade')}
            </button>
          )}
        </section>

        {/* Cameras Section */}
        <section className="dashboard-card cameras-card">
          <div className="card-header">
            <h2 className="card-title">{t('dashboard.cameras')}</h2>
            <button className="btn-add">+ {t('dashboard.addCamera')}</button>
          </div>

          {cameras.length > 0 ? (
            <div className="cameras-list">
              {cameras.map((camera) => (
                <div key={camera.id} className="camera-item">
                  <div className="camera-info">
                    <div className={`camera-status ${camera.status}`} />
                    <div>
                      <h3 className="camera-name">{camera.name}</h3>
                      <p className="camera-location">{camera.location || camera.id}</p>
                    </div>
                  </div>
                  <div className="camera-meta">
                    <small>{formatTimestamp(camera.lastSeen)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">📹</span>
              <p>{t('dashboard.noCameras')}</p>
            </div>
          )}
        </section>

        {/* Events Section */}
        <section className="dashboard-card events-card">
          <h2 className="card-title">{t('dashboard.events')}</h2>

          {events.length > 0 ? (
            <div className="events-list">
              {events.map((event) => (
                <div key={event.id} className="event-item">
                  <div className="event-icon">
                    {getEventIcon(event.objectType)}
                  </div>
                  <div className="event-info">
                    <h4 className="event-type">{event.objectType}</h4>
                    <p className="event-meta">
                      Camera {event.cameraId} • {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                  <div className="event-confidence">
                    {(event.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <p>{t('dashboard.noEvents')}</p>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 2rem;
        }

        .dashboard-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a2e;
        }

        .loading-spinner {
          color: #00FFFF;
          font-size: 1.5rem;
        }

        .dashboard-header {
          margin-bottom: 2rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .dashboard-title {
          color: #00FFFF;
          font-size: 2.5rem;
          font-weight: 900;
          letter-spacing: 2px;
          margin: 0;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
        }

        .dashboard-subtitle {
          color: #8892b0;
          font-size: 1.1rem;
          margin: 0.25rem 0 0 0;
        }

        .btn-logout {
          background: rgba(255, 69, 58, 0.2);
          border: 2px solid #ff453a;
          color: #ff6961;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-logout:hover {
          background: rgba(255, 69, 58, 0.3);
          transform: translateY(-2px);
        }

        .dashboard-alerts {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .tier-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          background: rgba(26, 26, 46, 0.8);
          border: 2px solid;
          border-radius: 12px;
          font-weight: 700;
        }

        .tier-icon {
          font-size: 1.5rem;
        }

        .tier-name {
          color: #00FFFF;
          font-size: 1.1rem;
          letter-spacing: 1px;
        }

        .trial-warning {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 165, 0, 0.15);
          border: 2px solid #ffa500;
          border-radius: 12px;
          color: #ffa500;
          font-weight: 600;
        }

        .warning-icon {
          font-size: 1.25rem;
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .alert-error {
          background: rgba(255, 69, 58, 0.15);
          border: 1px solid #ff453a;
          color: #ff6961;
        }

        .alert-icon {
          font-size: 1.25rem;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .dashboard-card {
          background: rgba(26, 26, 46, 0.9);
          border: 2px solid #00FFFF;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-title {
          color: #00FFFF;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 1.5rem 0;
        }

        .quota-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .quota-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .quota-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .quota-label {
          color: #8892b0;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .quota-value {
          color: #e2e8f0;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: rgba(45, 55, 72, 0.8);
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.5s ease, background-color 0.3s ease;
          border-radius: 6px;
        }

        .btn-upgrade {
          width: 100%;
          background: linear-gradient(135deg, #00FFFF, #0080FF);
          color: #1a1a2e;
          border: none;
          padding: 1rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .btn-upgrade:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 255, 255, 0.4);
        }

        .btn-add {
          background: rgba(0, 255, 255, 0.15);
          border: 2px solid #00FFFF;
          color: #00FFFF;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-add:hover {
          background: rgba(0, 255, 255, 0.25);
        }

        .cameras-list,
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .camera-item,
        .event-item {
          background: rgba(22, 33, 62, 0.6);
          border: 1px solid #2d3748;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
        }

        .camera-item:hover,
        .event-item:hover {
          border-color: #00FFFF;
          transform: translateX(4px);
        }

        .camera-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .camera-status {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .camera-status.active {
          background: #00d4d4;
          box-shadow: 0 0 10px rgba(0, 212, 212, 0.6);
        }

        .camera-status.inactive {
          background: #8892b0;
        }

        .camera-status.error {
          background: #ff453a;
        }

        .camera-name {
          color: #e2e8f0;
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .camera-location,
        .camera-meta {
          color: #8892b0;
          font-size: 0.85rem;
          margin: 0.25rem 0 0 0;
        }

        .event-icon {
          font-size: 2rem;
          margin-right: 1rem;
        }

        /* Deployment Status Card */
        .status-card {
          grid-column: 1 / -1;
          background: rgba(13, 148, 136, 0.05);
          border: 1px solid rgba(0, 212, 212, 0.3);
        }

        /* API Monitor Card */
        .monitor-card {
          grid-column: 1 / -1;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .status-time {
          color: #8892b0;
          font-size: 0.85rem;
        }

        .services-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .services-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        .services-column {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .section-title {
          color: #e2e8f0;
          font-size: 0.95rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 0.75rem 0;
          color: #00d4d4;
        }

        .service-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          border-left: 3px solid transparent;
        }

        .service-item:has(.service-status:contains('✅')) {
          border-left-color: #00d4d4;
        }

        .service-item:has(.service-status:contains('❌')) {
          border-left-color: #ff453a;
        }

        .service-status {
          font-size: 1rem;
          min-width: 1.5rem;
        }

        .service-name {
          flex: 1;
          color: #e2e8f0;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .service-time {
          color: #8892b0;
          font-size: 0.8rem;
        }

        .service-port {
          color: #8892b0;
          font-size: 0.75rem;
          background: rgba(0, 0, 0, 0.3);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .status-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid rgba(0, 212, 212, 0.2);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .overall-badge {
          padding: 0.5rem 1rem;
          background: rgba(0, 212, 212, 0.1);
          border: 2px solid;
          border-radius: 8px;
          color: #e2e8f0;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 1px;
        }

        .response-time {
          color: #8892b0;
          font-size: 0.85rem;
        }

        .status-error {
          color: #ff453a;
          background: rgba(255, 69, 58, 0.1);
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        }

        .event-info {
          flex: 1;
          margin: 0 1rem;
        }

        .event-type {
          color: #e2e8f0;
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .event-meta {
          color: #8892b0;
          font-size: 0.85rem;
          margin: 0.25rem 0 0 0;
        }

        .event-confidence {
          color: #00FFFF;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #8892b0;
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 1rem;
          }

          .dashboard-title {
            font-size: 2rem;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// Helper functions
function getEventIcon(objectType: string): string {
  const icons: Record<string, string> = {
    person: '🚶',
    car: '🚗',
    dog: '🐕',
    cat: '🐈',
    bird: '🐦',
    bicycle: '🚴',
    motorcycle: '🏍️',
    truck: '🚚',
  };
  return icons[objectType.toLowerCase()] || '👁️';
}

// Mock data functions (fallback when API fails)
function mockQuotaUsage(): QuotaUsage {
  return {
    cameras: { current: 1, max: 1, percentage: 100 },
    storage: { currentGb: 2.3, maxGb: 5, percentage: 46 },
    apiCalls: { currentRate: 5, maxRate: 10 },
  };
}

function mockEvents(): DetectionEvent[] {
  return [
    {
      id: 1,
      timestamp: Date.now() - 300000,
      cameraId: 'cam-001',
      objectType: 'person',
      confidence: 0.92,
      boundingBox: { x: 100, y: 150, width: 80, height: 200 },
    },
    {
      id: 2,
      timestamp: Date.now() - 600000,
      cameraId: 'cam-001',
      objectType: 'car',
      confidence: 0.88,
      boundingBox: { x: 200, y: 100, width: 150, height: 120 },
    },
  ];
}

function mockCameras(): Camera[] {
  return [
    {
      id: 'cam-001',
      name: 'Front Door',
      status: 'active',
      lastSeen: Date.now(),
      location: 'Main Entrance',
    },
  ];
}
