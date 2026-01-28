/**
 * ControlPanel - System Configuration Management UI
 * Consumes: ConfigService (/api/config on Port 8081)
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { configService } from '@services/ConfigService';
import type { SystemConfig, ConfigDataType } from '@types';
import styles from './ControlPanel.module.css';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditingConfig {
  key: string;
  value: string;
  originalValue: string;
}

export default function ControlPanel({ isOpen, onClose }: ControlPanelProps) {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await configService.getAllConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen, loadConfigs]);

  const handleEdit = (config: SystemConfig) => {
    setEditing({
      key: config.configKey,
      value: config.configValue,
      originalValue: config.configValue,
    });
    setSuccessMessage(null);
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing) return;

    setSaving(true);
    setError(null);
    try {
      await configService.updateConfig(editing.key, { value: editing.value });
      setConfigs((prev) =>
        prev.map((c) =>
          c.configKey === editing.key
            ? { ...c, configValue: editing.value, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setSuccessMessage(`✓ ${editing.key} updated successfully`);
      setEditing(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (config: SystemConfig) => {
    const isEditing = editing?.key === config.configKey;
    const value = isEditing ? editing.value : config.configValue;

    if (!isEditing) {
      return <span className={styles.configValue}>{formatValue(config)}</span>;
    }

    switch (config.dataType) {
      case 'BOOLEAN':
        return (
          <select
            value={value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            className={styles.input}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        );

      case 'INTEGER':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            className={styles.input}
            step="1"
          />
        );

      case 'FLOAT':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            className={styles.input}
            step="0.01"
            min="0"
            max="1"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            className={styles.input}
          />
        );
    }
  };

  const formatValue = (config: SystemConfig) => {
    switch (config.dataType) {
      case 'BOOLEAN':
        return config.configValue === 'true' ? '✓ Enabled' : '✗ Disabled';
      case 'FLOAT':
        return `${(parseFloat(config.configValue) * 100).toFixed(0)}%`;
      default:
        return config.configValue;
    }
  };

  const getIcon = (dataType: ConfigDataType) => {
    switch (dataType) {
      case 'BOOLEAN':
        return '🔘';
      case 'INTEGER':
        return '🔢';
      case 'FLOAT':
        return '📊';
      case 'JSON':
        return '📋';
      default:
        return '📝';
    }
  };

  const getCategoryIcon = (key: string) => {
    if (key.includes('ANALYSIS') || key.includes('REPORT')) return '📈';
    if (key.includes('DETECTION') || key.includes('THRESHOLD')) return '🎯';
    if (key.includes('NIGHT') || key.includes('MODE')) return '🌙';
    if (key.includes('ANOMALY')) return '⚠️';
    if (key.includes('RETENTION') || key.includes('KEEP')) return '🗄️';
    return '⚙️';
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>⚙️ {t('controlPanel.title', 'System Configuration')}</h2>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshBtn}
              onClick={loadConfigs}
              disabled={loading}
              title="Refresh configurations"
            >
              🔄
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              ✕
            </button>
          </div>
        </header>

        {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={loadConfigs}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>
            <span className={styles.spinner}></span>
            Loading configurations...
          </div>
        ) : (
          <div className={styles.configList}>
            <div className={styles.sectionHeader}>
              <span>🔧 Analysis & Detection Settings</span>
              <span className={styles.configCount}>{configs.length} parameters</span>
            </div>

            {configs.map((config) => (
              <div
                key={config.configKey}
                className={`${styles.configItem} ${
                  editing?.key === config.configKey ? styles.editing : ''
                }`}
              >
                <div className={styles.configHeader}>
                  <span className={styles.configIcon}>
                    {getCategoryIcon(config.configKey)}
                  </span>
                  <div className={styles.configMeta}>
                    <span className={styles.configKey}>{config.configKey}</span>
                    {config.description && (
                      <span className={styles.configDesc}>{config.description}</span>
                    )}
                  </div>
                  <span className={styles.dataTypeBadge} title={config.dataType}>
                    {getIcon(config.dataType)}
                  </span>
                </div>

                <div className={styles.configBody}>
                  <div className={styles.valueSection}>{renderInput(config)}</div>

                  <div className={styles.actionSection}>
                    {editing?.key === config.configKey ? (
                      <>
                        <button
                          className={styles.saveBtn}
                          onClick={handleSave}
                          disabled={saving || editing.value === editing.originalValue}
                        >
                          {saving ? '...' : '💾 Save'}
                        </button>
                        <button className={styles.cancelBtn} onClick={handleCancel}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.editBtn}
                        onClick={() => handleEdit(config)}
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>

                {config.updatedAt && (
                  <div className={styles.timestamp}>
                    Updated: {new Date(config.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <footer className={styles.footer}>
          <span className={styles.footerNote}>
            💡 Changes take effect immediately without service restart
          </span>
        </footer>
      </div>
    </div>
  );
}
