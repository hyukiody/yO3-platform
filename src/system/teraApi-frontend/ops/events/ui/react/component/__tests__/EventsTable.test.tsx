/**
 * EventsTable.test.tsx - Tests for Detection Events Table Component
 * 
 * Tests cover:
 * - Rendering states (loading, error, empty, with data)
 * - Statistics panel display
 * - Filtering functionality (class, confidence, camera, page size)
 * - Pagination controls
 * - Event row rendering with badges and indicators
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventsTable } from '../EventsTable';

// Mock CSS modules
vi.mock('../EventsTable.module.css', () => ({
  default: {
    container: 'container',
    header: 'header',
    refreshBtn: 'refreshBtn',
    statsPanel: 'statsPanel',
    statItem: 'statItem',
    statLabel: 'statLabel',
    statValue: 'statValue',
    filterPanel: 'filterPanel',
    filterGroup: 'filterGroup',
    errorMessage: 'errorMessage',
    tableWrapper: 'tableWrapper',
    table: 'table',
    eventRow: 'eventRow',
    timestamp: 'timestamp',
    camera: 'camera',
    class: 'class',
    classBadge: 'classBadge',
    confidence: 'confidence',
    confidenceBar: 'confidenceBar',
    confidenceFill: 'confidenceFill',
    confidenceText: 'confidenceText',
    status: 'status',
    statusBadge: 'statusBadge',
    frameId: 'frameId',
    encrypted: 'encrypted',
    noData: 'noData',
    paginationControls: 'paginationControls',
    paginationBtn: 'paginationBtn',
    paginationInfo: 'paginationInfo',
    separator: 'separator',
    footer: 'footer',
  },
}));

// Mock requestLogger
vi.mock('@services/requestLogger', () => ({
  requestLogger: {
    log: vi.fn(),
  },
}));

// Mock useEvents and useEventStatistics hooks
const mockRefetch = vi.fn();
const mockUseEvents = vi.fn();
const mockUseEventStatistics = vi.fn();

vi.mock('@hooks/useEvents', () => ({
  useEvents: (filters: unknown) => mockUseEvents(filters),
  useEventStatistics: () => mockUseEventStatistics(),
}));

// Sample test data
const mockEvents = [
  {
    id: 1,
    eventId: 'evt-001',
    eventTimestamp: '2026-01-21T10:30:00Z',
    cameraId: 'CAM-001',
    frameId: 1234,
    detectionClass: 'person',
    confidence: 0.95,
    boundingBox: { x: 100, y: 200, width: 50, height: 100 },
    status: 'PROCESSED',
    isEncrypted: true,
    createdAt: '2026-01-21T10:30:00Z',
  },
  {
    id: 2,
    eventId: 'evt-002',
    eventTimestamp: '2026-01-21T10:31:00Z',
    cameraId: 'CAM-002',
    frameId: 1235,
    detectionClass: 'car',
    confidence: 0.87,
    status: 'PENDING',
    isEncrypted: false,
    createdAt: '2026-01-21T10:31:00Z',
  },
  {
    id: 3,
    eventId: 'evt-003',
    eventTimestamp: '2026-01-21T10:32:00Z',
    cameraId: 'CAM-001',
    frameId: 1236,
    detectionClass: 'dog',
    confidence: 0.72,
    status: 'FAILED',
    isEncrypted: true,
    createdAt: '2026-01-21T10:32:00Z',
  },
];

const mockStatistics = {
  totalEvents: 150,
  mostCommonClass: 'person',
  averageConfidence: 0.82,
  encryptedEventCount: 120,
  failedEventCount: 5,
};

const mockPagination = {
  currentPage: 0,
  totalItems: 150,
  totalPages: 8,
  pageSize: 20,
  hasNext: true,
  hasPrevious: false,
};

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

describe('EventsTable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseEvents.mockReturnValue({
      data: {
        events: mockEvents,
        ...mockPagination,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseEventStatistics.mockReturnValue({
      data: {
        success: true,
        statistics: mockStatistics,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders the header with title and refresh button', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.getByRole('heading', { name: /Detection Events/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });

    it('renders statistics panel with correct values', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Most Common')).toBeInTheDocument();
      // 'person' appears in stats panel and table, so use getAllByText
      expect(screen.getAllByText('person').length).toBeGreaterThan(0);
      expect(screen.getByText('Avg Confidence')).toBeInTheDocument();
      expect(screen.getByText('82.0%')).toBeInTheDocument();
      expect(screen.getByText('Encrypted Events')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('renders filter panel with all filter controls', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Labels - 'Detection Class' appears in both filter label and table header
      expect(screen.getAllByText('Detection Class').length).toBe(2);
      expect(screen.getByText('Confidence Threshold')).toBeInTheDocument();
      expect(screen.getByText('Camera ID')).toBeInTheDocument();
      expect(screen.getByText('Page Size')).toBeInTheDocument();
      
      // Form controls are present
      expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
      expect(screen.getByRole('slider')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Filter by camera ID/i)).toBeInTheDocument();
    });

    it('renders table headers correctly', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Camera')).toBeInTheDocument();
      // 'Detection Class' appears in filter label and table header
      expect(screen.getAllByText('Detection Class').length).toBe(2);
      expect(screen.getByText('Confidence')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Frame ID')).toBeInTheDocument();
      expect(screen.getByText('Encrypted')).toBeInTheDocument();
    });

    it('renders event rows with correct data', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Check first event - CAM-001 appears twice (evt-001 and evt-003)
      const cam001Elements = screen.getAllByText('CAM-001');
      expect(cam001Elements.length).toBe(2);
      expect(screen.getByText('95.0%')).toBeInTheDocument();
      expect(screen.getByText('#1234')).toBeInTheDocument();
      
      // Check second event
      expect(screen.getByText('CAM-002')).toBeInTheDocument();
      expect(screen.getByText('87.0%')).toBeInTheDocument();
      
      // Check encrypted indicators
      const lockIcons = screen.getAllByText('🔒');
      const unlockIcons = screen.getAllByText('🔓');
      expect(lockIcons).toHaveLength(2); // evt-001 and evt-003 are encrypted
      expect(unlockIcons).toHaveLength(1); // evt-002 is not encrypted
    });

    it('renders detection class badges with correct colors', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Use getAllByText since 'person' appears in stats panel and table
      const personElements = screen.getAllByText('person');
      // Find the one in the table that's in a classBadge span
      const personBadge = personElements.find(el => el.classList.contains('classBadge'));
      
      const carElements = screen.getAllByText('car');
      const carBadge = carElements.find(el => el.classList.contains('classBadge'));
      
      const dogElements = screen.getAllByText('dog');
      const dogBadge = dogElements.find(el => el.classList.contains('classBadge'));
      
      expect(personBadge).toHaveStyle({ backgroundColor: '#FF6B6B' });
      expect(carBadge).toHaveStyle({ backgroundColor: '#4ECDC4' });
      expect(dogBadge).toHaveStyle({ backgroundColor: '#FFE66D' });
    });
  });

  describe('Loading State', () => {
    it('displays loading state when fetching data', () => {
      mockUseEvents.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Button shows "Loading..." text
      expect(screen.getByRole('button', { name: /Loading/i })).toBeInTheDocument();
    });

    it('shows loading text in empty table row', () => {
      mockUseEvents.mockReturnValue({
        data: { events: [], ...mockPagination },
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/Loading events.../i)).toBeInTheDocument();
    });

    it('disables refresh button while loading', () => {
      mockUseEvents.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      const refreshButton = screen.getByRole('button', { name: /Loading.../i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('displays error message when fetch fails', () => {
      const errorMessage = 'Failed to fetch events: Network error';
      mockUseEvents.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error(errorMessage),
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.getByText(`❌ ${errorMessage}`)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays no data message when no events match filters', () => {
      mockUseEvents.mockReturnValue({
        data: {
          events: [],
          currentPage: 0,
          totalItems: 0,
          totalPages: 0,
          pageSize: 20,
          hasNext: false,
          hasPrevious: false,
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/No events found matching filters/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('calls useEvents with updated detection class filter', async () => {
      const user = userEvent.setup();
      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Get all selects, first one is Detection Class
      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[0], 'person');
      
      expect(mockUseEvents).toHaveBeenCalledWith(
        expect.objectContaining({ detectionClass: 'person' })
      );
    });

    it('calls useEvents with updated confidence threshold', async () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0.8' } });
      
      expect(mockUseEvents).toHaveBeenCalledWith(
        expect.objectContaining({ confidenceThreshold: 0.8 })
      );
    });

    it('calls useEvents with camera ID filter', async () => {
      const user = userEvent.setup();
      render(<EventsTable />, { wrapper: createWrapper() });
      
      const cameraInput = screen.getByPlaceholderText(/Filter by camera ID/i);
      await user.type(cameraInput, 'CAM-001');
      
      await waitFor(() => {
        expect(mockUseEvents).toHaveBeenCalledWith(
          expect.objectContaining({ cameraId: 'CAM-001' })
        );
      });
    });

    it('calls useEvents with updated page size', async () => {
      const user = userEvent.setup();
      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Get all selects, second one is Page Size
      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[1], '50');
      
      expect(mockUseEvents).toHaveBeenCalledWith(
        expect.objectContaining({ size: 50 })
      );
    });

    it('resets to first page when filter changes', async () => {
      const user = userEvent.setup();
      
      // Start on page 2
      mockUseEvents.mockReturnValue({
        data: {
          events: mockEvents,
          currentPage: 2,
          totalItems: 150,
          totalPages: 8,
          pageSize: 20,
          hasNext: true,
          hasPrevious: true,
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Get all selects, first one is Detection Class
      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[0], 'car');
      
      expect(mockUseEvents).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0 })
      );
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls when multiple pages exist', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      expect(screen.getByText(/Page 1 of 8/i)).toBeInTheDocument();
      expect(screen.getByText(/150 total events/i)).toBeInTheDocument();
    });

    it('disables Previous button on first page', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      const prevButton = screen.getByRole('button', { name: /Previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('enables Next button when more pages exist', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      const nextButton = screen.getByRole('button', { name: /Next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('calls useEvents with next page when Next clicked', async () => {
      const user = userEvent.setup();
      render(<EventsTable />, { wrapper: createWrapper() });
      
      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);
      
      expect(mockUseEvents).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });

    it('disables Next button on last page', () => {
      mockUseEvents.mockReturnValue({
        data: {
          events: mockEvents,
          currentPage: 7,
          totalItems: 150,
          totalPages: 8,
          pageSize: 20,
          hasNext: false,
          hasPrevious: true,
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      const nextButton = screen.getByRole('button', { name: /Next/i });
      expect(nextButton).toBeDisabled();
    });

    it('does not render pagination when only one page exists', () => {
      mockUseEvents.mockReturnValue({
        data: {
          events: mockEvents.slice(0, 1),
          currentPage: 0,
          totalItems: 1,
          totalPages: 1,
          pageSize: 20,
          hasNext: false,
          hasPrevious: false,
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.queryByRole('button', { name: /Previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('calls refetch when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<EventsTable />, { wrapper: createWrapper() });
      
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshButton);
      
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Statistics Panel', () => {
    it('handles missing statistics gracefully', () => {
      mockUseEventStatistics.mockReturnValue({
        data: null,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Should render without crashing, stats panel should not appear
      expect(screen.queryByText('Total Events')).not.toBeInTheDocument();
    });

    it('displays N/A for missing statistics values', () => {
      mockUseEventStatistics.mockReturnValue({
        data: {
          success: true,
          statistics: {
            totalEvents: 0,
            mostCommonClass: null,
            averageConfidence: null,
            encryptedEventCount: 0,
          },
        },
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      // Multiple N/A values can appear for missing mostCommonClass and averageConfidence
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Footer', () => {
    it('displays showing count and range in footer', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/Showing 3 events/i)).toBeInTheDocument();
      expect(screen.getByText(/1-20 of 150/i)).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('formats timestamps in localized format', () => {
      render(<EventsTable />, { wrapper: createWrapper() });
      
      // The exact format depends on locale, but should contain the date parts
      const timestampCells = document.querySelectorAll('.timestamp');
      expect(timestampCells.length).toBeGreaterThan(0);
    });
  });

  describe('Detection Class Colors', () => {
    it('uses default color for unknown detection classes', () => {
      mockUseEvents.mockReturnValue({
        data: {
          events: [{
            ...mockEvents[0],
            detectionClass: 'unknown_class',
          }],
          ...mockPagination,
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<EventsTable />, { wrapper: createWrapper() });
      
      const badge = screen.getByText('unknown_class').closest('span');
      expect(badge).toHaveStyle({ backgroundColor: '#999' });
    });
  });
});
