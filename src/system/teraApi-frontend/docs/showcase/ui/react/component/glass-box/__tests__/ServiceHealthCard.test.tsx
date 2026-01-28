import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceHealthCard } from '../ServiceHealthCard';
import type { ServiceHealth } from '@system/../types/glass-box';

describe('ServiceHealthCard Component', () => {
  const createMockService = (overrides: Partial<ServiceHealth> = {}): ServiceHealth => ({
    name: 'Test Service',
    status: 'online',
    endpoint: '/api/test',
    latency: 50,
    message: 'OK',
    ...overrides,
  });

  describe('Rendering', () => {
    it('renders service name', () => {
      const service = createMockService({ name: 'Identity Service' });
      render(<ServiceHealthCard service={service} />);
      expect(screen.getByText('Identity Service')).toBeInTheDocument();
    });

    it('renders service endpoint', () => {
      const service = createMockService({ endpoint: '/api/auth/login' });
      render(<ServiceHealthCard service={service} />);
      expect(screen.getByText('/api/auth/login')).toBeInTheDocument();
    });

    it('renders latency in milliseconds', () => {
      const service = createMockService({ latency: 125 });
      render(<ServiceHealthCard service={service} />);
      expect(screen.getByText('125ms')).toBeInTheDocument();
    });

    it('does not render message when message is OK', () => {
      const service = createMockService({ message: 'OK' });
      render(<ServiceHealthCard service={service} />);
      expect(screen.queryByText('OK')).not.toBeInTheDocument();
    });

    it('renders message when not OK', () => {
      const service = createMockService({ message: 'Connection timeout' });
      render(<ServiceHealthCard service={service} />);
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });

    it('does not render empty message', () => {
      const service = createMockService({ message: '' });
      const { container } = render(<ServiceHealthCard service={service} />);
      const messageElements = container.querySelectorAll('[class*="serviceMessage"]');
      expect(messageElements.length).toBe(0);
    });
  });

  describe('Status Indicators', () => {
    it('renders online status indicator', () => {
      const service = createMockService({ status: 'online' });
      const { container } = render(<ServiceHealthCard service={service} />);
      const indicator = container.querySelector('[class*="healthIndicator"]');
      expect(indicator).toBeInTheDocument();
      expect(indicator?.getAttribute('title')).toBe('online');
    });

    it('renders degraded status indicator', () => {
      const service = createMockService({ status: 'degraded' });
      const { container } = render(<ServiceHealthCard service={service} />);
      const indicator = container.querySelector('[class*="healthIndicator"]');
      expect(indicator?.getAttribute('title')).toBe('degraded');
    });

    it('renders offline status indicator', () => {
      const service = createMockService({ status: 'offline' });
      const { container } = render(<ServiceHealthCard service={service} />);
      const indicator = container.querySelector('[class*="healthIndicator"]');
      expect(indicator?.getAttribute('title')).toBe('offline');
    });
  });

  describe('Latency Classification', () => {
    it('applies good class for latency under 100ms', () => {
      const service = createMockService({ latency: 50 });
      const { container } = render(<ServiceHealthCard service={service} />);
      const latencyElement = container.querySelector('[class*="latency"]');
      expect(latencyElement).toBeInTheDocument();
      expect(latencyElement?.className).toContain('good');
    });

    it('applies good class for latency at boundary (99ms)', () => {
      const service = createMockService({ latency: 99 });
      const { container } = render(<ServiceHealthCard service={service} />);
      const latencyElement = container.querySelector('[class*="latency"]');
      expect(latencyElement?.className).toContain('good');
    });

    it('applies warning class for latency between 100-499ms', () => {
      const service = createMockService({ latency: 250 });
      const { container } = render(<ServiceHealthCard service={service} />);
      const latencyElement = container.querySelector('[class*="latency"]');
      expect(latencyElement?.className).toContain('warning');
    });

    it('applies warning class for latency at lower boundary (100ms)', () => {
      const service = createMockService({ latency: 100 });
      const { container } = render(<ServiceHealthCard service={service} />);
      const latencyElement = container.querySelector('[class*="latency"]');
      expect(latencyElement?.className).toContain('warning');
    });

    it('applies warning class for latency at upper boundary (499ms)', () => {
      const service = createMockService({ latency: 499 });
      const { container } = render(<ServiceHealthCard service={service} />);
      const latencyElement = container.querySelector('[class*="latency"]');
      expect(latencyElement?.className).toContain('warning');
    });

    it('applies critical class for latency 500ms or above', () => {
      const service = createMockService({ latency: 500 });
      const { container } = render(<ServiceHealthCard service={service} />);
      const latencyElement = container.querySelector('[class*="latency"]');
      expect(latencyElement?.className).toContain('critical');
    });

    it('applies critical class for high latency (1000ms)', () => {
      const service = createMockService({ latency: 1000 });
      const { container } = render(<ServiceHealthCard service={service} />);
      const latencyElement = container.querySelector('[class*="latency"]');
      expect(latencyElement?.className).toContain('critical');
    });

    it('handles zero latency', () => {
      const service = createMockService({ latency: 0 });
      render(<ServiceHealthCard service={service} />);
      expect(screen.getByText('0ms')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles service with all fields populated', () => {
      const service: ServiceHealth = {
        name: 'Data Core Service',
        status: 'degraded',
        endpoint: '/api/data/encrypt',
        latency: 350,
        message: 'High load detected',
      };
      render(<ServiceHealthCard service={service} />);
      
      expect(screen.getByText('Data Core Service')).toBeInTheDocument();
      expect(screen.getByText('/api/data/encrypt')).toBeInTheDocument();
      expect(screen.getByText('350ms')).toBeInTheDocument();
      expect(screen.getByText('High load detected')).toBeInTheDocument();
    });

    it('handles service with very long name', () => {
      const service = createMockService({ 
        name: 'Very Long Service Name That Might Overflow The Container' 
      });
      render(<ServiceHealthCard service={service} />);
      expect(screen.getByText('Very Long Service Name That Might Overflow The Container')).toBeInTheDocument();
    });

    it('handles service with special characters in endpoint', () => {
      const service = createMockService({ 
        endpoint: '/api/v2/data?filter=active&sort=desc' 
      });
      render(<ServiceHealthCard service={service} />);
      expect(screen.getByText('/api/v2/data?filter=active&sort=desc')).toBeInTheDocument();
    });

    it('handles service with unicode characters in message', () => {
      const service = createMockService({ 
        message: 'Service unavailable 🔴 Please retry' 
      });
      render(<ServiceHealthCard service={service} />);
      expect(screen.getByText('Service unavailable 🔴 Please retry')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders service card container', () => {
      const service = createMockService();
      const { container } = render(<ServiceHealthCard service={service} />);
      expect(container.querySelector('[class*="serviceCard"]')).toBeInTheDocument();
    });

    it('renders service header section', () => {
      const service = createMockService();
      const { container } = render(<ServiceHealthCard service={service} />);
      expect(container.querySelector('[class*="serviceHeader"]')).toBeInTheDocument();
    });

    it('renders service details section', () => {
      const service = createMockService();
      const { container } = render(<ServiceHealthCard service={service} />);
      expect(container.querySelector('[class*="serviceDetails"]')).toBeInTheDocument();
    });

    it('renders service metrics container', () => {
      const service = createMockService();
      const { container } = render(<ServiceHealthCard service={service} />);
      expect(container.querySelector('[class*="serviceMetrics"]')).toBeInTheDocument();
    });
  });
});
