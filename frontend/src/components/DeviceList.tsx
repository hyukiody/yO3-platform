import React, { useEffect, useState } from 'react';
import { keyStorage } from '../services/KeyStorageService';
import UniversalSecurePlayer from './UniversalSecurePlayer';

interface DeviceListProps {
  onDeviceSelect?: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * List of paired devices with video playback
 */
export const DeviceList: React.FC<DeviceListProps> = ({ onDeviceSelect }) => {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const deviceList = await keyStorage.listDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (confirm(`Remove device ${deviceId}?`)) {
      try {
        await keyStorage.deleteMasterKey(deviceId);
        await loadDevices();
        if (selectedDevice === deviceId) {
          setSelectedDevice(null);
        }
      } catch (error) {
        console.error('Failed to remove device:', error);
      }
    }
  };

  if (loading) {
    return <div className="device-list loading">Loading devices...</div>;
  }

  if (devices.length === 0) {
    return (
      <div className="device-list empty">
        <p>No devices paired</p>
        <p className="help-text">Pair a device to start viewing secure video</p>
      </div>
    );
  }

  return (
    <div className="device-list">
      <h3>Paired Devices ({devices.length})</h3>
      
      <div className="devices-grid">
        {devices.map(deviceId => (
          <div 
            key={deviceId} 
            className={`device-card ${selectedDevice === deviceId ? 'selected' : ''}`}
            onClick={() => setSelectedDevice(deviceId)}
          >
            <div className="device-header">
              <span className="device-icon">📹</span>
              <span className="device-name">{deviceId}</span>
            </div>
            <button 
              className="btn-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveDevice(deviceId);
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {selectedDevice && (
        <div className="video-viewer">
          <h4>Video Stream - {selectedDevice}</h4>
          <UniversalSecurePlayer 
            mode="live"
            keyStrategy="master"
            videoId="latest" 
            deviceId={selectedDevice}
            enableDetection={false}
            enableSnapshot={true}
            autoPlay={true}
          />
        </div>
      )}
    </div>
  );
};
