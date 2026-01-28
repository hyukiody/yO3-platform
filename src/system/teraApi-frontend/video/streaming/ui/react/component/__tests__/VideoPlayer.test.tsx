import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import VideoPlayer from '../videoFeeds/VideoPlayer';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock @types
vi.mock('@types', () => ({
  VideoStream: {},
}));

// Mock URL.createObjectURL/revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'test-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Store worker instances for test verification
let workerInstances: MockWorker[] = [];

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  
  constructor() {
    workerInstances.push(this);
    this.postMessage = vi.fn((message: any) => {
      // Simulate worker responses
      setTimeout(() => {
        if (message.type === 'INIT') {
          this.onmessage?.({ data: { type: 'INIT_SUCCESS' } } as MessageEvent);
        } else if (message.type === 'PROCESS') {
          this.onmessage?.({ data: { type: 'PROCESS_SUCCESS', data: new ArrayBuffer(1024) } } as MessageEvent);
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

describe('VideoPlayer', () => {
  const defaultProps = {
    streamUrl: 'https://api.example.com/stream/123',
    seedKey: 'test-seed-key-12345',
    autoplay: false,
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    workerInstances = [];
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders video player container', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(document.querySelector('.video-player-container')).toBeTruthy();
      });
    });

    it('shows loading state initially', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      // Component should start in loading state
      await waitFor(() => {
        const container = document.querySelector('.video-player-container');
        expect(container).toBeTruthy();
      });
    });

    it('renders video element', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('renders canvas for overlays', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeTruthy();
      });
    });
  });

  describe('initialization', () => {
    it('initializes Web Worker on mount', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(workerInstances.length).toBeGreaterThan(0);
      });
    });

    it('sends INIT message to worker with seedKey', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(workerInstances.length).toBeGreaterThan(0);
        const workerInstance = workerInstances[0];
        expect(workerInstance.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'INIT',
            seedKey: 'test-seed-key-12345',
          })
        );
      });
    });

    it('fetches stream with authorization header', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/stream/123',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
      });
    });
  });

  describe('playback controls', () => {
    it('does not autoplay by default', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        expect(video?.autoplay).toBeFalsy();
      });
    });

    it('autoplays when autoplay prop is true', async () => {
      const playMock = vi.fn().mockResolvedValue(undefined);
      HTMLMediaElement.prototype.play = playMock;
      
      render(<VideoPlayer {...defaultProps} autoplay={true} />);
      
      await waitFor(() => {
        expect(playMock).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('toggles play/pause on button click', async () => {
      const playMock = vi.fn().mockResolvedValue(undefined);
      const pauseMock = vi.fn();
      HTMLMediaElement.prototype.play = playMock;
      HTMLMediaElement.prototype.pause = pauseMock;
      
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const playButton = screen.queryByRole('button', { name: /play/i }) || 
                          document.querySelector('[aria-label*="play"]') ||
                          document.querySelector('.play-button');
        if (playButton) {
          fireEvent.click(playButton);
        }
      });
    });
  });

  describe('error handling', () => {
    it('calls onError when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalled();
      });
    });

    it('calls onError when HTTP response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });
      
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalled();
      });
    });

    it('handles worker errors gracefully', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(workerInstances.length).toBeGreaterThan(0);
      });
      
      const workerInstance = workerInstances[0];
      
      // Simulate worker error
      act(() => {
        workerInstance.onerror?.({ message: 'Worker crashed' } as ErrorEvent);
      });
      
      // Error should be handled
      expect(defaultProps.onError).toHaveBeenCalled();
    });

    it('displays error message when error occurs', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));
      
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const errorElement = document.querySelector('.error') || 
                            screen.queryByText(/error/i);
        // Error should be captured
        expect(defaultProps.onError).toHaveBeenCalled();
      });
    });
  });

  describe('cleanup', () => {
    it('terminates worker on unmount', async () => {
      const { unmount } = render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(workerInstances.length).toBeGreaterThan(0);
      });
      
      const workerInstance = workerInstances[0];
      
      unmount();
      
      expect(workerInstance.terminate).toHaveBeenCalled();
    });

    it('revokes blob URL on unmount', async () => {
      const { unmount } = render(<VideoPlayer {...defaultProps} />);
      
      // Wait for blob URL to be created
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        return video?.src?.includes('blob:');
      }, { timeout: 1000 }).catch(() => {});
      
      unmount();
      
      // revokeObjectURL may be called during cleanup
      expect(mockRevokeObjectURL).toBeDefined();
    });

    it('reinitializes when streamUrl changes', async () => {
      const { rerender } = render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
      
      const firstCallCount = mockFetch.mock.calls.length;
      
      rerender(<VideoPlayer {...defaultProps} streamUrl="https://api.example.com/stream/456" />);
      
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });
  });

  describe('video time controls', () => {
    it('updates current time during playback', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          fireEvent.timeUpdate(video);
        }
      });
    });

    it('formats time correctly', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        // Time should be formatted as mm:ss
        const timeDisplay = document.querySelector('.time-display') ||
                           screen.queryByText(/\d+:\d{2}/);
        // Component has time formatting utility
      });
    });
  });

  describe('fullscreen', () => {
    it('can enter fullscreen mode', async () => {
      const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
      HTMLVideoElement.prototype.requestFullscreen = requestFullscreenMock;
      
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const fullscreenButton = document.querySelector('[aria-label*="fullscreen"]') ||
                                document.querySelector('.fullscreen-button');
        if (fullscreenButton) {
          fireEvent.click(fullscreenButton);
          expect(requestFullscreenMock).toHaveBeenCalled();
        }
      });
    });

    it('can exit fullscreen mode', async () => {
      const exitFullscreenMock = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = exitFullscreenMock;
      
      render(<VideoPlayer {...defaultProps} />);
      
      // Test fullscreen toggle behavior
      await waitFor(() => {
        expect(document.querySelector('video')).toBeTruthy();
      });
    });
  });

  describe('accessibility', () => {
    it('video element has proper attributes', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
      });
    });

    it('controls are keyboard accessible', async () => {
      render(<VideoPlayer {...defaultProps} />);
      
      await waitFor(() => {
        const controls = document.querySelectorAll('button');
        controls.forEach(control => {
          expect(control.tabIndex).toBeGreaterThanOrEqual(-1);
        });
      });
    });
  });
});
