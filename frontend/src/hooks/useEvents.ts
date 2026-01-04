import { useQuery, UseQueryResult } from '@tanstack/react-query';

interface DetectionEvent {
  id: number;
  eventId: string;
  eventTimestamp: string;
  cameraId: string;
  frameId: number;
  detectionClass: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  status: string;
  isEncrypted: boolean;
  createdAt: string;
}

interface EventsResponse {
  success: boolean;
  events: DetectionEvent[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface EventsFilter {
  page?: number;
  size?: number;
  sort?: string;
  cameraId?: string;
  detectionClass?: string;
  confidenceThreshold?: number;
  startTime?: string;
  endTime?: string;
}

interface EventStatistics {
  totalEvents: number;
  mostCommonClass: string;
  averageConfidence: number;
  encryptedEventCount: number;
  failedEventCount: number;
}

/**
 * Hook para buscar eventos com paginação
 */
export const useEvents = (filters: EventsFilter = {}): UseQueryResult<EventsResponse> => {
  const params = new URLSearchParams();
  
  if (filters.page !== undefined) params.append('page', filters.page.toString());
  if (filters.size !== undefined) params.append('size', filters.size.toString());
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.cameraId) params.append('cameraId', filters.cameraId);
  if (filters.detectionClass) params.append('detectionClass', filters.detectionClass);
  if (filters.confidenceThreshold) params.append('confidenceThreshold', filters.confidenceThreshold.toString());
  if (filters.startTime) params.append('startTime', filters.startTime);
  if (filters.endTime) params.append('endTime', filters.endTime);

  const queryString = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      const response = await fetch(`/api/events${queryString}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      return response.json();
    },
  });
};

/**
 * Hook para buscar estatísticas de eventos
 */
export const useEventStatistics = (): UseQueryResult<{ success: boolean; statistics: EventStatistics }> => {
  return useQuery({
    queryKey: ['event-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/events/statistics');
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`);
      }
      return response.json();
    },
  });
};
