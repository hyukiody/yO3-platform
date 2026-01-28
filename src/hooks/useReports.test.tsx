/**
 * useReports.test.ts - Tests for Report Data Fetching Hook
 *
 * Tests the useReports hook that fetches available analysis reports
 * with authentication token handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReports } from './useReports';

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

describe('useReports Hook', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('Basic Fetching', () => {
    it('fetches reports successfully with valid token', async () => {
      const mockReports = [
        {
          id: 'rpt-001',
          reportId: 'report-2026-01-21',
          timeWindow: '24h',
          totalEvents: 150,
          eventsByType: { person: 100, vehicle: 50 },
          eventsBySeverity: { high: 10, medium: 40, low: 100 },
          recurrencePattern: 'daily',
          generatedAt: '2026-01-21T12:00:00Z',
          startTime: '2026-01-20T12:00:00Z',
          endTime: '2026-01-21T12:00:00Z',
          eventLogs: [],
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReports),
      } as Response);

      const { result } = renderHook(() => useReports('valid-token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockReports);
      expect(fetch).toHaveBeenCalledWith('/api/v1/reports/available', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
      });
    });

    it('includes authorization header with bearer token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const testToken = 'my-test-token-123';
      const { result } = renderHook(() => useReports(testToken), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${testToken}`,
          }),
        })
      );
    });

    it('returns multiple reports', async () => {
      const mockReports = [
        {
          id: 'rpt-001',
          reportId: 'report-001',
          timeWindow: '24h',
          totalEvents: 100,
          eventsByType: {},
          eventsBySeverity: {},
          recurrencePattern: 'daily',
          generatedAt: '2026-01-21T12:00:00Z',
          startTime: '2026-01-20T12:00:00Z',
          endTime: '2026-01-21T12:00:00Z',
          eventLogs: [],
        },
        {
          id: 'rpt-002',
          reportId: 'report-002',
          timeWindow: '7d',
          totalEvents: 500,
          eventsByType: {},
          eventsBySeverity: {},
          recurrencePattern: 'weekly',
          generatedAt: '2026-01-21T12:00:00Z',
          startTime: '2026-01-14T12:00:00Z',
          endTime: '2026-01-21T12:00:00Z',
          eventLogs: [],
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReports),
      } as Response);

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].reportId).toBe('report-001');
      expect(result.current.data?.[1].reportId).toBe('report-002');
    });
  });

  describe('Query Enablement', () => {
    it('does not fetch when token is empty string', async () => {
      const { result } = renderHook(() => useReports(''), {
        wrapper: createWrapper(),
      });

      // Wait a bit to ensure fetch is not called
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches when token becomes available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const { result, rerender } = renderHook(
        ({ token }) => useReports(token),
        {
          wrapper: createWrapper(),
          initialProps: { token: '' },
        }
      );

      // Initially should not fetch
      expect(fetch).not.toHaveBeenCalled();

      // Update with valid token
      rerender({ token: 'new-token' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('returns empty array on 404 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('throws error on other non-ok responses', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });

      expect(result.current.error?.message).toBe('Failed to fetch reports');
    });

    it('handles network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    });
  });

  describe('Response Handling', () => {
    it('returns empty array when response data is null', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      } as Response);

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('returns empty array when response data is undefined', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(undefined),
      } as Response);

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Report Data Structure', () => {
    it('parses report with event logs correctly', async () => {
      const mockReport = {
        id: 'rpt-001',
        reportId: 'report-with-logs',
        timeWindow: '24h',
        totalEvents: 3,
        eventsByType: { person: 2, vehicle: 1 },
        eventsBySeverity: { high: 1, low: 2 },
        recurrencePattern: 'daily',
        generatedAt: '2026-01-21T12:00:00Z',
        startTime: '2026-01-20T12:00:00Z',
        endTime: '2026-01-21T12:00:00Z',
        eventLogs: [
          {
            eventId: 'evt-001',
            type: 'person',
            deviceId: 'cam-001',
            timestamp: '2026-01-21T10:00:00Z',
            confidence: 0.95,
          },
          {
            eventId: 'evt-002',
            type: 'vehicle',
            deviceId: 'cam-002',
            timestamp: '2026-01-21T11:00:00Z',
            confidence: 0.88,
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockReport]),
      } as Response);

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data?.[0];
      expect(report?.eventLogs).toHaveLength(2);
      expect(report?.eventLogs[0].eventId).toBe('evt-001');
      expect(report?.eventLogs[0].confidence).toBe(0.95);
    });

    it('handles reports with complex eventsByType mapping', async () => {
      const mockReport = {
        id: 'rpt-001',
        reportId: 'complex-report',
        timeWindow: '7d',
        totalEvents: 1000,
        eventsByType: {
          person: 400,
          vehicle: 300,
          animal: 150,
          package: 100,
          unknown: 50,
        },
        eventsBySeverity: { critical: 50, high: 150, medium: 400, low: 400 },
        recurrencePattern: 'weekly',
        generatedAt: '2026-01-21T12:00:00Z',
        startTime: '2026-01-14T12:00:00Z',
        endTime: '2026-01-21T12:00:00Z',
        eventLogs: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockReport]),
      } as Response);

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const report = result.current.data?.[0];
      expect(Object.keys(report?.eventsByType || {})).toHaveLength(5);
      expect(report?.eventsByType.person).toBe(400);
    });
  });

  describe('Query Configuration', () => {
    it('verifies query is configured correctly', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const { result } = renderHook(() => useReports('token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Query was made successfully
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
