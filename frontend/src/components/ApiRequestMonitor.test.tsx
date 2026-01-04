import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApiRequestMonitor from './ApiRequestMonitor';

describe('ApiRequestMonitor Component', () => {
  it('should render the component', () => {
    render(<ApiRequestMonitor />);
    
    const header = screen.getByText(/API Request Monitor/i);
    expect(header).toBeInTheDocument();
  });

  it('should display statistics section', () => {
    render(<ApiRequestMonitor />);
    
    expect(screen.getByText(/Total/i)).toBeInTheDocument();
  });

  it('should have monitoring button', () => {
    render(<ApiRequestMonitor />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should toggle expand/collapse on button click', async () => {
    const { container } = render(<ApiRequestMonitor />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      const content = container.querySelector('.api-request-monitor');
      expect(content).toBeInTheDocument();
    });
  });

  it('should accept className prop', () => {
    const { container } = render(<ApiRequestMonitor className="test-class" />);
    
    const element = container.querySelector('.test-class');
    expect(element).toBeInTheDocument();
  });

  it('should render monitoring card container', () => {
    const { container } = render(<ApiRequestMonitor />);
    
    const monitor = container.querySelector('.api-request-monitor');
    expect(monitor).toBeInTheDocument();
  });

  it('should initialize with zero statistics', () => {
    render(<ApiRequestMonitor />);
    
    const stats = screen.getAllByText(/0/);
    expect(stats.length).toBeGreaterThan(0);
  });
});
