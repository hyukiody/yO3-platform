/**
 * useEvents.test.ts - Tests for Event Data Fetching Hooks
 *
 * Tests the useEvents and useEventStatistics hooks that fetch
 * detection events with pagination, filtering, and statistics.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvents, useEventStatistics } from './useEvents';

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useEvents Hook', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('Basic Fetching', () => {
    it('fetches events successfully with default filters', async () => {
      const mockResponse = {
        success: true,
        events: [
          {
            id: 1,
            eventId: 'evt-001',
            eventTimestamp: '2026-01-21T10:00:00Z',
            cameraId: 'cam-001',
            frameId: 100,
            detectionClass: 'person',
            confidence: 0.95,
            status: 'active',
            isEncrypted: false,
            createdAt: '2026-01-21T10:00:00Z',
          },
        ],
        currentPage: 0,
        totalItems: 1,
        totalPages: 1,
        pageSize: 20,
        hasNext: false,
        hasPrevious: false,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/events');
    });

    it('builds query string with pagination parameters', async () => {
      const mockResponse = { success: true, events: [], currentPage: 2, totalItems: 0, totalPages: 0, pageSize: 10, hasNext: false, hasPrevious: true };
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(
        () => useEvents({ page: 2, size: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('size=10'));
    });

    it('builds query string with filter parameters', async () => {
      const mockResponse = { success: true, events: [], currentPage: 0, totalItems: 0, totalPages: 0, pageSize: 20, hasNext: false, hasPrevious: false };
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(
        () => useEvents({ cameraId: 'cam-001', detectionClass: 'person' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('cameraId=cam-001'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('detectionClass=person'));
    });

    it('includes confidence threshold in query string', async () => {
      const mockResponse = { success: true, events: [], currentPage: 0, totalItems: 0, totalPages: 0, pageSize: 20, hasNext: false, hasPrevious: false };
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(
        () => useEvents({ confidenceThreshold: 0.8 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('confidenceThreshold=0.8'));
    });

    it('includes time range parameters in query string', async () => {
      const mockResponse = { success: true, events: [], currentPage: 0, totalItems: 0, totalPages: 0, pageSize: 20, hasNext: false, hasPrevious: false };
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(
        () => useEvents({ startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-21T23:59:59Z' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('startTime='));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('endTime='));
    });

    it('includes sort parameter in query string', async () => {
      const mockResponse = { success: true, events: [], currentPage: 0, totalItems: 0, totalPages: 0, pageSize: 20, hasNext: false, hasPrevious: false };
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(
        () => useEvents({ sort: 'eventTimestamp,desc' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('sort=eventTimestamp'));
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toContain('Failed to fetch events');
    });

    it('handles network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', () => {
      vi.mocked(fetch).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Query Key Generation', () => {
    it('creates unique query keys for different filters', async () => {
      const mockResponse = { success: true, events: [], currentPage: 0, totalItems: 0, totalPages: 0, pageSize: 20, hasNext: false, hasPrevious: false };
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // Render with first filter set
      const { result: result1 } = renderHook(
        () => useEvents({ page: 1 }),
        { wrapper: createWrapper() }
      );

      // Render with second filter set
      const { result: result2 } = renderHook(
        () => useEvents({ page: 2 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));
      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Both should have made separate fetch calls
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useEventStatistics Hook', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('Basic Fetching', () => {
    it('fetches statistics successfully', async () => {
      const mockResponse = {
        success: true,
        statistics: {
          totalEvents: 1000,
          mostCommonClass: 'person',
          averageConfidence: 0.87,
          encryptedEventCount: 250,
          failedEventCount: 10,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(() => useEventStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/events/statistics');
    });

    it('returns statistics data structure', async () => {
      const mockResponse = {
        success: true,
        statistics: {
          totalEvents: 500,
          mostCommonClass: 'vehicle',
          averageConfidence: 0.92,
          encryptedEventCount: 100,
          failedEventCount: 5,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const { result } = renderHook(() => useEventStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.statistics.totalEvents).toBe(500);
      expect(result.current.data?.statistics.mostCommonClass).toBe('vehicle');
      expect(result.current.data?.statistics.averageConfidence).toBe(0.92);
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors for statistics', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      } as Response);

      const { result } = renderHook(() => useEventStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toContain('Failed to fetch statistics');
    });
  });
});
