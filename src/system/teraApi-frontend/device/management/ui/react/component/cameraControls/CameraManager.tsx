/**
 * CameraManager.tsx - Camera CRUD Management UI
 * 
 * Full camera management interface consuming the Data Core Camera API (Port 9090):
 * - List all cameras with filtering and search
 * - Add new cameras with validation
 * - Edit camera configuration
 * - Toggle active/enabled status
 * - Delete cameras with confirmation
 * - ONE-CLICK ADD for local webcams (native device support)
 */

import { useState, useEffect, useCallback } from 'react';
import { cameraService } from '@services/CameraService';
import { useLocalWebcams } from '@hooks/useLocalWebcams';
import type { CameraFull, CameraCreateRequest, CameraUpdateRequest, CameraType, LocalWebcam } from '@types';
import styles from './CameraManager.module.css';

interface CameraManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'add' | 'edit';
type FilterStatus = 'all' | 'active' | 'inactive' | 'enabled' | 'disabled';

// Default form state matching CameraCreateRequest
const getDefaultFormData = (): CameraCreateRequest => ({
  name: '',
  description: '',
  streamUrl: '',
  rtspUrl: '',
  cameraType: 'IP',
  location: '',
  username: '',
  password: '',
  port: 554,
  fps: 30,
  resolution: '1920x1080',
  codec: 'H.264',
  bitrateKbps: 2500,
  metadata: '',
});

export default function CameraManager({ isOpen, onClose }: CameraManagerProps) {
  // State
  const [cameras, setCameras] = useState<CameraFull[]>([]);
  const [filteredCameras, setFilteredCameras] = useState<CameraFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCamera, setSelectedCamera] = useState<CameraFull | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showWebcamPanel, setShowWebcamPanel] = useState(false);
  
  // Local Webcam Hook
  const { 
    webcams, 
    loading: webcamLoading, 
    error: webcamError, 
    hasPermission, 
    requestPermission, 
    refreshWebcams,
    getStreamUrl 
  } = useLocalWebcams();
  
  // Form State
  const [formData, setFormData] = useState<CameraCreateRequest>(getDefaultFormData());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load cameras
  const loadCameras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cameraService.getAllCameras();
      setCameras(data);
      setFilteredCameras(data);
      // Clear error if we successfully loaded (even mock data)
      if (data.length > 0) {
        setError(null);
      }
    } catch (err) {
      // Only log once, not every time
      if (import.meta.env.DEV) {
        console.debug('Camera API unavailable, using demo data');
      }
      // Use mock data in development
      const mockData = cameraService.getMockCameras();
      setCameras(mockData);
      setFilteredCameras(mockData);
      setError('Demo mode - Backend unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCameras();
    }
  }, [isOpen, loadCameras]);

  // Filter cameras when search or filter changes
  useEffect(() => {
    let result = [...cameras];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cam => 
        cam.name.toLowerCase().includes(query) ||
        (cam.location?.toLowerCase().includes(query)) ||
        (cam.streamUrl?.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    switch (filterStatus) {
      case 'active':
        result = result.filter(cam => cam.isActive);
        break;
      case 'inactive':
        result = result.filter(cam => !cam.isActive);
        break;
      case 'enabled':
        result = result.filter(cam => cam.isEnabled);
        break;
      case 'disabled':
        result = result.filter(cam => !cam.isEnabled);
        break;
    }
    
    setFilteredCameras(result);
  }, [cameras, searchQuery, filterStatus]);

  // Clear success message after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Camera name is required';
    }
    // WEBCAM type doesn't require URL - uses deviceId
    if (formData.cameraType !== 'WEBCAM' && !formData.streamUrl && !formData.rtspUrl) {
      errors.streamUrl = 'Stream URL or RTSP URL is required';
    }
    if (formData.streamUrl && !isValidUrl(formData.streamUrl) && formData.cameraType !== 'WEBCAM') {
      errors.streamUrl = 'Invalid URL format';
    }
    if (formData.fps !== undefined && (formData.fps < 1 || formData.fps > 120)) {
      errors.fps = 'FPS must be between 1 and 120';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    // Allow rtsp://, http(s)://, and webcam:// protocols
    return url.startsWith('rtsp://') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('webcam://');
  };

  /**
   * ONE-CLICK ADD: Add a local webcam as a camera source
   */
  const handleAddLocalWebcam = async (webcam: LocalWebcam) => {
    setLoading(true);
    setError(null);
    
    try {
      const webcamData: CameraCreateRequest = {
        name: webcam.label || `Local Webcam`,
        description: `Native webcam device (${webcam.deviceId.substring(0, 8)}...)`,
        streamUrl: getStreamUrl(webcam.deviceId),
        cameraType: 'WEBCAM',
        location: 'Local Device',
        fps: 30,
        resolution: '1280x720',
        codec: 'MJPEG',
        bitrateKbps: 2500,
        metadata: JSON.stringify({ 
          deviceId: webcam.deviceId, 
          groupId: webcam.groupId,
          isLocalWebcam: true 
        }),
      };
      
      await cameraService.createCamera(webcamData);
      setSuccess(`✓ Webcam "${webcam.label}" added successfully!`);
      await loadCameras();
      setShowWebcamPanel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add webcam');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle webcam permission request
   */
  const handleRequestWebcamPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      await refreshWebcams();
      setSuccess('Camera permission granted! Webcams detected.');
    }
  };

  // Handlers
  const handleAddCamera = () => {
    setFormData(getDefaultFormData());
    setFormErrors({});
    setViewMode('add');
  };

  const handleEditCamera = (camera: CameraFull) => {
    setSelectedCamera(camera);
    setFormData({
      name: camera.name,
      description: camera.description,
      streamUrl: camera.streamUrl,
      rtspUrl: camera.rtspUrl,
      cameraType: camera.cameraType,
      location: camera.location,
      username: camera.username,
      password: camera.password,
      port: camera.port,
      fps: camera.fps,
      resolution: camera.resolution,
      codec: camera.codec,
      bitrateKbps: camera.bitrateKbps,
      metadata: typeof camera.metadata === 'object' ? JSON.stringify(camera.metadata) : '',
    });
    setFormErrors({});
    setViewMode('edit');
  };

  const handleSaveCamera = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (viewMode === 'add') {
        await cameraService.createCamera(formData);
        setSuccess('Camera created successfully');
      } else if (viewMode === 'edit' && selectedCamera) {
        const updateData: CameraUpdateRequest = { ...formData };
        await cameraService.updateCamera(selectedCamera.id, updateData);
        setSuccess('Camera updated successfully');
      }
      await loadCameras();
      setViewMode('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (camera: CameraFull) => {
    try {
      await cameraService.toggleActive(camera.id, !camera.isActive);
      await loadCameras();
      setSuccess(`Camera ${camera.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const handleToggleEnabled = async (camera: CameraFull) => {
    try {
      await cameraService.toggleEnabled(camera.id, !camera.isEnabled);
      await loadCameras();
      setSuccess(`Camera ${camera.isEnabled ? 'disabled' : 'enabled'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const handleDeleteCamera = async (id: string) => {
    setLoading(true);
    try {
      await cameraService.deleteCamera(id);
      setSuccess('Camera deleted successfully');
      setDeleteConfirmId(null);
      await loadCameras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete camera');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedCamera(null);
    setFormErrors({});
  };

  // Status badge component
  const StatusBadge = ({ isActive, isEnabled }: { isActive: boolean; isEnabled: boolean }) => (
    <div className={styles.statusBadges}>
      <span className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}>
        {isActive ? '● Active' : '○ Inactive'}
      </span>
      <span className={`${styles.badge} ${isEnabled ? styles.badgeEnabled : styles.badgeDisabled}`}>
        {isEnabled ? '✓ Enabled' : '✗ Disabled'}
      </span>
    </div>
  );

  // Helper function to truncate long URLs
  const truncateUrl = (url: string | undefined, maxLength: number = 40): string => {
    if (!url) return '-';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  };

  // Get status icon/color based on camera status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED': return '🟢';
      case 'DISCONNECTED': return '🔴';
      case 'ERROR': return '⚠️';
      case 'INITIALIZING': return '🟡';
      default: return '⚪';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {viewMode !== 'list' && (
              <button className={styles.backBtn} onClick={handleCancel}>←</button>
            )}
            <h2>
              {viewMode === 'list' && '📹 Camera Management'}
              {viewMode === 'add' && '➕ Add Camera'}
              {viewMode === 'edit' && '✏️ Edit Camera'}
            </h2>
          </div>
          <div className={styles.headerActions}>
            {viewMode === 'list' && (
              <>
                <button 
                  className={styles.webcamBtn} 
                  onClick={() => setShowWebcamPanel(!showWebcamPanel)}
                  title="Add Local Webcam"
                >
                  🎥 {webcams.length > 0 && <span className={styles.webcamBadge}>{webcams.length}</span>}
                </button>
                <button className={styles.addBtn} onClick={handleAddCamera}>
                  + Add Camera
                </button>
              </>
            )}
            <button className={styles.refreshBtn} onClick={loadCameras} title="Refresh">🔄</button>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Success Banner */}
        {success && (
          <div className={styles.successBanner}>
            ✓ {success}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Local Webcam Panel - ONE-CLICK ADD */}
        {showWebcamPanel && viewMode === 'list' && (
          <div className={styles.webcamPanel}>
            <div className={styles.webcamPanelHeader}>
              <h3>🎥 Local Webcams</h3>
              <span className={styles.webcamCount}>{webcams.length} detected</span>
            </div>
            
            {!hasPermission ? (
              <div className={styles.webcamPermission}>
                <p>Camera permission required to detect local webcams</p>
                <button 
                  className={styles.permissionBtn} 
                  onClick={handleRequestWebcamPermission}
                  disabled={webcamLoading}
                >
                  {webcamLoading ? 'Requesting...' : '🔓 Grant Camera Access'}
                </button>
              </div>
            ) : webcamLoading ? (
              <div className={styles.webcamLoading}>
                <div className={styles.spinner}></div>
                <span>Detecting webcams...</span>
              </div>
            ) : webcams.length === 0 ? (
              <div className={styles.webcamEmpty}>
                <span>No webcams detected on this device</span>
                <button className={styles.refreshWebcamBtn} onClick={refreshWebcams}>
                  🔄 Refresh
                </button>
              </div>
            ) : (
              <div className={styles.webcamList}>
                {webcams.map((webcam, index) => (
                  <div key={webcam.deviceId} className={styles.webcamItem}>
                    <div className={styles.webcamInfo}>
                      <span className={styles.webcamName}>
                        📷 {webcam.label || `Camera ${index + 1}`}
                      </span>
                      <span className={styles.webcamId}>
                        ID: {webcam.deviceId.substring(0, 12)}...
                      </span>
                    </div>
                    <button 
                      className={styles.addWebcamBtn}
                      onClick={() => handleAddLocalWebcam(webcam)}
                      disabled={loading}
                      title="One-click add this webcam"
                    >
                      {loading ? '...' : '➕ Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {webcamError && (
              <div className={styles.webcamError}>⚠️ {webcamError}</div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className={styles.content}>
          {loading && viewMode === 'list' ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>Loading cameras...</span>
            </div>
          ) : viewMode === 'list' ? (
            <>
              {/* Search & Filter Bar */}
              <div className={styles.filterBar}>
                <input
                  type="text"
                  placeholder="Search cameras..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Camera Count */}
              <div className={styles.sectionHeader}>
                <span>Cameras</span>
                <span className={styles.cameraCount}>{filteredCameras.length} of {cameras.length}</span>
              </div>

              {/* Camera List */}
              <div className={styles.cameraList}>
                {filteredCameras.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📹</span>
                    <p>{searchQuery || filterStatus !== 'all' ? 'No cameras match your filters' : 'No cameras configured'}</p>
                    <button className={styles.addBtn} onClick={handleAddCamera}>Add First Camera</button>
                  </div>
                ) : (
                  filteredCameras.map(camera => (
                    <div key={camera.id} className={styles.cameraCard}>
                      <div className={styles.cameraHeader}>
                        <div className={styles.cameraInfo}>
                          <span className={styles.cameraName}>
                            {getStatusIcon(camera.status)} {camera.name}
                          </span>
                          <span className={styles.cameraLocation}>📍 {camera.location || 'No location'}</span>
                        </div>
                        <StatusBadge isActive={camera.isActive} isEnabled={camera.isEnabled} />
                      </div>
                      
                      <div className={styles.cameraDetails}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Type</span>
                          <span className={styles.detailValue}>{camera.cameraType}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Resolution</span>
                          <span className={styles.detailValue}>{camera.resolution || '-'}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>FPS</span>
                          <span className={styles.detailValue}>{camera.fps}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Stream</span>
                          <span className={styles.detailValue} title={camera.streamUrl || camera.rtspUrl}>
                            {truncateUrl(camera.streamUrl || camera.rtspUrl)}
                          </span>
                        </div>
                      </div>

                      <div className={styles.cameraFeatures}>
                        <span className={`${styles.feature} ${camera.status === 'CONNECTED' ? styles.featureOn : ''}`}>
                          {getStatusIcon(camera.status)} {camera.status}
                        </span>
                        <span className={styles.feature}>
                          🎬 {camera.codec || 'Unknown'}
                        </span>
                        <span className={styles.feature}>
                          📊 {camera.bitrateKbps} kbps
                        </span>
                      </div>

                      <div className={styles.cameraActions}>
                        <button 
                          className={styles.toggleBtn}
                          onClick={() => handleToggleActive(camera)}
                          title={camera.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {camera.isActive ? '⏸️ Pause' : '▶️ Start'}
                        </button>
                        <button 
                          className={styles.toggleBtn}
                          onClick={() => handleToggleEnabled(camera)}
                          title={camera.isEnabled ? 'Disable' : 'Enable'}
                        >
                          {camera.isEnabled ? '🔕 Disable' : '🔔 Enable'}
                        </button>
                        <button 
                          className={styles.editBtn}
                          onClick={() => handleEditCamera(camera)}
                        >
                          ✏️ Edit
                        </button>
                        {deleteConfirmId === camera.id ? (
                          <>
                            <button 
                              className={styles.confirmDeleteBtn}
                              onClick={() => handleDeleteCamera(camera.id)}
                            >
                              Confirm
                            </button>
                            <button 
                              className={styles.cancelDeleteBtn}
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button 
                            className={styles.deleteBtn}
                            onClick={() => setDeleteConfirmId(camera.id)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* Add/Edit Form */
            <div className={styles.form}>
              <div className={styles.formSection}>
                <h3>Basic Information</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Camera Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={formErrors.name ? styles.inputError : ''}
                      placeholder="e.g., Front Entrance Cam"
                    />
                    {formErrors.name && <span className={styles.error}>{formErrors.name}</span>}
                  </div>
                  <div className={styles.formGroup}>
                    <label>Location</label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Building A - North Wing"
                    />
                  </div>
                  <div className={styles.formGroup + ' ' + styles.fullWidth}>
                    <label>Description</label>
                    <input
                      type="text"
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Camera description"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>Stream Configuration</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup + ' ' + styles.fullWidth}>
                    <label>Stream URL *</label>
                    <input
                      type="text"
                      value={formData.streamUrl || ''}
                      onChange={e => setFormData({ ...formData, streamUrl: e.target.value })}
                      className={formErrors.streamUrl ? styles.inputError : ''}
                      placeholder="http://192.168.1.100/stream"
                    />
                    {formErrors.streamUrl && <span className={styles.error}>{formErrors.streamUrl}</span>}
                  </div>
                  <div className={styles.formGroup + ' ' + styles.fullWidth}>
                    <label>RTSP URL (alternative)</label>
                    <input
                      type="text"
                      value={formData.rtspUrl || ''}
                      onChange={e => setFormData({ ...formData, rtspUrl: e.target.value })}
                      placeholder="rtsp://192.168.1.100:554/stream"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>Technical Settings</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Camera Type</label>
                    <select
                      value={formData.cameraType}
                      onChange={e => setFormData({ ...formData, cameraType: e.target.value as CameraType })}
                    >
                      <option value="IP">IP Camera</option>
                      <option value="USB">USB Camera</option>
                      <option value="RTSP">RTSP Stream</option>
                      <option value="ONVIF">ONVIF Device</option>
                      <option value="WEBCAM">🎥 Local Webcam</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Resolution</label>
                    <select
                      value={formData.resolution || '1920x1080'}
                      onChange={e => setFormData({ ...formData, resolution: e.target.value })}
                    >
                      <option value="640x480">640×480 (SD)</option>
                      <option value="1280x720">1280×720 (HD)</option>
                      <option value="1920x1080">1920×1080 (Full HD)</option>
                      <option value="2560x1440">2560×1440 (2K)</option>
                      <option value="3840x2160">3840×2160 (4K)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Frame Rate (FPS)</label>
                    <input
                      type="number"
                      value={formData.fps || 30}
                      onChange={e => setFormData({ ...formData, fps: parseInt(e.target.value) || 30 })}
                      min={1}
                      max={120}
                      className={formErrors.fps ? styles.inputError : ''}
                    />
                    {formErrors.fps && <span className={styles.error}>{formErrors.fps}</span>}
                  </div>
                  <div className={styles.formGroup}>
                    <label>Port</label>
                    <input
                      type="number"
                      value={formData.port || 554}
                      onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) || 554 })}
                      min={1}
                      max={65535}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>Encoding Settings</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Codec</label>
                    <select
                      value={formData.codec || 'H.264'}
                      onChange={e => setFormData({ ...formData, codec: e.target.value })}
                    >
                      <option value="H.264">H.264</option>
                      <option value="H.265">H.265 (HEVC)</option>
                      <option value="MJPEG">MJPEG</option>
                      <option value="VP8">VP8</option>
                      <option value="VP9">VP9</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Bitrate (kbps)</label>
                    <input
                      type="number"
                      value={formData.bitrateKbps || 2500}
                      onChange={e => setFormData({ ...formData, bitrateKbps: parseInt(e.target.value) || 2500 })}
                      min={100}
                      max={50000}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>Authentication (Optional)</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Username</label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Camera username"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Password</label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Camera password"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={handleCancel}>
                  Cancel
                </button>
                <button 
                  className={styles.saveBtn} 
                  onClick={handleSaveCamera}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : viewMode === 'add' ? 'Create Camera' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
