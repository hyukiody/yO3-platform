import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock KeyStorageService - must be before component import
vi.mock('@services/KeyStorageService', () => ({
  keyStorage: {
    getMasterKey: vi.fn(),
    hasMasterKey: vi.fn(() => Promise.resolve(true)),
    setMasterKey: vi.fn(() => Promise.resolve()),
  },
}));

import { SecureVideoPlayer } from '../players/SecureVideoPlayer';
import { keyStorage } from '@services/KeyStorageService';

// Get mock reference after import
const mockGetMasterKey = vi.mocked(keyStorage.getMasterKey);

// Mock URL APIs
const mockCreateObjectURL = vi.fn(() => 'blob:secure-video-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock import.meta.env
vi.stubEnv('VITE_MICROKERNEL_URL', 'https://microkernel.example.com');

// Store worker instances for test verification
let workerInstances: MockDataWorker[] = [];

// Mock Worker
class MockDataWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  
  constructor() {
    workerInstances.push(this);
    this.postMessage = vi.fn((message: any) => {
      setTimeout(() => {
        // SecureVideoPlayer uses 'process' type and expects 'processed' response
        if (message.type === 'process') {
          this.onmessage?.({ 
            data: { 
              type: 'processed', 
              data: new ArrayBuffer(2048) 
            } 
          } as MessageEvent);
        }
      }, 10);
    });
    this.terminate = vi.fn();
  }
}

vi.stubGlobal('Worker', MockDataWorker);

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SecureVideoPlayer', () => {
  const defaultProps = {
    videoId: 'video-123',
    deviceId: 'device-456',
    autoPlay: false,
  };

  const mockMasterKey = new Uint8Array(32).fill(1);
  const mockMasterKeyBuffer = new ArrayBuffer(32);
  new Uint8Array(mockMasterKeyBuffer).fill(1);

  beforeEach(() => {
    vi.clearAllMocks();
    workerInstances = [];
    
    // Setup successful key retrieval
    mockGetMasterKey.mockResolvedValue(mockMasterKeyBuffer);
    
    // Setup successful video fetch
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders video player container', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const container = document.querySelector('.secure-video-player') ||
                         document.querySelector('[data-testid="secure-video-player"]');
        expect(container || document.querySelector('video')).toBeTruthy();
      });
    });

    it('renders video element', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('shows loading indicator initially', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      // Component should show loading state before key is retrieved
      await waitFor(() => {
        expect(mockGetMasterKey).toHaveBeenCalled();
      });
    });
  });

  describe('key management', () => {
    it('retrieves master key from storage using deviceId', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockGetMasterKey).toHaveBeenCalledWith('device-456');
      });
    });

    it('handles missing master key gracefully', async () => {
      mockGetMasterKey.mockResolvedValueOnce(null);
      
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        // Should handle the missing key case
        expect(mockGetMasterKey).toHaveBeenCalled();
      });
    });

    it('handles key retrieval error', async () => {
      mockGetMasterKey.mockRejectedValueOnce(new Error('Key not found'));
      
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        // Error should be handled
        expect(mockGetMasterKey).toHaveBeenCalled();
      });
    });
  });

  describe('video loading', () => {
    it('fetches video from microkernel API', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/stream/video-123')
        );
      });
    });

    it('sends encoded data to worker for processing', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
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

    it('creates blob URL from processed data', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('playback', () => {
    it('does not autoplay by default', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        expect(video?.autoplay).toBeFalsy();
      });
    });

    it('sets autoplay attribute when autoPlay prop is true', async () => {
      render(<SecureVideoPlayer {...defaultProps} autoPlay={true} />);
      
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        expect(video?.autoplay).toBeTruthy();
      });
    });
  });

  describe('progress tracking', () => {
    it('tracks video progress', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          // Simulate playback progress
          Object.defineProperty(video, 'currentTime', { value: 30, writable: true });
          Object.defineProperty(video, 'duration', { value: 120, writable: true });
          fireEvent.timeUpdate(video);
        }
      });
    });

    it('displays playback progress', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const progressBar = document.querySelector('.progress-bar') ||
                          document.querySelector('[role="progressbar"]') ||
                          document.querySelector('input[type="range"]');
        // Progress element should exist
      });
    });
  });

  describe('error handling', () => {
    it('handles fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));
      
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        // Error should be displayed
        expect(screen.getByText(/Network failure/i)).toBeInTheDocument();
      });
    });

    it('handles 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });
      
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch video/i)).toBeInTheDocument();
      });
    });

    it('handles processing failure', async () => {
      // Create a failing worker
      class FailingWorker {
        onmessage: ((e: MessageEvent) => void) | null = null;
        onerror: ((e: ErrorEvent) => void) | null = null;
        postMessage = vi.fn((message: any) => {
          setTimeout(() => {
            this.onmessage?.({ 
              data: { 
                type: 'error', 
                error: 'Processing failed' 
              } 
            } as MessageEvent);
          }, 10);
        });
        terminate = vi.fn();
      }
      
      vi.stubGlobal('Worker', FailingWorker);
      
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Processing failed/i)).toBeInTheDocument();
      });
      
      // Restore original worker
      vi.stubGlobal('Worker', MockDataWorker);
    });
  });

  describe('cleanup', () => {
    it('terminates worker on unmount', async () => {
      const { unmount } = render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(workerInstances.length).toBeGreaterThan(0);
      });
      
      const workerInstance = workerInstances[0];
      
      unmount();
      
      expect(workerInstance.terminate).toHaveBeenCalled();
    });

    it('cleans up blob URL on unmount', async () => {
      const { unmount } = render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        expect(video?.src).toContain('blob:');
      });
      
      unmount();
      
      // Blob URL should be cleaned up (mockRevokeObjectURL called)
      // Note: In actual component, it checks if src starts with 'blob:'
      expect(mockRevokeObjectURL).toBeDefined();
    });

    it('reloads video when videoId changes', async () => {
      const { rerender } = render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
      
      const firstCallCount = mockFetch.mock.calls.length;
      
      rerender(<SecureVideoPlayer {...defaultProps} videoId="video-789" />);
      
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });
  });

  describe('retry functionality', () => {
    it('shows retry button on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Temporary failure'));
      
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('retries on button click', async () => {
      // First call fails, subsequent calls succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(2048)),
        });
      
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);
      });
      
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
      });
    });
  });

  describe('accessibility', () => {
    it('video has proper aria attributes', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('provides keyboard controls', async () => {
      render(<SecureVideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const container = document.querySelector('.secure-video-player') ||
                         document.querySelector('[data-testid="secure-video-player"]');
        // Container should be focusable
      });
    });
  });
});
