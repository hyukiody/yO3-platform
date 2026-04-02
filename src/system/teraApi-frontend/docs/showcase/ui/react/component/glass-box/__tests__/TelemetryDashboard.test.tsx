import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import { TelemetryDashboard } from '../TelemetryDashboard';
import { telemetryService } from '@services/telemetryService';
import { HealthData, ServiceHealth } from '@domain/types/glass-box';

// Mock the telemetryService
vi.mock('@services/telemetryService', () => ({
  telemetryService: {
    subscribeToHealth: vi.fn(),
    getConnectionStates: vi.fn(),
  },
}));

describe('TelemetryDashboard Component', () => {
  const mockTelemetryService = vi.mocked(telemetryService);
  let healthCallback: ((data: HealthData) => void) | null = null;
  const mockUnsubscribe = vi.fn();

  const createMockService = (overrides: Partial<ServiceHealth> = {}): ServiceHealth => ({
    name: 'Test Service',
    status: 'online',
    endpoint: '/api/test',
    latency: 50,
    message: 'OK',
    ...overrides,
  });

  const createMockHealthData = (overrides: Partial<HealthData> = {}): HealthData => ({
    timestamp: '2026-01-21T10:30:00Z',
    overallStatus: 'healthy',
    services: [
      createMockService({ name: 'Identity Service', endpoint: '/api/auth' }),
      createMockService({ name: 'Stream Service', endpoint: '/api/stream' }),
    ],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    healthCallback = null;

    mockTelemetryService.subscribeToHealth.mockImplementation((callback) => {
      healthCallback = callback;
      return mockUnsubscribe;
    });

    mockTelemetryService.getConnectionStates.mockReturnValue({
      health: 'closed',
      apiMonitor: 'closed',
      dataFlow: 'closed',
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial Rendering', () => {
    it('renders dashboard title', () => {
      render(<TelemetryDashboard />);
      expect(screen.getByText('System Internals')).toBeInTheDocument();
    });

    it('renders dashboard container', () => {
      const { container } = render(<TelemetryDashboard />);
      expect(container.querySelector('[class*="telemetryDashboard"]')).toBeInTheDocument();
    });

    it('renders dashboard header', () => {
      const { container } = render(<TelemetryDashboard />);
      expect(container.querySelector('[class*="dashboardHeader"]')).toBeInTheDocument();
    });

    it('renders dashboard content area', () => {
      const { container } = render(<TelemetryDashboard />);
      expect(container.querySelector('[class*="dashboardContent"]')).toBeInTheDocument();
    });
  });

  describe('Connection States', () => {
    it('shows disconnected status initially (default state)', () => {
      render(<TelemetryDashboard />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('renders status dot indicator', () => {
      const { container } = render(<TelemetryDashboard />);
      const statusDot = container.querySelector('[class*="statusDot"]');
      expect(statusDot).toBeInTheDocument();
    });

    it('applies disconnected class to status dot when closed', () => {
      const { container } = render(<TelemetryDashboard />);
      const statusDot = container.querySelector('[class*="statusDot"]');
      expect(statusDot?.className).toContain('disconnected');
    });

    it('shows connecting status after polling detects connecting state', async () => {
      mockTelemetryService.getConnectionStates.mockReturnValue({
        health: 'connecting',
        apiMonitor: 'closed',
        dataFlow: 'closed',
      });

      render(<TelemetryDashboard />);
      
      // Wait for interval to trigger and update state
      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('shows connected status after polling detects open state', async () => {
      mockTelemetryService.getConnectionStates.mockReturnValue({
        health: 'open',
        apiMonitor: 'closed',
        dataFlow: 'closed',
      });

      render(<TelemetryDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Empty States', () => {
    it('shows error message when disconnected initially', () => {
      render(<TelemetryDashboard />);
      expect(screen.getByText(/Unable to connect to telemetry server/)).toBeInTheDocument();
    });

    it('shows port information in error message', () => {
      render(<TelemetryDashboard />);
      expect(screen.getByText(/port 9093/)).toBeInTheDocument();
    });

    it('shows waiting message when connected but no data', async () => {
      mockTelemetryService.getConnectionStates.mockReturnValue({
        health: 'open',
        apiMonitor: 'closed',
        dataFlow: 'closed',
      });

      render(<TelemetryDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Waiting for data...')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('shows connecting message when state is connecting', async () => {
      mockTelemetryService.getConnectionStates.mockReturnValue({
        health: 'connecting',
        apiMonitor: 'closed',
        dataFlow: 'closed',
      });

      render(<TelemetryDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Connecting to telemetry server...')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Health Data Display', () => {
    it('renders service cards when health data is received', async () => {
      render(<TelemetryDashboard />);
      
      const healthData = createMockHealthData();
      
      await act(async () => {
        healthCallback?.(healthData);
      });

      expect(screen.getByText('Identity Service')).toBeInTheDocument();
      expect(screen.getByText('Stream Service')).toBeInTheDocument();
    });

    it('renders all services from health data', async () => {
      const healthData = createMockHealthData({
        services: [
          createMockService({ name: 'Service A' }),
          createMockService({ name: 'Service B' }),
          createMockService({ name: 'Service C' }),
        ],
      });

      render(<TelemetryDashboard />);
      
      await act(async () => {
        healthCallback?.(healthData);
      });

      expect(screen.getByText('Service A')).toBeInTheDocument();
      expect(screen.getByText('Service B')).toBeInTheDocument();
      expect(screen.getByText('Service C')).toBeInTheDocument();
    });

    it('displays last update timestamp', async () => {
      const healthData = createMockHealthData({
        timestamp: '2026-01-21T15:30:00Z',
      });

      render(<TelemetryDashboard />);
      
      await act(async () => {
        healthCallback?.(healthData);
      });

      expect(screen.getByText(/Last update:/)).toBeInTheDocument();
    });

    it('hides empty state messages when data is available', async () => {
      render(<TelemetryDashboard />);
      
      const healthData = createMockHealthData();
      
      await act(async () => {
        healthCallback?.(healthData);
      });

      expect(screen.queryByText(/Unable to connect/)).not.toBeInTheDocument();
    });
  });

  describe('Subscription Management', () => {
    it('subscribes to health updates on mount', () => {
      render(<TelemetryDashboard />);
      expect(mockTelemetryService.subscribeToHealth).toHaveBeenCalledTimes(1);
    });

    it('passes callback function to subscribeToHealth', () => {
      render(<TelemetryDashboard />);
      expect(mockTelemetryService.subscribeToHealth).toHaveBeenCalledWith(expect.any(Function));
    });

    it('unsubscribes from health updates on unmount', () => {
      const { unmount } = render(<TelemetryDashboard />);
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('updates displayed services when health data changes', async () => {
      render(<TelemetryDashboard />);
      
      // First update
      const initialData = createMockHealthData({
        services: [createMockService({ name: 'Initial Service' })],
      });
      
      await act(async () => {
        healthCallback?.(initialData);
      });
      
      expect(screen.getByText('Initial Service')).toBeInTheDocument();
      
      // Second update
      const updatedData = createMockHealthData({
        services: [createMockService({ name: 'Updated Service' })],
      });
      
      await act(async () => {
        healthCallback?.(updatedData);
      });
      
      expect(screen.getByText('Updated Service')).toBeInTheDocument();
      expect(screen.queryByText('Initial Service')).not.toBeInTheDocument();
    });

    it('handles rapid health data updates', async () => {
      render(<TelemetryDashboard />);
      
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          const data = createMockHealthData({
            services: [createMockService({ name: `Service ${i}` })],
          });
          healthCallback?.(data);
        }
      });
      
      // Should show last update
      expect(screen.getByText('Service 9')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty services array', async () => {
      render(<TelemetryDashboard />);
      
      const healthData = createMockHealthData({ services: [] });
      
      await act(async () => {
        healthCallback?.(healthData);
      });

      // Should still show timestamp
      expect(screen.getByText(/Last update:/)).toBeInTheDocument();
    });

    it('handles health data with many services', async () => {
      const services = Array.from({ length: 20 }, (_, i) => 
        createMockService({ name: `Service ${i}`, endpoint: `/api/service-${i}` })
      );
      
      const healthData = createMockHealthData({ services });
      
      render(<TelemetryDashboard />);
      
      await act(async () => {
        healthCallback?.(healthData);
      });

      // Check first and last services are rendered
      expect(screen.getByText('Service 0')).toBeInTheDocument();
      expect(screen.getByText('Service 19')).toBeInTheDocument();
    });

    it('handles services with various statuses', async () => {
      const healthData = createMockHealthData({
        services: [
          createMockService({ name: 'Online Service', status: 'online' }),
          createMockService({ name: 'Degraded Service', status: 'degraded' }),
          createMockService({ name: 'Offline Service', status: 'offline' }),
        ],
      });
      
      render(<TelemetryDashboard />);
      
      await act(async () => {
        healthCallback?.(healthData);
      });

      expect(screen.getByText('Online Service')).toBeInTheDocument();
      expect(screen.getByText('Degraded Service')).toBeInTheDocument();
      expect(screen.getByText('Offline Service')).toBeInTheDocument();
    });
  });
});
