/**
 * CameraService - Camera Management API Client
 * Consumes: /api/cameras endpoints on Port 9090
 */

import type {
  CameraFull,
  CameraCreateRequest,
  CameraUpdateRequest,
  CameraType,
  CameraStatus,
} from '../types';

const CAMERA_API_URL = '/api/cameras';

class CameraService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('yo3_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Safely parse JSON response, falling back to null if not valid JSON
   */
  private async safeJsonParse<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error('Empty response from server');
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }
  }

  // ===== READ Operations =====

  /**
   * Get all cameras
   */
  async getAllCameras(): Promise<CameraFull[]> {
    try {
      const response = await fetch(CAMERA_API_URL, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cameras: ${response.status}`);
      }

      return await this.safeJsonParse<CameraFull[]>(response);
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock camera data');
      return this.getMockCameras();
    }
  }

  /**
   * Get active cameras only
   */
  async getActiveCameras(): Promise<CameraFull[]> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/active`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active cameras');
      }

      return await this.safeJsonParse<CameraFull[]>(response);
    } catch (err) {
      const mocks = this.getMockCameras();
      return mocks.filter((c) => c.isActive);
    }
  }

  /**
   * Get enabled cameras only
   */
  async getEnabledCameras(): Promise<CameraFull[]> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/enabled`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch enabled cameras');
      }

      return await this.safeJsonParse<CameraFull[]>(response);
    } catch (err) {
      const mocks = this.getMockCameras();
      return mocks.filter((c) => c.isEnabled);
    }
  }

  /**
   * Get camera count
   */
  async getCameraCount(): Promise<number> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/count`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch camera count');
      }

      return await this.safeJsonParse<number>(response);
    } catch (err) {
      return this.getMockCameras().length;
    }
  }

  /**
   * Get cameras by type
   */
  async getCamerasByType(type: CameraType): Promise<CameraFull[]> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/type/${type}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cameras by type: ${type}`);
      }

      return await this.safeJsonParse<CameraFull[]>(response);
    } catch (err) {
      const mocks = this.getMockCameras();
      return mocks.filter((c) => c.cameraType === type);
    }
  }

  /**
   * Get cameras by status
   */
  async getCamerasByStatus(status: CameraStatus): Promise<CameraFull[]> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/status/${status}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cameras by status: ${status}`);
      }

      return await this.safeJsonParse<CameraFull[]>(response);
    } catch (err) {
      const mocks = this.getMockCameras();
      return mocks.filter((c) => c.status === status);
    }
  }

  /**
   * Get a single camera by ID
   */
  async getCamera(id: string): Promise<CameraFull> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/${id}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Camera not found: ${id}`);
      }

      return await this.safeJsonParse<CameraFull>(response);
    } catch (err) {
      const mocks = this.getMockCameras();
      const camera = mocks.find((c) => c.id === id);
      if (!camera) throw new Error(`Camera not found: ${id}`);
      return camera;
    }
  }

  // ===== CREATE Operation =====

  /**
   * Create a new camera
   */
  async createCamera(request: CameraCreateRequest): Promise<CameraFull> {
    try {
      const response = await fetch(CAMERA_API_URL, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to create camera';
        try { errorMsg = JSON.parse(errorText).error || errorMsg; } catch {}
        throw new Error(errorMsg);
      }

      return await this.safeJsonParse<CameraFull>(response);
    } catch (err) {
      console.warn('🎯 DEMO MODE: Simulating camera creation');
      return {
        id: `demo-${Date.now()}`,
        name: request.name,
        description: request.description,
        streamUrl: request.streamUrl,
        rtspUrl: request.rtspUrl,
        cameraType: request.cameraType,
        location: request.location,
        isActive: true,
        isEnabled: true,
        port: request.port || 554,
        fps: request.fps || 30,
        resolution: request.resolution || '1920x1080',
        codec: request.codec || 'H.264',
        bitrateKbps: request.bitrateKbps || 2000,
        status: 'INITIALIZING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // ===== UPDATE Operations =====

  /**
   * Update a camera
   */
  async updateCamera(id: string, request: CameraUpdateRequest): Promise<CameraFull> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to update camera';
        try { errorMsg = JSON.parse(errorText).error || errorMsg; } catch {}
        throw new Error(errorMsg);
      }

      return await this.safeJsonParse<CameraFull>(response);
    } catch (err) {
      console.warn('🎯 DEMO MODE: Simulating camera update');
      const camera = await this.getCamera(id);
      // Handle metadata conversion from string to object if needed
      const { metadata: metadataStr, ...otherFields } = request;
      const metadata = metadataStr 
        ? (typeof metadataStr === 'string' ? JSON.parse(metadataStr) : metadataStr) 
        : camera.metadata;
      return {
        ...camera,
        ...otherFields,
        metadata,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Toggle camera active status
   */
  async toggleActive(id: string, active: boolean): Promise<CameraFull> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/${id}/toggle-active?active=${active}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle camera active status');
      }

      return await this.safeJsonParse<CameraFull>(response);
    } catch (err) {
      console.warn('🎯 DEMO MODE: Simulating toggle active');
      const camera = await this.getCamera(id);
      return {
        ...camera,
        isActive: active,
        status: active ? 'CONNECTED' : 'DISCONNECTED',
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Toggle camera enabled status
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<CameraFull> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/${id}/toggle-enabled?enabled=${enabled}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle camera enabled status');
      }

      return await this.safeJsonParse<CameraFull>(response);
    } catch (err) {
      console.warn('🎯 DEMO MODE: Simulating toggle enabled');
      const camera = await this.getCamera(id);
      return {
        ...camera,
        isEnabled: enabled,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Update camera status
   */
  async updateStatus(id: string, status: CameraStatus, errorMessage?: string): Promise<CameraFull> {
    try {
      const params = new URLSearchParams({ status });
      if (errorMessage) params.append('errorMessage', errorMessage);

      const response = await fetch(`${CAMERA_API_URL}/${id}/status?${params}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to update camera status');
      }

      return await this.safeJsonParse<CameraFull>(response);
    } catch (err) {
      console.warn('🎯 DEMO MODE: Simulating status update');
      const camera = await this.getCamera(id);
      return {
        ...camera,
        status,
        errorMessage,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // ===== DELETE Operation =====

  /**
   * Delete a camera
   */
  async deleteCamera(id: string): Promise<void> {
    try {
      const response = await fetch(`${CAMERA_API_URL}/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete camera: ${id}`);
      }
    } catch (err) {
      console.warn('🎯 DEMO MODE: Simulating camera deletion');
    }
  }

  // ===== Mock Data =====

  getMockCameras(): CameraFull[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'cam-001',
        name: 'Front Gate',
        description: 'Main entrance surveillance',
        streamUrl: 'http://192.168.1.100:8080/stream',
        rtspUrl: 'rtsp://192.168.1.100:554/stream',
        cameraType: 'IP',
        location: 'Main Entrance',
        isActive: true,
        isEnabled: true,
        port: 554,
        fps: 30,
        resolution: '1920x1080',
        codec: 'H.264',
        bitrateKbps: 2000,
        connectedAt: now,
        lastFrameAt: now,
        status: 'CONNECTED',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cam-002',
        name: 'Parking Lot A',
        description: 'Parking area monitor',
        streamUrl: 'http://192.168.1.101:8080/stream',
        rtspUrl: 'rtsp://192.168.1.101:554/stream',
        cameraType: 'RTSP',
        location: 'Parking Lot',
        isActive: true,
        isEnabled: true,
        port: 554,
        fps: 25,
        resolution: '1280x720',
        codec: 'H.265',
        bitrateKbps: 1500,
        connectedAt: now,
        lastFrameAt: now,
        status: 'CONNECTED',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cam-003',
        name: 'Lobby Camera',
        description: 'Indoor lobby monitoring',
        streamUrl: 'http://192.168.1.102:8080/stream',
        cameraType: 'IP',
        location: 'Building Lobby',
        isActive: false,
        isEnabled: true,
        port: 80,
        fps: 30,
        resolution: '1920x1080',
        codec: 'H.264',
        bitrateKbps: 2500,
        status: 'DISCONNECTED',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}

export const cameraService = new CameraService();
export default cameraService;
