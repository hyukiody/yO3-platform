/**
 * CameraService - Camera Management API Client
 * Consumes: Unified endpoints via API Gateway (Port 8091)
 * Implementation: Directive 1 (Centralized Ingress)
 */

import apiClient from '@infrastructure/api/apiClient';
import type {
  CameraFull,
  CameraCreateRequest,
  CameraUpdateRequest,
  CameraType,
  CameraStatus,
} from '@types';

const CAMERA_API_URL = '/api/cameras';

class CameraService {
  // Implementation: Centralized Ingress (Directive 1)
  // Ad-hoc auth headers and localized safeJsonParse logic have been eradicated.

  // ===== READ Operations =====

  /**
   * Get all cameras
   */
  async getAllCameras(): Promise<CameraFull[]> {
    try {
      const response = await apiClient.get(CAMERA_API_URL);
      return response.data;
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
      const response = await apiClient.get(`${CAMERA_API_URL}/active`);
      return response.data;
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
      const response = await apiClient.get(`${CAMERA_API_URL}/enabled`);
      return response.data;
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
      const response = await apiClient.get(`${CAMERA_API_URL}/count`);
      return response.data;
    } catch (err) {
      return this.getMockCameras().length;
    }
  }

  /**
   * Get cameras by type
   */
  async getCamerasByType(type: CameraType): Promise<CameraFull[]> {
    try {
      const response = await apiClient.get(`${CAMERA_API_URL}/type/${type}`);
      return response.data;
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
      const response = await apiClient.get(`${CAMERA_API_URL}/status/${status}`);
      return response.data;
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
      const response = await apiClient.get(`${CAMERA_API_URL}/${id}`);
      return response.data;
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
      const response = await apiClient.post(CAMERA_API_URL, request);
      return response.data;
    } catch (err: any) {
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
      const response = await apiClient.put(`${CAMERA_API_URL}/${id}`, request);
      return response.data;
    } catch (err: any) {
      console.warn('🎯 DEMO MODE: Simulating camera update');
      const camera = await this.getCamera(id);
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
      const response = await apiClient.patch(`${CAMERA_API_URL}/${id}/toggle-active`, null, {
        params: { active }
      });
      return response.data;
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
      const response = await apiClient.patch(`${CAMERA_API_URL}/${id}/toggle-enabled`, null, {
        params: { enabled }
      });
      return response.data;
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
      const response = await apiClient.patch(`${CAMERA_API_URL}/${id}/status`, null, {
        params: { status, errorMessage }
      });
      return response.data;
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
      await apiClient.delete(`${CAMERA_API_URL}/${id}`);
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
