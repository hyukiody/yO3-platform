// API Service for yo3 Platform
import apiClient from '@infrastructure/api/apiClient';
import type { AuthenticationRequest, AuthenticationResponse, User, DetectionEvent, Camera, QuotaUsage } from '@types';

// Use relative paths to leverage Vite proxy configuration via the central apiClient
const API_BASE_URL = '/api/auth';
const EVENTS_API_URL = '/api/events';

class ApiService {
  // Implementation: Centralized Ingress (Directive 1)
  // Localized headers and token lookups have been eradicated in favor of apiClient interceptors.

  // ===== Authentication =====

  async login(credentials: AuthenticationRequest): Promise<AuthenticationResponse> {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/login`, credentials);
      const data = response.data;
      
      // Store token and seed key
      localStorage.setItem('yo3_token', data.accessToken);
      if (credentials.seedKey) {
        localStorage.setItem('yo3_seed_key', credentials.seedKey);
      }

      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async register(credentials: AuthenticationRequest): Promise<AuthenticationResponse> {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/register`, credentials);
      const data = response.data;
      
      localStorage.setItem('yo3_token', data.accessToken);
      if (credentials.seedKey) {
        localStorage.setItem('yo3_seed_key', credentials.seedKey);
      }

      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  logout(): void {
    localStorage.removeItem('yo3_token');
    localStorage.removeItem('yo3_seed_key');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('yo3_token');
  }

  getSeedKey(): string | null {
    return localStorage.getItem('yo3_seed_key');
  }

  // ===== User Profile =====

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/users/me`);
      return response.data;
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock user data');
      return {
        id: 1,
        username: 'admin',
        email: 'admin@demo.com',
        role: 'ADMIN',
        licenseTier: 'ENTERPRISE',
        storageQuotaGb: 10,
        apiRateLimit: 1000,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
      };
    }
  }

  // ===== Quota Usage =====

  async getQuotaUsage(): Promise<QuotaUsage> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/users/me/quota`);
      return response.data;
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock quota data');
      return {
        cameras: {
          current: 3,
          max: 10,
          percentage: 30
        },
        storage: {
          currentGb: 2.5,
          maxGb: 10,
          percentage: 25
        },
        apiCalls: {
          currentRate: 15,
          maxRate: 100
        }
      };
    }
  }

  // ===== Detection Events =====

  async getDetectionEvents(limit: number = 50, cameraId?: string): Promise<DetectionEvent[]> {
    try {
      const response = await apiClient.get(`${EVENTS_API_URL}/blue-flow/events`, {
        params: { limit, cameraId }
      });
      return response.data;
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock detection events');
      const mockEvents: DetectionEvent[] = [];
      const objectTypes = ['person', 'car', 'dog', 'bicycle'];
      const now = Date.now();
      
      for (let i = 0; i < Math.min(limit, 20); i++) {
        mockEvents.push({
          id: i + 1,
          cameraId: cameraId || 'demo-camera-01',
          timestamp: now - i * 60000,
          objectType: objectTypes[i % objectTypes.length],
          confidence: 0.75 + Math.random() * 0.2,
          boundingBox: {
            x: Math.floor(Math.random() * 400),
            y: Math.floor(Math.random() * 300),
            width: 80 + Math.floor(Math.random() * 40),
            height: 120 + Math.floor(Math.random() * 60)
          }
        });
      }
      return mockEvents;
    }
  }

  // ===== Cameras =====

  async getCameras(): Promise<Camera[]> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/cameras`);
      return response.data;
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock camera data');
      return [
        {
          id: 'camera-entrance-01',
          name: 'Entrance Camera 1',
          location: 'Main Entrance',
          status: 'active' as const,
          lastSeen: Date.now(),
          streamUrl: '/demo-video.mp4',
        },
        {
          id: 'camera-entrance-02',
          name: 'Entrance Camera 2',
          location: 'Side Entrance',
          status: 'active' as const,
          lastSeen: Date.now(),
          streamUrl: '/demo-video.mp4',
        },
        {
          id: 'camera-lobby-01',
          name: 'Lobby Camera',
          location: 'Lobby Area',
          status: 'active' as const,
          lastSeen: Date.now(),
          streamUrl: '/demo-video.mp4',
        },
      ];
    }
  }

  async addCamera(camera: Omit<Camera, 'id'>): Promise<Camera> {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/cameras`, camera);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add camera');
    }
  }

  // ===== Video Streams =====

  async getStreamUrl(storageKey: string): Promise<string> {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/storage/${storageKey}/url`);
      return response.data.url;
    } catch (err) {
      throw new Error('Failed to get stream URL');
    }
  }
}

export const apiService = new ApiService();
export default apiService;
