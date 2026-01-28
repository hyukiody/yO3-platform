import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { VideoFeedPlayer } from '../VideoFeedPlayer';
import detectionEventService from '@services/DetectionEventService';

// Mock DetectionEventService
vi.mock('@services/DetectionEventService', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    onError: vi.fn(),
    offError: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockObjectURL = 'blob:http://localhost/mock-video-url';
global.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectURL);
global.URL.revokeObjectURL = vi.fn();

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock canvas context
const mockCanvasContext = {
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
};

describe('VideoFeedPlayer Component', () => {
  const mockDetectionService = vi.mocked(detectionEventService);
  
  const defaultProps = {
    streamUrl: 'http://localhost:8082/api/stream/camera-1',
    title: 'Test Camera Feed',
    cameraId: 'camera-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    localStorageMock.getItem.mockReturnValue('mock-jwt-token');
    
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['mock-video'], { type: 'video/mp4' })),
    });

    // Mock canvas getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCanvasContext);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial Rendering', () => {
    it('renders video feed container', () => {
      render(<VideoFeedPlayer {...defaultProps} />);
      expect(screen.getByText('Test Camera Feed')).toBeInTheDocument();
    });

    it('renders camera ID', () => {
      render(<VideoFeedPlayer {...defaultProps} />);
      expect(screen.getByText('camera-1')).toBeInTheDocument();
    });

    it('renders with default title when not provided', () => {
      const { streamUrl, cameraId } = defaultProps;
      render(<VideoFeedPlayer streamUrl={streamUrl} cameraId={cameraId} />);
      expect(screen.getByText('Live Video Feed')).toBeInTheDocument();
    });

    it('renders video element', () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('renders loading overlay initially', () => {
      render(<VideoFeedPlayer {...defaultProps} />);
      expect(screen.getByText('Loading video...')).toBeInTheDocument();
    });

    it('renders looping badge when loop is enabled', () => {
      render(<VideoFeedPlayer {...defaultProps} loop={true} />);
      expect(screen.getByText(/LOOPING/)).toBeInTheDocument();
    });

    it('does not render looping badge when loop is disabled', () => {
      render(<VideoFeedPlayer {...defaultProps} loop={false} />);
      expect(screen.queryByText(/LOOPING/)).not.toBeInTheDocument();
    });
  });

  describe('Video Controls', () => {
    it('renders play/pause button', () => {
      render(<VideoFeedPlayer {...defaultProps} />);
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('renders fullscreen button', () => {
      render(<VideoFeedPlayer {...defaultProps} />);
      expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
    });

    it('renders video progress slider', () => {
      render(<VideoFeedPlayer {...defaultProps} />);
      expect(screen.getByRole('slider', { name: /video progress/i })).toBeInTheDocument();
    });

    it('renders time display showing 0:00 initially', () => {
      render(<VideoFeedPlayer {...defaultProps} />);
      expect(screen.getByText(/0:00/)).toBeInTheDocument();
    });
  });

  describe('Detection Mode', () => {
    it('renders detection canvas when enableDetection is true', () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('canvas has accessible label', () => {
      render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      expect(screen.getByLabelText('Object detection overlay')).toBeInTheDocument();
    });

    it('does not render detection canvas when enableDetection is false', () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} enableDetection={false} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).not.toBeInTheDocument();
    });

    it('subscribes to detection events when video plays', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      expect(mockDetectionService.subscribe).toHaveBeenCalledWith(
        'video-feed-camera-1',
        expect.any(Function)
      );
    });

    it('connects to detection service with camera ID and confidence threshold', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      expect(mockDetectionService.connect).toHaveBeenCalledWith({
        cameraId: 'camera-1',
        minConfidence: 0.65,
        videoElement: expect.any(HTMLVideoElement),
      });
    });

    it('disconnects detection service when component unmounts', async () => {
      const { container, unmount } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      unmount();

      expect(mockDetectionService.disconnect).toHaveBeenCalled();
    });

    it('unsubscribes from detection events on unmount', async () => {
      const { container, unmount } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      unmount();

      expect(mockDetectionService.unsubscribe).toHaveBeenCalledWith('video-feed-camera-1');
    });
  });

  describe('Play/Pause Functionality', () => {
    it('shows pause icon when playing', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('shows play icon when paused', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
        fireEvent.pause(video);
      });

      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('shows LIVE badge when playing', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      expect(screen.getByText(/LIVE/)).toBeInTheDocument();
    });

    it('hides LIVE badge when paused', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
        fireEvent.pause(video);
      });

      expect(screen.queryByText(/LIVE/)).not.toBeInTheDocument();
    });
  });

  describe('Video Events', () => {
    it('updates loading state on canplay event', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.canPlay(video);
      });

      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument();
    });

    it('handles loadstart event', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.loadStart(video);
      });

      expect(screen.getByText('Loading video...')).toBeInTheDocument();
    });
  });

  describe('Time Display', () => {
    it('updates time on timeupdate event', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')! as HTMLVideoElement;
      
      // Simulate time update by dispatching the event
      Object.defineProperty(video, 'currentTime', { value: 65, writable: true, configurable: true });
      
      await act(async () => {
        fireEvent.timeUpdate(video);
      });

      // Time formatting: 65 seconds = 1:05
      expect(screen.getByText(/1:05/)).toBeInTheDocument();
    });

    it('formats time with padded seconds', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')! as HTMLVideoElement;
      
      Object.defineProperty(video, 'currentTime', { value: 63, writable: true, configurable: true });
      
      await act(async () => {
        fireEvent.timeUpdate(video);
      });

      expect(screen.getByText(/1:03/)).toBeInTheDocument();
    });
  });

  describe('ML Badge Display', () => {
    it('shows ML badge when detection is enabled and playing', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      expect(screen.getByText(/ML:/)).toBeInTheDocument();
    });

    it('hides ML badge when detection is disabled', () => {
      render(<VideoFeedPlayer {...defaultProps} enableDetection={false} />);
      expect(screen.queryByText(/ML:/)).not.toBeInTheDocument();
    });

    it('hides ML badge when video is paused', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
        fireEvent.pause(video);
      });

      expect(screen.queryByText(/ML:/)).not.toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('removes video event listeners on unmount', () => {
      const { container, unmount } = render(<VideoFeedPlayer {...defaultProps} />);
      
      const video = container.querySelector('video')!;
      const removeEventListenerSpy = vi.spyOn(video, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('disconnects detection service on unmount', () => {
      const { unmount } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      unmount();

      expect(mockDetectionService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Props Defaults', () => {
    it('uses default loop=true and shows badge', () => {
      render(<VideoFeedPlayer streamUrl={defaultProps.streamUrl} />);
      expect(screen.getByText(/LOOPING/)).toBeInTheDocument();
    });

    it('uses default enableDetection=true and shows canvas', () => {
      const { container } = render(<VideoFeedPlayer streamUrl={defaultProps.streamUrl} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('uses default cameraId=camera-1', () => {
      render(<VideoFeedPlayer streamUrl={defaultProps.streamUrl} />);
      expect(screen.getByText('camera-1')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('registers error handler on detection service', async () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      expect(mockDetectionService.onError).toHaveBeenCalled();
    });

    it('removes error handler on unmount', async () => {
      const { container, unmount } = render(<VideoFeedPlayer {...defaultProps} enableDetection={true} />);
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      unmount();

      expect(mockDetectionService.offError).toHaveBeenCalled();
    });
  });

  describe('Custom Camera ID', () => {
    it('uses custom camera ID for detection subscription', async () => {
      const { container } = render(
        <VideoFeedPlayer {...defaultProps} cameraId="custom-camera-42" enableDetection={true} />
      );
      
      const video = container.querySelector('video')!;
      
      await act(async () => {
        fireEvent.play(video);
      });

      expect(mockDetectionService.subscribe).toHaveBeenCalledWith(
        'video-feed-custom-camera-42',
        expect.any(Function)
      );
    });

    it('renders custom camera ID in header', () => {
      render(<VideoFeedPlayer {...defaultProps} cameraId="main-entrance" />);
      expect(screen.getByText('main-entrance')).toBeInTheDocument();
    });
  });

  describe('Video Source Loading', () => {
    it('sets crossOrigin attribute to anonymous', () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      const video = container.querySelector('video');
      expect(video?.crossOrigin).toBe('anonymous');
    });

    it('sets playsInline attribute', () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      const video = container.querySelector('video');
      expect(video?.playsInline).toBe(true);
    });

    it('disables native controls', () => {
      const { container } = render(<VideoFeedPlayer {...defaultProps} />);
      const video = container.querySelector('video');
      expect(video?.controls).toBe(false);
    });
  });
});
