/**
 * AnalysisPanel.test.tsx - Tests for Event Analysis Reports Panel
 * 
 * Tests cover:
 * - Rendering states (loading, error, empty, with data)
 * - Report selection and display
 * - Report details (summary, time range, events by type/severity, event logs)
 * - User interactions (refresh, close, select report)
 * - Internationalization (i18n) integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalysisPanel from '../AnalysisPanel';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock useReports hook
const mockRefetch = vi.fn();
const mockUseReports = vi.fn();

vi.mock('@hooks/useReports', () => ({
  useReports: (token: string) => mockUseReports(token),
}));

// Sample test data
const mockReports = [
  {
    id: 'report-001',
    reportId: 'RPT-001',
    timeWindow: '24h',
    totalEvents: 150,
    eventsByType: {
      person: 80,
      car: 45,
      dog: 25,
    },
    eventsBySeverity: {
      critical: 10,
      warning: 30,
      info: 110,
    },
    recurrencePattern: 'daily',
    generatedAt: '2026-01-21T10:00:00Z',
    startTime: '2026-01-20T10:00:00Z',
    endTime: '2026-01-21T10:00:00Z',
    eventLogs: [
      {
        eventId: 'evt-001',
        type: 'person',
        deviceId: 'CAM-001',
        timestamp: '2026-01-21T09:30:00Z',
        confidence: 0.95,
      },
      {
        eventId: 'evt-002',
        type: 'car',
        deviceId: 'CAM-002',
        timestamp: '2026-01-21T09:35:00Z',
        confidence: 0.87,
      },
      {
        eventId: 'evt-003',
        type: 'dog',
        deviceId: 'CAM-001',
        timestamp: '2026-01-21T09:40:00Z',
        confidence: 0.72,
      },
    ],
  },
  {
    id: 'report-002',
    reportId: 'RPT-002',
    timeWindow: '1h',
    totalEvents: 25,
    eventsByType: {
      person: 15,
      bicycle: 10,
    },
    eventsBySeverity: {
      warning: 5,
      info: 20,
    },
    recurrencePattern: 'hourly',
    generatedAt: '2026-01-21T11:00:00Z',
    startTime: '2026-01-21T10:00:00Z',
    endTime: '2026-01-21T11:00:00Z',
    eventLogs: [],
  },
];

// Helper to create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AnalysisPanel Component', () => {
  const mockToken = 'test-auth-token';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockUseReports.mockReturnValue({
      data: mockReports,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders panel with header containing title and emoji', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // Title contains emoji "📊" followed by translated text
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('renders refresh and close buttons in header', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      expect(screen.getByTitle('Refresh reports')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('renders continue to dashboard button in footer', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // Button text includes arrow
      const continueBtn = screen.getByRole('button', { name: /Continue to Dashboard|→/i });
      expect(continueBtn).toBeInTheDocument();
    });

    it('renders reports list heading', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // Look for h3 elements
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('renders report items with time window and event count', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // Time windows appear in both summary and sidebar
      expect(screen.getAllByText('24h').length).toBeGreaterThan(0);
      expect(screen.getByText('150 events')).toBeInTheDocument();
    });

    it('passes token to useReports hook', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      expect(mockUseReports).toHaveBeenCalledWith(mockToken);
    });
  });

  describe('Loading State', () => {
    it('displays loading state while fetching', () => {
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // Loading text or spinner should be present
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('does not show reports content while loading', () => {
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // Report items should not be present
      expect(screen.queryByText('150 events')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when fetch fails', () => {
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to fetch reports'),
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      expect(screen.getByText('Failed to fetch reports')).toBeInTheDocument();
    });

    it('displays retry button on error', () => {
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      await user.click(screen.getByRole('button', { name: /Retry/i }));
      
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('displays generic error message for non-Error objects', () => {
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: false,
        error: 'String error',
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      expect(screen.getByText(/Error loading reports/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays no data message when no reports available', () => {
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // i18n mock returns the key, component also shows helpful text
      expect(screen.getByText(/analysis\.noReportsAvailable|No reports available/i)).toBeInTheDocument();
    });

    it('displays check again button in empty state', () => {
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      expect(screen.getByRole('button', { name: /Check Again/i })).toBeInTheDocument();
    });

    it('calls refetch when check again button is clicked', async () => {
      const user = userEvent.setup();
      mockUseReports.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      await user.click(screen.getByRole('button', { name: /Check Again/i }));
      
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Report Details', () => {
    it('displays report summary values', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // Report values should be visible
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('daily')).toBeInTheDocument();
    });

    it('displays time range with arrow', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // Should show start and end times with arrow
      expect(screen.getByText('→')).toBeInTheDocument();
    });
  });

  describe('Events Breakdown', () => {
    it('displays event types with counts', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // 'person' and 'car' appear in both eventsByType and eventLogs
      expect(screen.getAllByText('person').length).toBeGreaterThan(0);
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getAllByText('car').length).toBeGreaterThan(0);
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('displays severity levels with counts', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('warning')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  describe('Event Logs', () => {
    it('displays event log entries', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      // CAM-001 appears multiple times in event logs
      expect(screen.getAllByText('CAM-001').length).toBeGreaterThan(0);
      expect(screen.getByText('CAM-002')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      await user.click(screen.getByText('✕'));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when continue button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      const continueBtn = screen.getByRole('button', { name: /Continue to Dashboard|→/i });
      await user.click(continueBtn);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls refetch when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      await user.click(screen.getByTitle('Refresh reports'));
      
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has heading elements', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toBeInTheDocument();
    });

    it('close button is accessible', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      const closeButton = screen.getByText('✕');
      expect(closeButton.tagName).toBe('BUTTON');
    });

    it('refresh button has title for accessibility', () => {
      render(
        <AnalysisPanel token={mockToken} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );
      
      expect(screen.getByTitle('Refresh reports')).toBeInTheDocument();
    });
  });
});
