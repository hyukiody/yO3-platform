import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requestLogger, initializeFetchInterception } from './requestLogger';

describe('RequestLoggerService', () => {
  beforeEach(() => {
    // Clear logs before each test
    requestLogger.clearLogs();
  });

  describe('logRequest', () => {
    it('should log a request with correct metadata', () => {
      const request = requestLogger.logRequest(
        'POST',
        'http://localhost:8081/api/auth/login',
        200,
        'OK',
        234,
        { 'Content-Type': 'application/json' }
      );

      expect(request).toBeDefined();
      expect(request.method).toBe('POST');
      expect(request.status).toBe(200);
      expect(request.responseTime).toBe(234);
      expect(request.success).toBe(true);
    });

    it('should extract port from URL correctly', () => {
      const request = requestLogger.logRequest(
        'GET',
        'http://localhost:8082/api/stream/status',
        200,
        'OK',
        100
      );

      expect(request.port).toBe('8082');
      expect(request.endpoint).toContain('/api/stream/status');
    });

    it('should mark failed requests correctly', () => {
      const request = requestLogger.logRequest(
        'GET',
        'http://localhost:9090/api/data',
        500,
        'Internal Server Error',
        150
      );

      expect(request.success).toBe(false);
    });

    it('should maintain circular buffer limit', () => {
      // Log 150 requests (exceeds 100 limit)
      for (let i = 0; i < 150; i++) {
        requestLogger.logRequest(
          'GET',
          `http://localhost:8080/api/request-${i}`,
          200,
          'OK',
          50
        );
      }

      const logs = requestLogger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('should store newest requests first in buffer', () => {
      requestLogger.logRequest('GET', 'http://localhost:8080/api/first', 200, 'OK', 50);
      requestLogger.logRequest('GET', 'http://localhost:8080/api/second', 200, 'OK', 50);
      requestLogger.logRequest('GET', 'http://localhost:8080/api/third', 200, 'OK', 50);

      const logs = requestLogger.getLogs();
      expect(logs[0].endpoint).toContain('third');
      expect(logs[1].endpoint).toContain('second');
      expect(logs[2].endpoint).toContain('first');
    });
  });

  describe('getLogs', () => {
    it('should return empty array initially', () => {
      const logs = requestLogger.getLogs();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });

    it('should return all logged requests', () => {
      requestLogger.logRequest('GET', 'http://localhost:8080/api/health', 200, 'OK', 50);
      requestLogger.logRequest('POST', 'http://localhost:8081/api/login', 200, 'OK', 100);

      const logs = requestLogger.getLogs();
      expect(logs.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      requestLogger.logRequest('GET', 'http://localhost:8080/api/1', 200, 'OK', 50);
      requestLogger.logRequest('GET', 'http://localhost:8080/api/2', 200, 'OK', 100);
      requestLogger.logRequest('GET', 'http://localhost:8080/api/3', 500, 'Error', 150);

      const stats = requestLogger.getStats();

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.avgResponseTime).toBe(100); // (50 + 100 + 150) / 3
    });

    it('should handle empty logs gracefully', () => {
      const stats = requestLogger.getStats();
      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.avgResponseTime).toBe(0);
    });

    it('should calculate only 2xx status codes as successful', () => {
      requestLogger.logRequest('GET', 'http://localhost:8080/api/1', 200, 'OK', 50);
      requestLogger.logRequest('GET', 'http://localhost:8080/api/2', 201, 'Created', 50);
      requestLogger.logRequest('GET', 'http://localhost:8080/api/3', 301, 'Redirect', 50);
      requestLogger.logRequest('GET', 'http://localhost:8080/api/4', 400, 'Bad Request', 50);

      const stats = requestLogger.getStats();
      expect(stats.successful).toBe(2); // Only 200 and 201
      expect(stats.failed).toBe(2); // 301 and 400
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers on new log', () => {
      const callback = vi.fn();
      requestLogger.subscribe(callback);

      requestLogger.logRequest('GET', 'http://localhost:8080/api/test', 200, 'OK', 50);

      expect(callback).toHaveBeenCalled();
      const logs = callback.mock.calls[0][0];
      expect(logs.length).toBe(1);
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = requestLogger.subscribe(callback);

      requestLogger.logRequest('GET', 'http://localhost:8080/api/1', 200, 'OK', 50);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      requestLogger.logRequest('GET', 'http://localhost:8080/api/2', 200, 'OK', 50);
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should support multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      requestLogger.subscribe(callback1);
      requestLogger.subscribe(callback2);

      requestLogger.logRequest('GET', 'http://localhost:8080/api/test', 200, 'OK', 50);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs and notify subscribers', () => {
      const callback = vi.fn();
      requestLogger.subscribe(callback);

      requestLogger.logRequest('GET', 'http://localhost:8080/api/1', 200, 'OK', 50);
      requestLogger.logRequest('GET', 'http://localhost:8080/api/2', 200, 'OK', 50);

      callback.mockClear();

      requestLogger.clearLogs();

      expect(requestLogger.getLogs().length).toBe(0);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('initializeFetchInterception', () => {
    it('should be a function', () => {
      expect(typeof initializeFetchInterception).toBe('function');
    });
  });
});
