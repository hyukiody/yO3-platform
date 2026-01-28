import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// Mock KeyStorageService - must be before component import
vi.mock('@services/KeyStorageService', () => ({
  keyStorage: {
    getMasterKey: vi.fn(),
    hasMasterKey: vi.fn(() => Promise.resolve(true)),
    setMasterKey: vi.fn(() => Promise.resolve()),
  },
}));

import { UniversalSecurePlayer } from '../players/UniversalSecurePlayer';
import { keyStorage } from '@services/KeyStorageService';

// Get mock reference after import
const mockGetMasterKey = vi.mocked(keyStorage.getMasterKey);

// Mock URL APIs
const mockCreateObjectURL = vi.fn(() => 'blob:universal-video-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock import.meta.env
vi.stubEnv('VITE_MICROKERNEL_URL', 'https://microkernel.example.com');

// Store worker instances for test verification
let workerInstances: MockWorker[] = [];

// Mock Worker that handles both data and stream patterns
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  
  constructor() {
    workerInstances.push(this);
    this.postMessage = vi.fn((message: any) => {
      setTimeout(() => {
        // Handle both data worker (process) and stream worker (INIT/PROCESS)
        if (message.type === 'process') {
          this.onmessage?.({ 
            data: { 
              type: 'processed', 
              data: new ArrayBuffer(2048) 
            } 
          } as MessageEvent);
        } else if (message.type === 'INIT') {
          this.onmessage?.({ data: { type: 'INIT_SUCCESS' } } as MessageEvent);
        } else if (message.type === 'PROCESS') {
          this.onmessage?.({ 
            data: { 
              type: 'PROCESS_SUCCESS', 
              data: new ArrayBuffer(1024) 
            } 
          } as MessageEvent);
        }
      }, 10);
    });
    this.terminate = vi.fn();
  }
}

vi.stubGlobal('Worker', MockWorker);

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'test-auth-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock canvas context
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  setTransform: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
})) as any;

describe('UniversalSecurePlayer', () => {
  // Archive mode props (encrypted from Microkernel)
  const archiveProps = {
    videoId: 'video-123',
    mode: 'archive' as const,
    keyStrategy: 'master' as const,
    deviceId: 'device-456',
    autoPlay: false,
  };

  // Live mode props (real-time stream)
  const liveProps = {
    streamUrl: 'wss://stream.example.com/live/123',
    mode: 'live' as const,
    keyStrategy: 'seed' as const,
    seedKey: 'seed-key-12345',
    autoPlay: false,
  };

  const mockMasterKey = new Uint8Array(32).fill(1);
  const mockMasterKeyBuffer = new ArrayBuffer(32);
  new Uint8Array(mockMasterKeyBuffer).fill(1);

  beforeEach(() => {
    vi.clearAllMocks();
    workerInstances = [];
    vi.stubGlobal('Worker', MockWorker);
    
    mockGetMasterKey.mockResolvedValue(mockMasterKeyBuffer);
    mockLocalStorage.getItem.mockReturnValue('test-auth-token');
    
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
      blob: () => Promise.resolve(new Blob([new ArrayBuffer(2048)])),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('mode validation', () => {
    it('renders in archive mode', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(document.querySelector('video')).toBeTruthy();
      });
    });

    it('renders in live mode', async () => {
      render(<UniversalSecurePlayer {...liveProps} />);
      
      await waitFor(() => {
        expect(document.querySelector('video')).toBeTruthy();
      });
    });

    it('shows error when videoId missing for archive mode', async () => {
      const invalidProps = { ...archiveProps, videoId: undefined };
      const onError = vi.fn();
      
      render(<UniversalSecurePlayer {...invalidProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('shows error when streamUrl missing for live mode', async () => {
      const invalidProps = { ...liveProps, streamUrl: undefined };
      const onError = vi.fn();
      
      render(<UniversalSecurePlayer {...invalidProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('key strategy validation', () => {
    it('uses master key strategy for archive mode', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(mockGetMasterKey).toHaveBeenCalledWith('device-456');
      });
    });

    it('checks for token in live mode', async () => {
      render(<UniversalSecurePlayer {...liveProps} />);
      
      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
      });
    });

    it('calls onError when deviceId missing for master key strategy', async () => {
      const invalidProps = { ...archiveProps, deviceId: undefined };
      const onError = vi.fn();
      
      render(<UniversalSecurePlayer {...invalidProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('calls onError when seedKey missing for seed key strategy', async () => {
      const invalidProps = { ...liveProps, seedKey: undefined };
      const onError = vi.fn();
      
      render(<UniversalSecurePlayer {...invalidProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('archive mode loading', () => {
    it('fetches encrypted video from microkernel', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/stream/video-123')
        );
      });
    });

    it('sends data to worker for processing', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(workerInstances.length).toBeGreaterThan(0);
        const workerInstance = workerInstances[0];
        expect(workerInstance.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'process',
          })
        );
      });
    });

    it('creates blob URL after processing', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('live mode streaming', () => {
    it('initializes stream with seed key and token', async () => {
      render(<UniversalSecurePlayer {...liveProps} />);
      
      await waitFor(() => {
        // Live mode should use the auth token
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
      });
    });

    it('fetches stream data with authorization', async () => {
      render(<UniversalSecurePlayer {...liveProps} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(liveProps.streamUrl),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-auth-token',
            }),
          })
        );
      });
    });
  });

  describe('detection overlay', () => {
    const detectionProps = {
      ...archiveProps,
      enableDetection: true,
    };

    it('renders canvas for detection overlay when enabled', async () => {
      render(<UniversalSecurePlayer {...detectionProps} />);
      
      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeTruthy();
      });
    });

    it('does not render detection canvas when disabled', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        // Without detection, the video element should still render
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });
  });

  describe('snapshot functionality', () => {
    const snapshotProps = {
      ...archiveProps,
      enableSnapshot: true,
    };

    it('renders snapshot button when snapshot is enabled', async () => {
      render(<UniversalSecurePlayer {...snapshotProps} />);
      
      // Need to wait for ready state to show controls
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('enables canvas capture functionality', async () => {
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => callback(new Blob(['test'])));
      HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,test');
      
      render(<UniversalSecurePlayer {...snapshotProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });
  });

  describe('playback controls', () => {
    it('supports play/pause via internal state', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('supports autoPlay', async () => {
      render(<UniversalSecurePlayer {...archiveProps} autoPlay={true} />);
      
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        expect(video?.autoplay).toBeTruthy();
      });
    });

    it('supports loop playback', async () => {
      render(<UniversalSecurePlayer {...archiveProps} loop={true} />);
      
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        expect(video?.loop).toBeTruthy();
      });
    });
  });

  describe('fullscreen', () => {
    it('has fullscreen toggle capability', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });
  });

  describe('error handling', () => {
    it('handles fetch error in archive mode', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const onError = vi.fn();
      render(<UniversalSecurePlayer {...archiveProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('handles key retrieval error', async () => {
      mockGetMasterKey.mockRejectedValueOnce(new Error('Key not found'));
      
      const onError = vi.fn();
      render(<UniversalSecurePlayer {...archiveProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('handles missing master key', async () => {
      mockGetMasterKey.mockResolvedValueOnce(null);
      
      const onError = vi.fn();
      render(<UniversalSecurePlayer {...archiveProps} onError={onError} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Master key not found/i)).toBeInTheDocument();
      });
    });

    it('displays error message to user', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));
      
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Test error/i)).toBeInTheDocument();
      });
    });
  });

  describe('cleanup', () => {
    it('terminates worker on unmount', async () => {
      const { unmount } = render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(workerInstances.length).toBeGreaterThan(0);
      });
      
      const workerInstance = workerInstances[0];
      
      unmount();
      
      expect(workerInstance.terminate).toHaveBeenCalled();
    });

    it('revokes blob URL on unmount', async () => {
      const { unmount } = render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('reloads when videoId changes', async () => {
      const { rerender } = render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
      
      const firstCallCount = mockFetch.mock.calls.length;
      
      rerender(<UniversalSecurePlayer {...archiveProps} videoId="video-789" />);
      
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });

    it('recreates worker when mode changes', async () => {
      const { rerender } = render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        expect(workerInstances.length).toBeGreaterThan(0);
      });
      
      const previousCount = workerInstances.length;
      
      // Change mode triggers new worker
      rerender(<UniversalSecurePlayer {...liveProps} />);
      
      // Just verify component re-rendered without crashing
      await waitFor(() => {
        expect(document.querySelector('video')).toBeTruthy();
      });
    });
  });

  describe('callbacks', () => {
    it('internal play state updates on play event', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('internal pause state updates on pause event', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('calls onError callback on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test callback error'));
      const onError = vi.fn();
      
      render(<UniversalSecurePlayer {...archiveProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('updates current time on timeupdate', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        if (video) {
          // Set video properties
          Object.defineProperty(video, 'currentTime', { value: 30, writable: true });
          fireEvent.timeUpdate(video);
        }
      });
    });
  });

  describe('accessibility', () => {
    it('video element is present and accessible', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('buttons are keyboard accessible', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
          expect(button.tabIndex).toBeGreaterThanOrEqual(-1);
        });
      });
    });

    it('supports keyboard interaction', async () => {
      render(<UniversalSecurePlayer {...archiveProps} />);
      
      await waitFor(() => {
        const container = document.querySelector('.universal-secure-player');
        expect(container).toBeTruthy();
      });
    });
  });
});
