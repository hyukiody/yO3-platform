/**
 * CameraManager.test.tsx - Tests for Camera Management Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CameraManager from '@device/management/ui/react/component/cameraControls/CameraManager';
import { cameraService } from '@services/CameraService';

// Mock the module - vi.mock is hoisted
vi.mock('@services/CameraService', () => {
  const mockCameras = [
    {
      id: 'cam-001',
      name: 'Front Entrance',
      description: 'Main entrance camera',
      location: 'Building A - Main Lobby',
      streamUrl: 'http://192.168.1.100/stream',
      rtspUrl: 'rtsp://192.168.1.100:554/stream1',
      cameraType: 'IP' as const,
      isActive: true,
      isEnabled: true,
      port: 554,
      fps: 30,
      resolution: '1920x1080',
      codec: 'H.264',
      bitrateKbps: 2500,
      status: 'CONNECTED' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      metadata: {},
    },
    {
      id: 'cam-002',
      name: 'Parking Lot',
      description: 'Exterior parking camera',
      location: 'Building A - Exterior',
      streamUrl: 'http://192.168.1.101/stream',
      rtspUrl: 'rtsp://192.168.1.101:554/stream1',
      cameraType: 'IP' as const,
      isActive: false,
      isEnabled: true,
      port: 554,
      fps: 15,
      resolution: '2560x1440',
      codec: 'H.265',
      bitrateKbps: 4000,
      status: 'DISCONNECTED' as const,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-16T14:20:00Z',
      metadata: {},
    },
    {
      id: 'cam-003',
      name: 'Server Room',
      description: 'Server room monitoring',
      location: 'Building B - Floor 2',
      streamUrl: 'http://192.168.1.102/stream',
      cameraType: 'ONVIF' as const,
      isActive: true,
      isEnabled: false,
      port: 80,
      fps: 10,
      resolution: '1280x720',
      codec: 'H.264',
      bitrateKbps: 1500,
      status: 'ERROR' as const,
      errorMessage: 'Connection timeout',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-17T09:15:00Z',
      metadata: {},
    },
  ];

  return {
    cameraService: {
      getAllCameras: vi.fn().mockResolvedValue(mockCameras),
      createCamera: vi.fn().mockResolvedValue(mockCameras[0]),
      updateCamera: vi.fn().mockResolvedValue(mockCameras[0]),
      toggleActive: vi.fn().mockResolvedValue(mockCameras[0]),
      toggleEnabled: vi.fn().mockResolvedValue(mockCameras[0]),
      deleteCamera: vi.fn().mockResolvedValue(undefined),
      getMockCameras: vi.fn().mockReturnValue(mockCameras),
    },
  };
});

// Type the mocked service
const mockedCameraService = vi.mocked(cameraService);

const mockCameras = [
  {
    id: 'cam-001',
    name: 'Front Entrance',
    description: 'Main entrance camera',
    location: 'Building A - Main Lobby',
    streamUrl: 'http://192.168.1.100/stream',
    rtspUrl: 'rtsp://192.168.1.100:554/stream1',
    cameraType: 'IP' as const,
    isActive: true,
    isEnabled: true,
    port: 554,
    fps: 30,
    resolution: '1920x1080',
    codec: 'H.264',
    bitrateKbps: 2500,
    status: 'CONNECTED' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    metadata: {},
  },
  {
    id: 'cam-002',
    name: 'Parking Lot',
    description: 'Exterior parking camera',
    location: 'Building A - Exterior',
    streamUrl: 'http://192.168.1.101/stream',
    rtspUrl: 'rtsp://192.168.1.101:554/stream1',
    cameraType: 'IP' as const,
    isActive: false,
    isEnabled: true,
    port: 554,
    fps: 15,
    resolution: '2560x1440',
    codec: 'H.265',
    bitrateKbps: 4000,
    status: 'DISCONNECTED' as const,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-16T14:20:00Z',
    metadata: {},
  },
  {
    id: 'cam-003',
    name: 'Server Room',
    description: 'Server room monitoring',
    location: 'Building B - Floor 2',
    streamUrl: 'http://192.168.1.102/stream',
    cameraType: 'ONVIF' as const,
    isActive: true,
    isEnabled: false,
    port: 80,
    fps: 10,
    resolution: '1280x720',
    codec: 'H.264',
    bitrateKbps: 1500,
    status: 'ERROR' as const,
    errorMessage: 'Connection timeout',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-17T09:15:00Z',
    metadata: {},
  },
];

describe('CameraManager Component', () => {
  beforeEach(() => {
    // Reset all mocks to their default implementations before each test
    vi.clearAllMocks();
    (mockedCameraService.getAllCameras as ReturnType<typeof vi.fn>).mockResolvedValue(mockCameras);
    (mockedCameraService.createCamera as ReturnType<typeof vi.fn>).mockResolvedValue(mockCameras[0]);
    (mockedCameraService.updateCamera as ReturnType<typeof vi.fn>).mockResolvedValue(mockCameras[0]);
    (mockedCameraService.toggleActive as ReturnType<typeof vi.fn>).mockResolvedValue(mockCameras[0]);
    (mockedCameraService.toggleEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(mockCameras[0]);
    (mockedCameraService.deleteCamera as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (mockedCameraService.getMockCameras as ReturnType<typeof vi.fn>).mockReturnValue(mockCameras);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <CameraManager isOpen={false} onClose={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders panel when isOpen is true', async () => {
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Camera Management/i)).toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      (mockedCameraService.getAllCameras as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      expect(screen.getByText(/Loading cameras/i)).toBeInTheDocument();
    });

    it('displays all cameras after loading', async () => {
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      // First wait for loading spinner to appear and disappear
      await waitFor(() => {
        expect(screen.queryByText(/Loading cameras/i)).not.toBeInTheDocument();
      });
      
      // Then check for cameras
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
        expect(screen.getByText(/Parking Lot/)).toBeInTheDocument();
        expect(screen.getByText(/Server Room/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays camera count badge', async () => {
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 of 3')).toBeInTheDocument();
      });
    });

    it('displays camera details correctly', async () => {
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Building A - Main Lobby/)).toBeInTheDocument();
        expect(screen.getByText('1920x1080')).toBeInTheDocument();
      });
    });
  });

  describe('Status Badges', () => {
    it('shows correct status badges for active/enabled camera', async () => {
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        const activeLabels = screen.getAllByText('● Active');
        const enabledLabels = screen.getAllByText('✓ Enabled');
        expect(activeLabels.length).toBeGreaterThan(0);
        expect(enabledLabels.length).toBeGreaterThan(0);
      });
    });

    it('shows correct status badges for inactive camera', async () => {
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        const inactiveLabels = screen.getAllByText('○ Inactive');
        expect(inactiveLabels.length).toBeGreaterThan(0);
      });
    });

    it('shows correct status badges for disabled camera', async () => {
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        const disabledLabels = screen.getAllByText('✗ Disabled');
        expect(disabledLabels.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filtering', () => {
    it('filters cameras by search query', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search cameras...');
      await user.type(searchInput, 'Parking');
      
      await waitFor(() => {
        expect(screen.getByText(/Parking Lot/)).toBeInTheDocument();
        expect(screen.queryByText(/Front Entrance/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Server Room/)).not.toBeInTheDocument();
      });
    });

    it('filters cameras by active status', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const statusFilter = screen.getByRole('combobox');
      await user.selectOptions(statusFilter, 'active');
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
        expect(screen.getByText(/Server Room/)).toBeInTheDocument();
        expect(screen.queryByText(/Parking Lot/)).not.toBeInTheDocument();
      });
    });

    it('updates count badge when filtering', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('3 of 3')).toBeInTheDocument();
      });
      
      const statusFilter = screen.getByRole('combobox');
      await user.selectOptions(statusFilter, 'active');
      
      await waitFor(() => {
        expect(screen.getByText('2 of 3')).toBeInTheDocument();
      });
    });
  });

  describe('Add Camera', () => {
    it('opens add form when Add Camera button is clicked', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('+ Add Camera')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('+ Add Camera'));
      
      expect(screen.getByText('➕ Add Camera')).toBeInTheDocument();
    });

    it('validates required fields on submit', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('+ Add Camera')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('+ Add Camera'));
      await user.click(screen.getByText('Create Camera'));
      
      await waitFor(() => {
        expect(screen.getByText('Camera name is required')).toBeInTheDocument();
      });
    });

    it('creates camera when form is valid', async () => {
      const user = userEvent.setup();
      (mockedCameraService.createCamera as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockCameras[0],
        id: 'cam-004',
        name: 'New Camera',
      });
      
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('+ Add Camera')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('+ Add Camera'));
      
      await user.type(screen.getByPlaceholderText('e.g., Front Entrance Cam'), 'New Camera');
      await user.type(screen.getByPlaceholderText('http://192.168.1.100/stream'), 'http://10.0.0.1/stream');
      
      await user.click(screen.getByText('Create Camera'));
      
      await waitFor(() => {
        expect(mockedCameraService.createCamera).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Camera', () => {
    it('opens edit form when Edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByText('✏️ Edit');
      await user.click(editButtons[0]);
      
      expect(screen.getByText('✏️ Edit Camera')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Front Entrance')).toBeInTheDocument();
    });

    it('populates form with camera data', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByText('✏️ Edit');
      await user.click(editButtons[0]);
      
      expect(screen.getByDisplayValue('Front Entrance')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Building A - Main Lobby')).toBeInTheDocument();
    });
  });

  describe('Toggle Operations', () => {
    it('toggles camera active status', async () => {
      const user = userEvent.setup();
      (mockedCameraService.toggleActive as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const pauseButtons = screen.getAllByText('⏸️ Pause');
      await user.click(pauseButtons[0]);
      
      expect(mockedCameraService.toggleActive).toHaveBeenCalledWith('cam-001', false);
    });

    it('toggles camera enabled status', async () => {
      const user = userEvent.setup();
      (mockedCameraService.toggleEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const disableButtons = screen.getAllByText('🔕 Disable');
      await user.click(disableButtons[0]);
      
      expect(mockedCameraService.toggleEnabled).toHaveBeenCalledWith('cam-001', false);
    });
  });

  describe('Delete Camera', () => {
    it('shows confirmation when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByText('🗑️');
      await user.click(deleteButtons[0]);
      
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('deletes camera when confirmed', async () => {
      const user = userEvent.setup();
      (mockedCameraService.deleteCamera as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByText('🗑️');
      await user.click(deleteButtons[0]);
      
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockedCameraService.deleteCamera).toHaveBeenCalledWith('cam-001');
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error banner when API fails', async () => {
      (mockedCameraService.getAllCameras as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );
      
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Demo mode - Backend unavailable/i)).toBeInTheDocument();
      });
    });

    it('dismisses error when clicking dismiss button', async () => {
      const user = userEvent.setup();
      (mockedCameraService.getAllCameras as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );
      
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Demo mode - Backend unavailable/i)).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Dismiss'));
      
      expect(screen.queryByText(/Demo mode - Backend unavailable/i)).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no cameras exist', async () => {
      (mockedCameraService.getAllCameras as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockedCameraService.getMockCameras as ReturnType<typeof vi.fn>).mockReturnValue([]);
      
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('No cameras configured')).toBeInTheDocument();
        expect(screen.getByText('Add First Camera')).toBeInTheDocument();
      });
    });

    it('shows filtered empty state when search has no results', async () => {
      const user = userEvent.setup();
      render(<CameraManager isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Front Entrance/)).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search cameras...');
      await user.type(searchInput, 'nonexistent camera name');
      
      await waitFor(() => {
        expect(screen.getByText('No cameras match your filters')).toBeInTheDocument();
      });
    });
  });
});
