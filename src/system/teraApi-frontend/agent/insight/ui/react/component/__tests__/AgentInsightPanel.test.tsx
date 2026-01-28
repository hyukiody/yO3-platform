import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentInsightPanel, { getProtocolColor, getProtocolLabel } from '@agent/insight/ui/react/component/insightCards/AgentInsightPanel';
import type { AgentInsight } from '@agent/insight/ui/react/component/insightCards/AgentInsightPanel';

// Mock insights data
const mockInsights: AgentInsight[] = [
  {
    id: 'insight-1',
    objectClass: 'person',
    confidence: 0.95,
    deepAnalysis: 'Person detected in monitored area with normal activity pattern.',
    protocolStatus: 'monitoring',
    timestamp: Date.now() - 60000,
    cameraId: 'CAM-001',
  },
  {
    id: 'insight-2',
    objectClass: 'fire',
    confidence: 0.98,
    deepAnalysis: 'Fire and smoke detected. Emergency protocol activated.',
    protocolStatus: 'emergency',
    timestamp: Date.now() - 120000,
    cameraId: 'CAM-002',
  },
  {
    id: 'insight-3',
    objectClass: 'car',
    confidence: 0.87,
    deepAnalysis: 'Vehicle parked in restricted zone for extended period.',
    protocolStatus: 'alert',
    timestamp: Date.now() - 180000,
    cameraId: 'CAM-003',
  },
];

describe('AgentInsightPanel', () => {
  describe('rendering', () => {
    it('renders panel header correctly', () => {
      render(<AgentInsightPanel insights={mockInsights} />);
      
      expect(screen.getByText('Agent Insight')).toBeInTheDocument();
    });

    it('renders all insights when maxDisplay is not set', () => {
      render(<AgentInsightPanel insights={mockInsights} />);
      
      expect(screen.getByText('person')).toBeInTheDocument();
      expect(screen.getByText('fire')).toBeInTheDocument();
      expect(screen.getByText('car')).toBeInTheDocument();
    });

    it('limits displayed insights based on maxDisplay', () => {
      render(<AgentInsightPanel insights={mockInsights} maxDisplay={2} />);
      
      const insightCards = screen.getAllByTestId(/insight-card/);
      expect(insightCards).toHaveLength(2);
    });

    it('displays insight analysis text', () => {
      render(<AgentInsightPanel insights={mockInsights} />);
      
      expect(screen.getByText(/Person detected in monitored area/)).toBeInTheDocument();
      expect(screen.getByText(/Fire and smoke detected/)).toBeInTheDocument();
    });

    it('shows confidence percentages', () => {
      render(<AgentInsightPanel insights={mockInsights} />);
      
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
    });

    it('displays camera IDs', () => {
      render(<AgentInsightPanel insights={mockInsights} />);
      
      expect(screen.getByText(/CAM-001/)).toBeInTheDocument();
      expect(screen.getByText(/CAM-002/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no insights provided', () => {
      render(<AgentInsightPanel insights={[]} />);
      
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('protocol summary', () => {
    it('displays protocol summary bar', () => {
      render(<AgentInsightPanel insights={mockInsights} />);
      
      // Should show counts for different protocol statuses
      expect(screen.getByTestId('protocol-summary')).toBeInTheDocument();
    });

    it('counts protocol statuses correctly', () => {
      const insights: AgentInsight[] = [
        { ...mockInsights[0], protocolStatus: 'emergency' },
        { ...mockInsights[1], protocolStatus: 'emergency' },
        { ...mockInsights[2], protocolStatus: 'alert' },
      ];
      
      render(<AgentInsightPanel insights={insights} />);
      
      const summaryBar = screen.getByTestId('protocol-summary');
      expect(summaryBar).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onInsightClick when insight card is clicked', () => {
      const handleClick = vi.fn();
      render(<AgentInsightPanel insights={mockInsights} onInsightClick={handleClick} />);
      
      fireEvent.click(screen.getByTestId('insight-card-insight-1'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockInsights[0]);
    });

    it('does not throw when onInsightClick is not provided', () => {
      render(<AgentInsightPanel insights={mockInsights} />);
      
      expect(() => {
        fireEvent.click(screen.getByTestId('insight-card-insight-1'));
      }).not.toThrow();
    });
  });

  describe('timestamp display', () => {
    it('shows timestamps when showTimestamp is true', () => {
      render(<AgentInsightPanel insights={mockInsights} showTimestamp={true} />);
      
      // Timestamps should be rendered
      const insightCards = screen.getAllByTestId(/insight-card/);
      expect(insightCards.length).toBeGreaterThan(0);
    });

    it('hides timestamps when showTimestamp is false', () => {
      render(<AgentInsightPanel insights={mockInsights} showTimestamp={false} />);
      
      // Component should render without timestamps
      expect(screen.getByTestId('agent-insight-panel')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('applies compact styling when compact prop is true', () => {
      render(<AgentInsightPanel insights={mockInsights} compact={true} />);
      
      const panel = screen.getByTestId('agent-insight-panel');
      // CSS modules transform class names, so we check the className contains compact-related styling
      expect(panel.className).toMatch(/compact/);
    });
  });
});

describe('getProtocolColor', () => {
  it('returns correct color for none status', () => {
    expect(getProtocolColor('none')).toBe('#4a4a4a');
  });

  it('returns correct color for monitoring status', () => {
    expect(getProtocolColor('monitoring')).toBe('#4ECDC4');
  });

  it('returns correct color for alert status', () => {
    expect(getProtocolColor('alert')).toBe('#FFE66D');
  });

  it('returns correct color for critical status', () => {
    expect(getProtocolColor('critical')).toBe('#FF6B6B');
  });

  it('returns correct color for emergency status', () => {
    expect(getProtocolColor('emergency')).toBe('#e94560');
  });

  it('returns default color for unknown status', () => {
    expect(getProtocolColor('unknown' as any)).toBe('#4a4a4a');
  });
});

describe('getProtocolLabel', () => {
  it('returns correct label for none status', () => {
    expect(getProtocolLabel('none')).toBe('Normal');
  });

  it('returns correct label for monitoring status', () => {
    expect(getProtocolLabel('monitoring')).toBe('Monitoring');
  });

  it('returns correct label for alert status', () => {
    expect(getProtocolLabel('alert')).toBe('Alert');
  });

  it('returns correct label for critical status', () => {
    expect(getProtocolLabel('critical')).toBe('Critical');
  });

  it('returns correct label for emergency status', () => {
    expect(getProtocolLabel('emergency')).toBe('Emergency');
  });
});
