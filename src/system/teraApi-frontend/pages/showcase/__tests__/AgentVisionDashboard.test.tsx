import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AgentVisionDashboard from '../../../../../pages/showcase/AgentVisionDashboard';

// Wrapper component with Router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AgentVisionDashboard', () => {
  describe('rendering', () => {
    it('renders dashboard header', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByText(/Agent Vision Dashboard/)).toBeInTheDocument();
    });

    it('renders demo banner', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByText(/DEMO MODE/)).toBeInTheDocument();
    });

    it('renders back link to showcase', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByText(/Back to Showcase/)).toBeInTheDocument();
    });

    it('renders control buttons', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByTestId('live-mode-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('simulate-emergency')).toBeInTheDocument();
      expect(screen.getByTestId('clear-data')).toBeInTheDocument();
    });

    it('renders footer stats', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByText('Total Insights')).toBeInTheDocument();
      expect(screen.getByText('Active Protocols')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Active Cameras')).toBeInTheDocument();
    });
  });

  describe('initial data', () => {
    it('generates initial mock insights', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      // Component renders insight panel immediately with initial data
      const insightPanel = screen.getByTestId('agent-insight-panel');
      expect(insightPanel).toBeInTheDocument();
    });

    it('displays initial insights in the panel', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      // Should have generated initial insights (10)
      expect(screen.getByTestId('agent-insight-panel')).toBeInTheDocument();
    });
  });

  describe('live mode', () => {
    it('toggles live mode on button click', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      const toggleButton = screen.getByTestId('live-mode-toggle');
      expect(toggleButton).toHaveTextContent(/Live Mode/);
      
      fireEvent.click(toggleButton);
      
      // After click, should show Pause
      expect(toggleButton).toHaveTextContent(/Pause/);
    });

    it('stops when paused', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      // Enable then disable live mode
      const toggleButton = screen.getByTestId('live-mode-toggle');
      fireEvent.click(toggleButton); // Start
      expect(toggleButton).toHaveTextContent(/Pause/);
      
      fireEvent.click(toggleButton); // Stop
      expect(toggleButton).toHaveTextContent(/Live Mode/);
    });
  });

  describe('emergency simulation', () => {
    it('creates emergency insight on button click', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      fireEvent.click(screen.getByTestId('simulate-emergency'));
      
      // Should show emergency-related content (multiple elements with EMERGENCY text)
      const emergencyElements = screen.getAllByText(/EMERGENCY/);
      expect(emergencyElements.length).toBeGreaterThan(0);
    });

    it('shows emergency insight in detail panel', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      fireEvent.click(screen.getByTestId('simulate-emergency'));
      
      const detailPanel = screen.getByTestId('selected-insight-detail');
      expect(detailPanel).toBeInTheDocument();
    });
  });

  describe('clear data', () => {
    it('clears all insights on clear button click', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      // Initial data should be present
      expect(screen.getByTestId('agent-insight-panel')).toBeInTheDocument();
      
      // Clear data
      fireEvent.click(screen.getByTestId('clear-data'));
      
      // Should show empty state
      expect(screen.getByText(/No agent insights available/)).toBeInTheDocument();
    });

    it('closes detail panel when data is cleared', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      // Simulate emergency to open detail panel
      fireEvent.click(screen.getByTestId('simulate-emergency'));
      expect(screen.getByTestId('selected-insight-detail')).toBeInTheDocument();
      
      // Clear data
      fireEvent.click(screen.getByTestId('clear-data'));
      
      expect(screen.queryByTestId('selected-insight-detail')).not.toBeInTheDocument();
    });
  });

  describe('insight selection', () => {
    it('shows detail panel when insight is clicked', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByTestId('agent-insight-panel')).toBeInTheDocument();
      
      // Click on first insight card
      const insightCards = screen.getAllByTestId(/insight-card/);
      expect(insightCards.length).toBeGreaterThan(0);
      
      fireEvent.click(insightCards[0]);
      
      expect(screen.getByTestId('selected-insight-detail')).toBeInTheDocument();
    });

    it('closes detail panel when close button is clicked', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      // Simulate emergency to open detail panel
      fireEvent.click(screen.getByTestId('simulate-emergency'));
      expect(screen.getByTestId('selected-insight-detail')).toBeInTheDocument();
      
      // Find and click close button
      const closeButton = screen.getByLabelText('Close detail');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('selected-insight-detail')).not.toBeInTheDocument();
    });
  });

  describe('components integration', () => {
    it('renders VisionEngineStatus component', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByTestId('vision-engine-status')).toBeInTheDocument();
    });

    it('renders AgentInsightPanel component', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByTestId('agent-insight-panel')).toBeInTheDocument();
    });

    it('renders ProtocolTimeline component', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByTestId('protocol-timeline')).toBeInTheDocument();
    });
  });

  describe('footer statistics', () => {
    it('displays statistics labels', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      expect(screen.getByText('Total Insights')).toBeInTheDocument();
      expect(screen.getByText('Active Protocols')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Active Cameras')).toBeInTheDocument();
    });

    it('shows numeric statistics values', () => {
      renderWithRouter(<AgentVisionDashboard />);
      
      // Should show count of initial insights (10)
      const statValues = screen.getAllByText(/^\d+$/);
      expect(statValues.length).toBeGreaterThan(0);
    });
  });
});

describe('AgentVisionDashboard accessibility', () => {
  it('has proper heading hierarchy', () => {
    renderWithRouter(<AgentVisionDashboard />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/Agent Vision Dashboard/);
  });

  it('buttons are keyboard accessible', () => {
    renderWithRouter(<AgentVisionDashboard />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    buttons.forEach(button => {
      expect(button).not.toBeDisabled();
    });
  });

  it('links are accessible', () => {
    renderWithRouter(<AgentVisionDashboard />);
    
    const backLink = screen.getByText(/Back to Showcase/);
    expect(backLink).toHaveAttribute('href', '/showcase');
  });
});
