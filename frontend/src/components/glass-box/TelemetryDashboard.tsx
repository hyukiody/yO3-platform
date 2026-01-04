import React, { useState, useEffect } from 'react';
import { HealthData } from '../../types/glass-box';
import { telemetryService } from '../../services/telemetryService';
import { ServiceHealthCard } from './ServiceHealthCard';
import styles from './glass-box.module.css';

export const TelemetryDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed'>('closed');

  useEffect(() => {
    // Subscribe to health updates
    const unsubscribe = telemetryService.subscribeToHealth((data) => {
      setHealthData(data);
    });

    // Poll connection state
    const stateInterval = setInterval(() => {
      const states = telemetryService.getConnectionStates();
      setConnectionState(states.health);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(stateInterval);
    };
  }, []);

  const getConnectionStatusText = (): string => {
    switch (connectionState) {
      case 'open': return 'Connected';
      case 'connecting': return 'Connecting...';
      default: return 'Disconnected';
    }
  };

  const getConnectionStatusClass = (): string => {
    switch (connectionState) {
      case 'open': return 'connected';
      case 'connecting': return 'connecting';
      default: return 'disconnected';
    }
  };

  return (
    <div className={styles.telemetryDashboard}>
      <div className={styles.dashboardHeader}>
        <h3 className={styles.dashboardTitle}>System Internals</h3>
        <div className={styles.connectionStatus}>
          <span className={`${styles.statusDot} ${styles[getConnectionStatusClass()]}`} />
          <span>{getConnectionStatusText()}</span>
        </div>
      </div>
      
      <div className={styles.dashboardContent}>
        {!healthData && connectionState === 'open' && (
          <div style={{ color: '#a0a0a0', textAlign: 'center', padding: '20px' }}>
            Waiting for data...
          </div>
        )}
        
        {!healthData && connectionState === 'connecting' && (
          <div style={{ color: '#ffaa00', textAlign: 'center', padding: '20px' }}>
            Connecting to telemetry server...
          </div>
        )}
        
        {!healthData && connectionState === 'closed' && (
          <div style={{ color: '#ff0000', textAlign: 'center', padding: '20px' }}>
            Unable to connect to telemetry server.<br />
            Make sure the server is running on port 9093.
          </div>
        )}
        
        {healthData && (
          <>
            {healthData.services.map((service) => (
              <ServiceHealthCard key={service.name} service={service} />
            ))}
            
            <div style={{ 
              marginTop: '16px', 
              padding: '8px', 
              borderTop: '1px solid rgba(255, 122, 0, 0.3)',
              fontSize: '0.75rem',
              color: '#808080',
              textAlign: 'center'
            }}>
              Last update: {new Date(healthData.timestamp).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
