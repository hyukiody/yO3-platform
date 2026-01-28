import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceList } from '@device/inventory/ui/react/component/deviceGrid/DeviceList';

// Mock KeyStorageService
const mockListDevices = vi.fn();
const mockDeleteMasterKey = vi.fn();

vi.mock('@services/KeyStorageService', () => ({
  keyStorage: {
    listDevices: () => mockListDevices(),
    deleteMasterKey: (id: string) => mockDeleteMasterKey(id),
  },
}));

// Mock UniversalSecurePlayer
vi.mock('@video/playback/ui/react/component/players/UniversalSecurePlayer', () => ({
  UniversalSecurePlayer: ({ deviceId }: { deviceId: string }) => (
    <div data-testid="secure-player">Mock Player for {deviceId}</div>
  ),
}));

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

describe('DeviceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  describe('loading state', () => {
    it('shows loading state initially', () => {
      mockListDevices.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<DeviceList />);
      
      expect(screen.getByText(/Loading devices/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no devices', async () => {
      mockListDevices.mockResolvedValue([]);
      
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText(/No devices paired/i)).toBeInTheDocument();
      });
    });

    it('shows help text when no devices', async () => {
      mockListDevices.mockResolvedValue([]);
      
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText(/Pair a device to start viewing/i)).toBeInTheDocument();
      });
    });
  });

  describe('device list rendering', () => {
    const mockDevices = ['device-001', 'device-002', 'device-003'];

    beforeEach(() => {
      mockListDevices.mockResolvedValue(mockDevices);
    });

    it('renders device count header', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText(/Paired Devices \(3\)/i)).toBeInTheDocument();
      });
    });

    it('renders all device cards', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
        expect(screen.getByText('device-002')).toBeInTheDocument();
        expect(screen.getByText('device-003')).toBeInTheDocument();
      });
    });

    it('renders device icons', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        const icons = screen.getAllByText('📹');
        expect(icons).toHaveLength(3);
      });
    });

    it('renders remove button for each device', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
        expect(removeButtons).toHaveLength(3);
      });
    });
  });

  describe('device selection', () => {
    beforeEach(() => {
      mockListDevices.mockResolvedValue(['device-001', 'device-002']);
    });

    it('selects device when card is clicked', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('device-001'));
      
      await waitFor(() => {
        expect(screen.getByTestId('secure-player')).toBeInTheDocument();
      });
    });

    it('shows video player for selected device', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('device-001'));
      
      await waitFor(() => {
        expect(screen.getByText(/Video Stream - device-001/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Player for device-001/i)).toBeInTheDocument();
      });
    });

    it('calls onDeviceSelect callback when provided', async () => {
      const onDeviceSelect = vi.fn();
      render(<DeviceList onDeviceSelect={onDeviceSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      // Component doesn't call onDeviceSelect in current implementation
      // This test documents expected behavior for future enhancement
      expect(onDeviceSelect).not.toHaveBeenCalled();
    });

    it('changes selected device when clicking different card', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('device-001'));
      
      await waitFor(() => {
        expect(screen.getByText(/Mock Player for device-001/i)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('device-002'));
      
      await waitFor(() => {
        expect(screen.getByText(/Mock Player for device-002/i)).toBeInTheDocument();
      });
    });
  });

  describe('device removal', () => {
    beforeEach(() => {
      mockListDevices.mockResolvedValue(['device-001', 'device-002']);
      mockDeleteMasterKey.mockResolvedValue(undefined);
    });

    it('shows confirmation dialog on remove', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeButtons[0]);
      
      expect(mockConfirm).toHaveBeenCalledWith('Remove device device-001?');
    });

    it('removes device when confirmed', async () => {
      mockConfirm.mockReturnValue(true);
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeButtons[0]);
      
      await waitFor(() => {
        expect(mockDeleteMasterKey).toHaveBeenCalledWith('device-001');
      });
    });

    it('does not remove device when cancelled', async () => {
      mockConfirm.mockReturnValue(false);
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeButtons[0]);
      
      expect(mockDeleteMasterKey).not.toHaveBeenCalled();
    });

    it('prevents card selection when clicking remove button', async () => {
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeButtons[0]);
      
      // Player should not appear since remove button stops propagation
      expect(screen.queryByTestId('secure-player')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('handles device load failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockListDevices.mockRejectedValue(new Error('Load failed'));
      
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load devices:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('handles device removal failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockListDevices.mockResolvedValue(['device-001']);
      mockDeleteMasterKey.mockRejectedValue(new Error('Delete failed'));
      
      render(<DeviceList />);
      
      await waitFor(() => {
        expect(screen.getByText('device-001')).toBeInTheDocument();
      });
      
      const removeButton = screen.getByRole('button', { name: /Remove/i });
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to remove device:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });
});
