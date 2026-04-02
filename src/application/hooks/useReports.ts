import { useQuery, UseQueryResult } from '@tanstack/react-query';

interface EventLog {
  eventId: string;
  type: string;
  deviceId: string;
  timestamp: string;
  confidence: number;
}

interface Report {
  id: string;
  reportId: string;
  timeWindow: string;
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recurrencePattern: string;
  generatedAt: string;
  startTime: string;
  endTime: string;
  eventLogs: EventLog[];
}

/**
 * Hook para buscar relatórios disponíveis
 */
export const useReports = (token: string): UseQueryResult<Report[]> => {
  return useQuery({
    queryKey: ['reports', token],
    queryFn: async () => {
      const response = await fetch('/api/v1/reports/available', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      return data || [];
    },
    enabled: !!token, // Só executa a query se houver token
    retry: 1,
  });
};
