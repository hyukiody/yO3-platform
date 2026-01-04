// API Service for yo3 Platform
import type { AuthenticationRequest, AuthenticationResponse, User, DetectionEvent, Camera, QuotaUsage } from '../types';

// Use relative paths to leverage Vite proxy configuration
const API_BASE_URL = '/api/auth';
const STREAM_API_URL = '/api/video';
const EVENTS_API_URL = '/api/events';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('yo3_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  // ===== Authentication =====

  async login(credentials: AuthenticationRequest): Promise<AuthenticationResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store token and seed key
    localStorage.setItem('yo3_token', data.accessToken);
    if (credentials.seedKey) {
      localStorage.setItem('yo3_seed_key', credentials.seedKey);
    }

    return data;
  }

  async register(credentials: AuthenticationRequest): Promise<AuthenticationResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    
    localStorage.setItem('yo3_token', data.accessToken);
    if (credentials.seedKey) {
      localStorage.setItem('yo3_seed_key', credentials.seedKey);
    }

    return data;
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
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      return response.json();
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock user data');
      return {
        id: 'demo-user-001',
        username: 'admin',
        email: 'admin@demo.com',
        licenseType: 'ENTERPRISE',
        storageQuota: 10000000000,
        cameraLimit: 10,
      };
    }
  }

  // ===== Quota Usage =====

  async getQuotaUsage(): Promise<QuotaUsage> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/quota`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quota usage');
      }

      return response.json();
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
        },
        eventsThisMonth: 1250
      };
    }
  }

  // ===== Detection Events =====

  async getDetectionEvents(limit: number = 50, cameraId?: string): Promise<DetectionEvent[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (cameraId) params.append('cameraId', cameraId);

      const response = await fetch(`${EVENTS_API_URL}/blue-flow/events?${params}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch detection events');
      }

      return response.json();
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock detection events');
      const mockEvents: DetectionEvent[] = [];
      const objectTypes = ['person', 'car', 'dog', 'bicycle'];
      const now = Date.now();
      
      for (let i = 0; i < Math.min(limit, 20); i++) {
        mockEvents.push({
          id: `demo-event-${i}`,
          cameraId: cameraId || 'demo-camera-01',
          timestamp: now - i * 60000,
          objectType: objectTypes[i % objectTypes.length],
          confidence: 0.75 + Math.random() * 0.2,
          zone: 'entrance',
        });
      }
      return mockEvents;
    }
  }

  // ===== Cameras =====

  async getCameras(): Promise<Camera[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/cameras`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cameras');
      }

      return response.json();
    } catch (err) {
      console.warn('🎯 DEMO MODE: Using mock camera data');
      return [
        {
          id: 'camera-entrance-01',
          name: 'Entrance Camera 1',
          location: 'Main Entrance',
          status: 'online',
          streamUrl: '/demo-video.mp4',
        },
        {
          id: 'camera-entrance-02',
          name: 'Entrance Camera 2',
          location: 'Side Entrance',
          status: 'online',
          streamUrl: '/demo-video.mp4',
        },
        {
          id: 'camera-lobby-01',
          name: 'Lobby Camera',
          location: 'Lobby Area',
          status: 'online',
          streamUrl: '/demo-video.mp4',
        },
      ];
    }
  }

  async addCamera(camera: Omit<Camera, 'id'>): Promise<Camera> {
    const response = await fetch(`${API_BASE_URL}/cameras`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(camera),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add camera');
    }

    return response.json();
  }

  // ===== Video Streams =====

  async getStreamUrl(storageKey: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/storage/${storageKey}/url`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get stream URL');
    }

    const data = await response.json();
    return data.url;
  }
}

export const apiService = new ApiService();
export default apiService;
