/**
 * ControlPanel.test.tsx - Tests for System Configuration Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlPanel from '@ops/controls/ui/react/component/ControlPanel';
import { configService } from '@services/ConfigService';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

// Mock ConfigService
vi.mock('@services/ConfigService', () => ({
  configService: {
    getAllConfigs: vi.fn(),
    updateConfig: vi.fn(),
    getMockConfigs: vi.fn(),
  },
}));

const mockConfigs = [
  {
    configKey: 'ANALYSIS_REPORT_INTERVAL',
    configValue: '60',
    dataType: 'INTEGER' as const,
    description: 'Minutes between analysis reports',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    configKey: 'DETECTION_ENABLED',
    configValue: 'true',
    dataType: 'BOOLEAN' as const,
    description: 'Enable detection system',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    configKey: 'CONFIDENCE_THRESHOLD',
    configValue: '0.75',
    dataType: 'FLOAT' as const,
    description: 'Detection confidence threshold',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    configKey: 'API_ENDPOINT',
    configValue: 'https://api.example.com',
    dataType: 'STRING' as const,
    description: 'External API endpoint',
    updatedAt: '2024-01-15T10:30:00Z',
  },
];

describe('ControlPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (configService.getAllConfigs as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfigs);
    (configService.getMockConfigs as ReturnType<typeof vi.fn>).mockReturnValue(mockConfigs);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <ControlPanel isOpen={false} onClose={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders panel when isOpen is true', async () => {
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/System Configuration/i)).toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      (configService.getAllConfigs as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('displays all configuration items after loading', async () => {
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('ANALYSIS_REPORT_INTERVAL')).toBeInTheDocument();
        expect(screen.getByText('DETECTION_ENABLED')).toBeInTheDocument();
        expect(screen.getByText('CONFIDENCE_THRESHOLD')).toBeInTheDocument();
        expect(screen.getByText('API_ENDPOINT')).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<ControlPanel isOpen={true} onClose={onClose} />);
      
      await waitFor(() => {
        expect(screen.getByText(/System Configuration/i)).toBeInTheDocument();
      });
      
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('enters edit mode when Edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('ANALYSIS_REPORT_INTERVAL')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByText(/Edit/);
      await user.click(editButtons[0]);
      
      // Should show Save and Cancel buttons
      expect(screen.getByText(/Save/)).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('cancels edit mode when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('ANALYSIS_REPORT_INTERVAL')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByText(/Edit/);
      await user.click(editButtons[0]);
      
      await user.click(screen.getByText('Cancel'));
      
      // Should be back in view mode - Edit buttons visible again
      await waitFor(() => {
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });
    });

    it('refreshes data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('ANALYSIS_REPORT_INTERVAL')).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByTitle('Refresh configurations');
      await user.click(refreshButton);
      
      // Should have called getAllConfigs again
      expect(configService.getAllConfigs).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Type Handling', () => {
    it('renders boolean config correctly', async () => {
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        // Boolean values show '✓ Enabled'
        const enabledElements = screen.getAllByText(/Enabled/i);
        expect(enabledElements.length).toBeGreaterThan(0);
      });
    });

    it('renders INTEGER config with numeric value', async () => {
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('60')).toBeInTheDocument();
      });
    });
  });

  describe('Save Operations', () => {
    it('calls updateConfig when saving changes', async () => {
      const user = userEvent.setup();
      (configService.updateConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockConfigs[0],
        configValue: '120',
      });
      
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText('ANALYSIS_REPORT_INTERVAL')).toBeInTheDocument();
      });
      
      // Click Edit for first config
      const editButtons = screen.getAllByText(/Edit/);
      await user.click(editButtons[0]);
      
      // Find the input and change value
      const input = screen.getByDisplayValue('60');
      await user.clear(input);
      await user.type(input, '120');
      
      // Save
      await user.click(screen.getByText(/Save/));
      
      await waitFor(() => {
        expect(configService.updateConfig).toHaveBeenCalledWith('ANALYSIS_REPORT_INTERVAL', { value: '120' });
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when API fails', async () => {
      (configService.getAllConfigs as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );
      
      render(<ControlPanel isOpen={true} onClose={vi.fn()} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });
});
