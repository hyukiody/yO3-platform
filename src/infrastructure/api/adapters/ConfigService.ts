/**
 * ConfigService - System Configuration API Client
 * Consumes: /api/config endpoints on Port 8081
 */

import type { SystemConfig, ConfigUpdateRequest, ConfigBulkUpdateItem, ConfigDataType } from '@types';

const CONFIG_API_URL = '/api/config';

class ConfigService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('yo3_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Get all system configurations
   */
  async getAllConfigs(): Promise<SystemConfig[]> {
    try {
      const response = await fetch(CONFIG_API_URL, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch configs: ${response.status}`);
      }

      const data = await response.json();
      // Handle both direct array and wrapped { value: [...] } response formats
      const configs = Array.isArray(data) ? data : data.value || [];
      
      // Map API response format (key/value/type) to internal format (configKey/configValue/dataType)
      return configs.map((item: { key?: string; value?: unknown; type?: string; configKey?: string; configValue?: string; dataType?: string }) => ({
        configKey: item.configKey || item.key || '',
        configValue: String(item.configValue ?? item.value ?? ''),
        dataType: (item.dataType || item.type?.toUpperCase() || 'STRING') as ConfigDataType,
        description: `Configuration: ${item.configKey || item.key}`,
      }));
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock config data');
      return this.getMockConfigs();
    }
  }

  /**
   * Get a single configuration by key
   */
  async getConfig(key: string): Promise<SystemConfig> {
    try {
      const response = await fetch(`${CONFIG_API_URL}/${key}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Config not found: ${key}`);
      }

      return response.json();
    } catch (err) {
      const mocks = this.getMockConfigs();
      const config = mocks.find((c) => c.configKey === key);
      if (!config) throw new Error(`Config not found: ${key}`);
      return config;
    }
  }

  /**
   * Update a configuration value
   */
  async updateConfig(key: string, request: ConfigUpdateRequest): Promise<SystemConfig> {
    try {
      const response = await fetch(`${CONFIG_API_URL}/${key}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update config');
      }

      return response.json();
    } catch (err) {
      console.warn('🎯 DEMO MODE: Simulating config update');
      return {
        configKey: key,
        configValue: request.value,
        dataType: 'STRING',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Delete a configuration
   */
  async deleteConfig(key: string): Promise<void> {
    const response = await fetch(`${CONFIG_API_URL}/${key}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete config: ${key}`);
    }
  }

  /**
   * Bulk update multiple configurations
   */
  async bulkUpdateConfigs(items: ConfigBulkUpdateItem[]): Promise<SystemConfig[]> {
    try {
      const response = await fetch(`${CONFIG_API_URL}/bulk-update`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(items),
      });

      if (!response.ok) {
        throw new Error('Bulk update failed');
      }

      return response.json();
    } catch (err) {
      console.warn('🎯 DEMO MODE: Simulating bulk update');
      return items.map((item) => ({
        configKey: item.configKey,
        configValue: item.configValue,
        dataType: 'STRING' as const,
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  /**
   * Mock configurations for demo/offline mode
   */
  getMockConfigs(): SystemConfig[] {
    return [
      {
        configKey: 'ANALYSIS_INTERVAL_MINUTES',
        configValue: '60',
        dataType: 'INTEGER',
        description: 'Minutes between automatic report generation',
      },
      {
        configKey: 'DETECTION_THRESHOLD',
        configValue: '0.75',
        dataType: 'FLOAT',
        description: 'Minimum confidence to include detections',
      },
      {
        configKey: 'ENABLE_NIGHT_MODE',
        configValue: 'false',
        dataType: 'BOOLEAN',
        description: 'Enhanced sensitivity for low-light conditions',
      },
      {
        configKey: 'ACTIVE_CLASSES',
        configValue: 'person,car,bicycle',
        dataType: 'STRING',
        description: 'Comma-separated list of monitored detection classes',
      },
      {
        configKey: 'MAX_REPORTS_TO_KEEP',
        configValue: '1000',
        dataType: 'INTEGER',
        description: 'Maximum number of reports before cleanup',
      },
      {
        configKey: 'ENABLE_ANOMALY_DETECTION',
        configValue: 'true',
        dataType: 'BOOLEAN',
        description: 'Enable automatic anomaly detection in reports',
      },
      {
        configKey: 'ANOMALY_SENSITIVITY',
        configValue: '0.5',
        dataType: 'FLOAT',
        description: 'Anomaly detection sensitivity (0.0 - 1.0)',
      },
      {
        configKey: 'REPORT_RETENTION_DAYS',
        configValue: '90',
        dataType: 'INTEGER',
        description: 'Days before old reports are archived',
      },
    ];
  }
}

export const configService = new ConfigService();
export default configService;
