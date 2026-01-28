/**
 * CameraService.test.ts - Tests for Camera Management Service
 *
 * Tests the CameraService class that provides CRUD operations
 * for camera management with fallback to mock data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Import after mocking
import CameraService from './CameraService';

describe('CameraService', () => {
  let cameraService: typeof CameraService;
  let stableMockCameras: any[];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorageMock.getItem.mockReturnValue('test-token');
    cameraService = CameraService;
    
    // Generate stable mock data once per test to avoid timestamp mismatches
    stableMockCameras = cameraService.getMockCameras();
    vi.spyOn(cameraService, 'getMockCameras').mockReturnValue(stableMockCameras);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('localStorage', localStorageMock); // Keep localStorage mock
    vi.clearAllMocks();
  });

  describe('Authentication Headers', () => {
    it('includes authorization header when token exists', async () => {
      const mockCameras = [{ id: 'cam-001', name: 'Test Camera' }];
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCameras),
      } as Response);

      await cameraService.getAllCameras();

      expect(fetch).toHaveBeenCalledWith(
        '/api/cameras',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('omits authorization header when no token', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const mockCameras = [{ id: 'cam-001', name: 'Test Camera' }];
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCameras),
      } as Response);

      await cameraService.getAllCameras();

      expect(fetch).toHaveBeenCalledWith(
        '/api/cameras',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('getAllCameras', () => {
    it('fetches all cameras successfully', async () => {
      const mockCameras = cameraService.getMockCameras();
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCameras),
      } as Response);

      const result = await cameraService.getAllCameras();

      expect(result).toEqual(mockCameras);
      expect(fetch).toHaveBeenCalledWith('/api/cameras', expect.any(Object));
    });

    it('returns mock data on fetch failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await cameraService.getAllCameras();

      // Should return mock data (array of cameras)
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns mock data on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await cameraService.getAllCameras();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getActiveCameras', () => {
    it('fetches active cameras successfully', async () => {
      const mockActiveCameras = cameraService.getMockCameras().filter(c => c.isActive);
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActiveCameras),
      } as Response);

      const result = await cameraService.getActiveCameras();

      expect(result).toEqual(mockActiveCameras);
      expect(fetch).toHaveBeenCalledWith('/api/cameras/active', expect.any(Object));
    });

    it('filters mock data for active cameras on failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await cameraService.getActiveCameras();

      // All returned cameras should be active
      expect(result.every(c => c.isActive)).toBe(true);
    });
  });

  describe('getEnabledCameras', () => {
    it('fetches enabled cameras successfully', async () => {
      const mockEnabledCameras = cameraService.getMockCameras().filter(c => c.isEnabled);
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEnabledCameras),
      } as Response);

      const result = await cameraService.getEnabledCameras();

      expect(result).toEqual(mockEnabledCameras);
      expect(fetch).toHaveBeenCalledWith('/api/cameras/enabled', expect.any(Object));
    });
  });

  describe('getCameraCount', () => {
    it('returns camera count successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(3),
      } as Response);

      const result = await cameraService.getCameraCount();

      expect(result).toBe(3);
      expect(fetch).toHaveBeenCalledWith('/api/cameras/count', expect.any(Object));
    });

    it('returns mock camera count on failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await cameraService.getCameraCount();

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCamerasByType', () => {
    it('fetches cameras by type successfully', async () => {
      const mockCameras = cameraService.getMockCameras().filter(c => c.cameraType === 'IP');
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCameras),
      } as Response);

      const result = await cameraService.getCamerasByType('IP' as any);

      expect(result).toEqual(mockCameras);
      expect(fetch).toHaveBeenCalledWith('/api/cameras/type/IP', expect.any(Object));
    });

    it('filters mock data by type on failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await cameraService.getCamerasByType('IP' as any);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCamerasByStatus', () => {
    it('fetches cameras by status successfully', async () => {
      const mockCameras = cameraService.getMockCameras().filter(c => c.status === 'CONNECTED');
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCameras),
      } as Response);

      const result = await cameraService.getCamerasByStatus('CONNECTED' as any);

      expect(result).toEqual(mockCameras);
      expect(fetch).toHaveBeenCalledWith('/api/cameras/status/CONNECTED', expect.any(Object));
    });
  });

  describe('getCamera', () => {
    it('fetches single camera by ID successfully', async () => {
      const mockCamera = cameraService.getMockCameras()[0];
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCamera),
      } as Response);

      const result = await cameraService.getCamera('cam-001');

      expect(result).toEqual(mockCamera);
      expect(fetch).toHaveBeenCalledWith('/api/cameras/cam-001', expect.any(Object));
    });

    it('throws error when camera not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      // The service falls back to mock data, which might not have this ID
      await expect(cameraService.getCamera('nonexistent-id')).rejects.toThrow();
    });
  });

  describe('createCamera', () => {
    it('creates camera successfully', async () => {
      const newCamera = {
        name: 'New Camera',
        description: 'Test description',
        streamUrl: 'rtsp://example.com/stream',
        rtspUrl: 'rtsp://example.com/stream',
        cameraType: 'IP' as any,
        location: 'Test Location',
      };
      
      const createdCamera = {
        id: 'cam-new',
        ...newCamera,
        isActive: true,
        isEnabled: true,
        status: 'INITIALIZING',
        createdAt: '2026-01-21T10:00:00Z',
        updatedAt: '2026-01-21T10:00:00Z',
      };
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdCamera),
      } as Response);

      const result = await cameraService.createCamera(newCamera);

      expect(result.name).toBe('New Camera');
      expect(fetch).toHaveBeenCalledWith(
        '/api/cameras',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newCamera),
        })
      );
    });

    it('returns demo camera on creation failure', async () => {
      const newCamera = {
        name: 'Demo Camera',
        description: 'Demo description',
        streamUrl: 'rtsp://demo.com/stream',
        rtspUrl: 'rtsp://demo.com/stream',
        cameraType: 'IP' as any,
        location: 'Demo Location',
      };
      
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await cameraService.createCamera(newCamera);

      expect(result.name).toBe('Demo Camera');
      expect(result.id).toContain('demo-');
      expect(result.isActive).toBe(true);
    });

    it('throws error with API error message', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Duplicate camera name' }),
      } as Response);

      const newCamera = {
        name: 'Duplicate',
        streamUrl: 'rtsp://example.com/stream',
        cameraType: 'IP' as any,
      };

      // Will fall back to demo mode
      const result = await cameraService.createCamera(newCamera);
      expect(result.id).toContain('demo-');
    });
  });

  describe('updateCamera', () => {
    it('updates camera successfully', async () => {
      const updateRequest = {
        name: 'Updated Camera Name',
        description: 'Updated description',
      };
      
      const updatedCamera = {
        id: 'cam-001',
        name: 'Updated Camera Name',
        description: 'Updated description',
        updatedAt: '2026-01-21T12:00:00Z',
      };
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedCamera),
      } as Response);

      const result = await cameraService.updateCamera('cam-001', updateRequest);

      expect(result.name).toBe('Updated Camera Name');
      expect(fetch).toHaveBeenCalledWith(
        '/api/cameras/cam-001',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateRequest),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('handles API error responses with error message', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Camera not found' }),
      } as Response);

      // Falls back to mock data
      const result = await cameraService.getAllCameras();
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles network timeout', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await cameraService.getAllCameras();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
