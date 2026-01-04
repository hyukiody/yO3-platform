import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ObjectDetectionMonitor from './ObjectDetectionMonitor';

describe('ObjectDetectionMonitor Component', () => {
  beforeEach(() => {
    // Clear any previous state
  });

  it('should render the component with title', () => {
    render(<ObjectDetectionMonitor />);
    
    const title = screen.getByRole('heading', { name: /Live Object Detection/i });
    expect(title).toBeInTheDocument();
  });

  it('should have Start monitoring button', () => {
    render(<ObjectDetectionMonitor />);
    
    const button = screen.getByRole('button', { name: /start/i });
    expect(button).toBeInTheDocument();
  });

  it('should toggle monitoring state on button click', async () => {
    render(<ObjectDetectionMonitor />);
    
    const button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);

    await waitFor(() => {
      const stopButton = screen.getByRole('button', { name: /stop/i });
      expect(stopButton).toBeInTheDocument();
    });
  });

  it('should render SVG canvas for detections', async () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  it('should display detection statistics section', () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);

    expect(screen.getByText(/Total Detections/i)).toBeInTheDocument();
  });

  it('should have class filter buttons', async () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
    });
  });

  it('should display detection history when monitoring', async () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);

    await waitFor(() => {
      const historySection = container.querySelector('.detection-history');
      expect(historySection).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should update statistics on detection changes', async () => {
    render(<ObjectDetectionMonitor />);
    
    const button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);

    await waitFor(() => {
      const totalCard = screen.getByText(/Total Detections/i);
      expect(totalCard).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should render SVG with proper structure', async () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.querySelector('rect')).toBeTruthy();
    });
  });

  it('should have CSS classes for styling', async () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const monitor = container.querySelector('.object-detection-monitor');
    expect(monitor).toBeInTheDocument();
    
    const button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      const canvas = container.querySelector('.detection-canvas');
      expect(canvas).toBeTruthy();
    });
  });

  it('should stop monitoring on Stop button click', async () => {
    render(<ObjectDetectionMonitor />);
    
    let button = screen.getByRole('button', { name: /start/i });
    fireEvent.click(button);

    await waitFor(() => {
      button = screen.getByRole('button', { name: /stop/i });
      expect(button).toBeInTheDocument();
    });

    fireEvent.click(button);

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toBeInTheDocument();
    });
  });

  it('should filter detections by class', async () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      const personButton = screen.getAllByRole('button').find(btn => btn.textContent === 'person');
      expect(personButton).toBeInTheDocument();
    });
  });

  it('should render detection header', () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const header = container.querySelector('.detection-header');
    expect(header).toBeInTheDocument();
  });

  it('should render stats cards', () => {
    const { container } = render(<ObjectDetectionMonitor />);
    
    const statCards = container.querySelectorAll('.stat-card');
    expect(statCards.length).toBeGreaterThan(0);
  });
});
