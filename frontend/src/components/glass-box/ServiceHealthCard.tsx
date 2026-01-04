import React from 'react';
import { ServiceHealth } from '../../types/glass-box';
import styles from './glass-box.module.css';

interface ServiceHealthCardProps {
  service: ServiceHealth;
}

export const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({ service }) => {
  const getLatencyClass = (latency: number): string => {
    if (latency < 100) return 'good';
    if (latency < 500) return 'warning';
    return 'critical';
  };

  return (
    <div className={styles.serviceCard}>
      <div className={styles.serviceHeader}>
        <span className={styles.serviceName}>{service.name}</span>
        <div className={styles.serviceMetrics}>
          <span 
            className={`${styles.healthIndicator} ${styles[service.status]}`}
            title={service.status}
          />
          <span className={`${styles.latency} ${styles[getLatencyClass(service.latency)]}`}>
            {service.latency}ms
          </span>
        </div>
      </div>
      <div className={styles.serviceDetails}>
        <div className={styles.serviceEndpoint}>{service.endpoint}</div>
        {service.message && service.message !== 'OK' && (
          <div className={styles.serviceMessage}>{service.message}</div>
        )}
      </div>
    </div>
  );
};
