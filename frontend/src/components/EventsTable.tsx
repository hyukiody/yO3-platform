import React, { useState, useMemo } from 'react';
import { useEvents, useEventStatistics } from '../hooks/useEvents';
import { requestLogger } from '../services/requestLogger';
import styles from './EventsTable.module.css';

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

interface EventFilter {
  cameraId?: string;
  detectionClass?: string;
  confidenceThreshold?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export const EventsTable: React.FC = () => {
  const [filters, setFilters] = useState<EventFilter>({
    confidenceThreshold: 0.6,
    page: 0,
    size: 20,
    sort: 'eventTimestamp,desc',
  });

  // Usar React Query para buscar eventos e estatísticas
  const { data: eventsData, isLoading, error, refetch } = useEvents(filters);
  const { data: statsData } = useEventStatistics();

  const stats = statsData?.statistics;
  const events = eventsData?.events || [];
  const pagination = eventsData ? {
    currentPage: eventsData.currentPage,
    totalItems: eventsData.totalItems,
    totalPages: eventsData.totalPages,
    pageSize: eventsData.pageSize,
    hasNext: eventsData.hasNext,
    hasPrevious: eventsData.hasPrevious,
  } : null;

  // Detection class colors for UI
  const classColors: { [key: string]: string } = {
    person: '#FF6B6B',      // Red
    car: '#4ECDC4',         // Teal
    dog: '#FFE66D',         // Yellow
    bicycle: '#95E1D3',     // Mint
    backpack: '#C7CEEA',    // Lavender
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters: Partial<EventFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 0 })); // Reset to first page on filter change
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  /**
   * Get color for detection class
   */
  const getClassColor = (detectionClass: string): string => {
    return classColors[detectionClass.toLowerCase()] || '#999';
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Detection Events</h2>
        <button className={styles.refreshBtn} onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Statistics Panel */}
      {stats && (
        <div className={styles.statsPanel}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Events</span>
            <span className={styles.statValue}>{stats.totalEvents || 0}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Most Common</span>
            <span className={styles.statValue}>{stats.mostCommonClass || 'N/A'}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Avg Confidence</span>
            <span className={styles.statValue}>
              {stats.averageConfidence ? (stats.averageConfidence * 100).toFixed(1) + '%' : 'N/A'}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Encrypted Events</span>
            <span className={styles.statValue}>{stats.encryptedEventCount || 0}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filterPanel}>
        <div className={styles.filterGroup}>
          <label>Detection Class</label>
          <select
            value={filters.detectionClass || 'all'}
            onChange={(e) => handleFilterChange({ detectionClass: e.target.value || undefined })}
          >
            <option value="all">All Classes</option>
            <option value="person">Person</option>
            <option value="car">Car</option>
            <option value="dog">Dog</option>
            <option value="bicycle">Bicycle</option>
            <option value="backpack">Backpack</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Confidence Threshold</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={filters.confidenceThreshold || 0.6}
            onChange={(e) => handleFilterChange({ confidenceThreshold: parseFloat(e.target.value) })}
          />
          <span>{((filters.confidenceThreshold || 0.6) * 100).toFixed(0)}%</span>
        </div>

        <div className={styles.filterGroup}>
          <label>Camera ID</label>
          <input
            type="text"
            placeholder="Filter by camera ID..."
            value={filters.cameraId || ''}
            onChange={(e) => handleFilterChange({ cameraId: e.target.value || undefined })}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Page Size</label>
          <select
            value={filters.size || 20}
            onChange={(e) => handleFilterChange({ size: parseInt(e.target.value) })}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          ❌ {error.message}
        </div>
      )}

      {/* Events Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Camera</th>
              <th>Detection Class</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Frame ID</th>
              <th>Encrypted</th>
            </tr>
          </thead>
          <tbody>
            {events.length > 0 ? (
              events.map((event) => (
                <tr key={event.id} className={styles.eventRow}>
                  <td className={styles.timestamp}>
                    {formatTimestamp(event.eventTimestamp)}
                  </td>
                  <td className={styles.camera}>
                    {event.cameraId}
                  </td>
                  <td className={styles.class}>
                    <span
                      className={styles.classBadge}
                      style={{ backgroundColor: getClassColor(event.detectionClass) }}
                    >
                      {event.detectionClass}
                    </span>
                  </td>
                  <td className={styles.confidence}>
                    <div className={styles.confidenceBar}>
                      <div
                        className={styles.confidenceFill}
                        style={{ width: `${event.confidence * 100}%` }}
                      />
                      <span className={styles.confidenceText}>
                        {(event.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className={styles.status}>
                    <span className={`${styles.statusBadge} ${styles[event.status.toLowerCase()]}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className={styles.frameId}>
                    #{event.frameId}
                  </td>
                  <td className={styles.encrypted}>
                    {event.isEncrypted ? '🔒' : '🔓'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={styles.noData}>
                  {isLoading ? 'Loading events...' : 'No events found matching filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className={styles.paginationControls}>
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevious || isLoading}
            className={styles.paginationBtn}
          >
            ← Previous
          </button>
          
          <div className={styles.paginationInfo}>
            <span>
              Page {pagination.currentPage + 1} of {pagination.totalPages}
            </span>
            <span className={styles.separator}>|</span>
            <span>
              {pagination.totalItems} total events
            </span>
          </div>

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNext || isLoading}
            className={styles.paginationBtn}
          >
            Next →
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className={styles.footer}>
        <span>
          Showing {events.length} events
          {pagination && ` (${pagination.currentPage * pagination.pageSize + 1}-${Math.min((pagination.currentPage + 1) * pagination.pageSize, pagination.totalItems)} of ${pagination.totalItems})`}
        </span>
      </div>
    </div>
  );
};

export default EventsTable;
