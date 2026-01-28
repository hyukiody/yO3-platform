/**
 * useLocalWebcams - Hook for detecting and managing local webcams
 * 
 * Uses the browser's MediaDevices API to enumerate available video input devices.
 * Allows users to test the surveillance platform with their own webcams.
 * 
 * GDAI Assertion: Only accesses cameras with explicit user permission
 */

import { useState, useEffect, useCallback } from 'react';
import type { LocalWebcam } from '@types';

interface UseLocalWebcamsResult {
  webcams: LocalWebcam[];
  loading: boolean;
  error: string | null;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  refreshWebcams: () => Promise<void>;
  getStreamUrl: (deviceId: string) => string;
}

/**
 * Hook to detect and enumerate local webcams via MediaDevices API
 */
export function useLocalWebcams(): UseLocalWebcamsResult {
  const [webcams, setWebcams] = useState<LocalWebcam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  /**
   * Request camera permission and enumerate devices
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Request permission by getting a temporary stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      
      if (message.includes('NotAllowedError') || message.includes('Permission denied')) {
        setError('Camera permission denied. Please allow camera access in browser settings.');
      } else if (message.includes('NotFoundError')) {
        setError('No camera found on this device.');
      } else {
        setError(message);
      }
      
      setHasPermission(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Enumerate available video input devices
   */
  const refreshWebcams = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Device enumeration not supported');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          groupId: device.groupId,
        }));

      setWebcams(videoDevices);
      
      // If we got labels, we have permission
      if (videoDevices.some(d => d.label && !d.label.startsWith('Camera '))) {
        setHasPermission(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enumerate devices');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate a virtual stream URL for a local webcam
   * This uses a special protocol that the video player will recognize
   */
  const getStreamUrl = useCallback((deviceId: string): string => {
    // Use a special webcam:// protocol that VideoFeedPlayer will recognize
    return `webcam://${deviceId}`;
  }, []);

  // Initial device enumeration (without permission, labels may be empty)
  useEffect(() => {
    refreshWebcams();

    // Listen for device changes (camera plugged in/unplugged)
    const handleDeviceChange = () => {
      refreshWebcams();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshWebcams]);

  return {
    webcams,
    loading,
    error,
    hasPermission,
    requestPermission,
    refreshWebcams,
    getStreamUrl,
  };
}

export default useLocalWebcams;
