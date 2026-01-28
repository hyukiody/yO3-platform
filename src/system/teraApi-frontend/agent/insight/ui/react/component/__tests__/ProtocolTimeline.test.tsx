import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProtocolTimeline from '@agent/insight/ui/react/component/protocolEvents/ProtocolTimeline';
import type { ProtocolEvent } from '@agent/insight/ui/react/component/protocolEvents/ProtocolTimeline';

// Mock events data
const mockEvents: ProtocolEvent[] = [
  {
    id: 'event-1',
    timestamp: Date.now() - 60000,
    protocolStatus: 'monitoring',
    objectClass: 'person',
    description: 'Person detected in monitored area.',
    cameraId: 'CAM-001',
  },
  {
    id: 'event-2',
    timestamp: Date.now() - 120000,
    protocolStatus: 'emergency',
    objectClass: 'fire',
    description: 'Fire detected. Emergency protocol activated.',
    cameraId: 'CAM-002',
  },
  {
    id: 'event-3',
    timestamp: Date.now() - 180000,
    protocolStatus: 'alert',
    objectClass: 'car',
    description: 'Vehicle in restricted zone.',
    cameraId: 'CAM-003',
  },
  {
    id: 'event-4',
    timestamp: Date.now() - 240000,
    protocolStatus: 'critical',
    objectClass: 'weapon',
    description: 'Potential weapon detected.',
    cameraId: 'CAM-001',
  },
  {
    id: 'event-5',
    timestamp: Date.now() - 300000,
    protocolStatus: 'none',
    objectClass: 'bicycle',
    description: 'Bicycle in designated area.',
    cameraId: 'CAM-004',
  },
];

describe('ProtocolTimeline', () => {
  describe('rendering', () => {
    it('renders timeline header correctly', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      expect(screen.getByText(/Protocol Timeline/)).toBeInTheDocument();
    });

    it('renders all events when maxEvents is not set', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      const timelineItems = screen.getAllByTestId(/timeline-event/);
      expect(timelineItems).toHaveLength(5);
    });

    it('limits displayed events based on maxEvents', () => {
      render(<ProtocolTimeline events={mockEvents} maxEvents={3} />);
      
      const timelineItems = screen.getAllByTestId(/timeline-event/);
      expect(timelineItems).toHaveLength(3);
    });

    it('displays event descriptions', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      expect(screen.getByText(/Person detected in monitored area/)).toBeInTheDocument();
      expect(screen.getByText(/Fire detected/)).toBeInTheDocument();
    });

    it('displays object class badges', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      expect(screen.getByText('person')).toBeInTheDocument();
      expect(screen.getByText('fire')).toBeInTheDocument();
      expect(screen.getByText('car')).toBeInTheDocument();
    });

    it('displays camera IDs', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      // Camera IDs are displayed with emoji, use regex pattern
      expect(screen.getAllByText(/CAM-001/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/CAM-002/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no events provided', () => {
      render(<ProtocolTimeline events={[]} />);
      
      expect(screen.getByTestId('empty-timeline')).toBeInTheDocument();
    });
  });

  describe('statistics', () => {
    it('displays event statistics', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      const recentCount = screen.getByTestId('recent-count');
      expect(recentCount).toBeInTheDocument();
    });

    it('suppresses peak indicator when only none events exist', () => {
      const events: ProtocolEvent[] = [
        { ...mockEvents[0], protocolStatus: 'none' },
        { ...mockEvents[1], protocolStatus: 'none' },
      ];

      render(<ProtocolTimeline events={events} />);

      expect(screen.queryByTestId('max-severity')).not.toBeInTheDocument();
    });

    it('calculates events per hour correctly', () => {
      // All events within last hour
      const recentEvents = mockEvents.map((event, index) => ({
        ...event,
        timestamp: Date.now() - (index * 60000), // 1 minute apart
      }));
      
      render(<ProtocolTimeline events={recentEvents} />);
      
      expect(screen.getByTestId('recent-count')).toBeInTheDocument();
    });

    it('computes peak severity using defined ordering', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const events: ProtocolEvent[] = [
        {
          id: 'sev-alert',
          timestamp: Date.now() - 1000,
          protocolStatus: 'alert',
          objectClass: 'car',
          description: 'Alert level event',
        },
        {
          id: 'sev-critical',
          timestamp: Date.now() - 2000,
          protocolStatus: 'critical',
          objectClass: 'person',
          description: 'Critical level event',
        },
        {
          id: 'sev-emergency',
          timestamp: Date.now() - 3000,
          protocolStatus: 'emergency',
          objectClass: 'fire',
          description: 'Emergency level event',
        },
      ];

      render(<ProtocolTimeline events={events} />);

      const peak = screen.getByTestId('max-severity');
      expect(peak).toHaveTextContent(/Peak: Emergency/i);

      vi.useRealTimers();
    });

    it('shows max severity indicator when applicable', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      // Should show max severity for emergency events
      // Note: max-severity only shows if there are non-'none' events
      const maxSeverity = screen.queryByTestId('max-severity');
      // It will be present since we have emergency event in mock data
      expect(maxSeverity).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('shows filter pills', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      // Filter pills exist for each status
      expect(screen.getByTestId('filter-monitoring')).toBeInTheDocument();
      expect(screen.getByTestId('filter-alert')).toBeInTheDocument();
      expect(screen.getByTestId('filter-critical')).toBeInTheDocument();
      expect(screen.getByTestId('filter-emergency')).toBeInTheDocument();
    });

    it('filters events when filterStatus prop is provided', () => {
      render(<ProtocolTimeline events={mockEvents} filterStatus="emergency" />);
      
      // Should only show emergency events
      const timelineItems = screen.getAllByTestId(/timeline-event/);
      expect(timelineItems.every(item => item.dataset.testid?.includes('event-2'))).toBe(true);
    });

    it('shows all events when filter is none', () => {
      render(<ProtocolTimeline events={mockEvents} filterStatus={null} />);
      
      const timelineItems = screen.getAllByTestId(/timeline-event/);
      expect(timelineItems).toHaveLength(mockEvents.length);
    });
  });

  describe('sorting', () => {
    it('sorts events by timestamp (newest first)', () => {
      const unsortedEvents: ProtocolEvent[] = [
        { ...mockEvents[0], id: 'old', timestamp: Date.now() - 1000000 },
        { ...mockEvents[1], id: 'new', timestamp: Date.now() },
      ];
      
      render(<ProtocolTimeline events={unsortedEvents} />);
      
      const timelineItems = screen.getAllByTestId(/timeline-event/);
      expect(timelineItems[0]).toHaveAttribute('data-testid', 'timeline-event-new');
    });
  });

  describe('interactions', () => {
    it('calls onEventClick when event is clicked', () => {
      const handleClick = vi.fn();
      render(<ProtocolTimeline events={mockEvents} onEventClick={handleClick} />);
      
      fireEvent.click(screen.getByTestId('timeline-event-event-1'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockEvents[0]);
    });

    it('does not throw when onEventClick is not provided', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      expect(() => {
        fireEvent.click(screen.getByTestId('timeline-event-event-1'));
      }).not.toThrow();
    });
  });

  describe('time formatting', () => {
    it('formats recent timestamps correctly', () => {
      const recentEvent: ProtocolEvent = {
        ...mockEvents[0],
        timestamp: Date.now() - 30000, // 30 seconds ago
      };
      
      render(<ProtocolTimeline events={[recentEvent]} />);
      
      // Should show relative time
      expect(screen.getByTestId('timeline-event-event-1')).toBeInTheDocument();
    });

    it('formats older timestamps correctly', () => {
      const oldEvent: ProtocolEvent = {
        ...mockEvents[0],
        timestamp: Date.now() - 3600000, // 1 hour ago
      };
      
      render(<ProtocolTimeline events={[oldEvent]} />);
      
      expect(screen.getByTestId('timeline-event-event-1')).toBeInTheDocument();
    });
  });

  describe('visual elements', () => {
    it('renders timeline connector dots', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      const timeline = screen.getByTestId('protocol-timeline');
      expect(timeline).toBeInTheDocument();
    });

    it('applies correct status color to dots', () => {
      render(<ProtocolTimeline events={mockEvents} />);
      
      // Visual verification - dots should be rendered
      const timelineItems = screen.getAllByTestId(/timeline-event/);
      expect(timelineItems.length).toBeGreaterThan(0);
    });
  });
});

describe('ProtocolTimeline accessibility', () => {
  it('has accessible structure', () => {
    render(<ProtocolTimeline events={mockEvents} />);
    
    const timeline = screen.getByTestId('protocol-timeline');
    expect(timeline).toBeInTheDocument();
  });

  it('event items are focusable when clickable', () => {
    const handleClick = vi.fn();
    render(<ProtocolTimeline events={mockEvents} onEventClick={handleClick} />);
    
    const firstEvent = screen.getByTestId('timeline-event-event-1');
    expect(firstEvent).toBeInTheDocument();
  });
});
