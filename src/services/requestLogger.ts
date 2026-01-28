// API Request Logger Service
export interface ApiRequest {
  id: string;
  timestamp: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  port: string;
  endpoint: string;
  status?: number;
  statusText?: string;
  responseTime: number;
  headers?: Record<string, string>;
  success: boolean;
  message?: string;
}

class RequestLoggerService {
  private logs: ApiRequest[] = [];
  private maxLogs = 100;
  private listeners: ((logs: ApiRequest[]) => void)[] = [];
  private requestId = 0;

  /**
   * Log an API request
   */
  logRequest(
    method: ApiRequest['method'],
    url: string,
    status: number | undefined,
    statusText: string | undefined,
    responseTime: number,
    headers?: Record<string, string>
  ): ApiRequest {
    const urlObj = new URL(url, 'http://localhost');
    const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
    const endpoint = urlObj.pathname + urlObj.search;

    const request: ApiRequest = {
      id: `${++this.requestId}`,
      timestamp: Date.now(),
      method,
      url,
      port,
      endpoint,
      status,
      statusText,
      responseTime,
      headers,
      success: status ? status >= 200 && status < 300 : false,
    };

    this.logs.unshift(request);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.notifyListeners();
    return request;
  }

  /**
   * Get all logged requests
   */
  getLogs(): ApiRequest[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }

  /**
   * Subscribe to log changes
   */
  subscribe(callback: (logs: ApiRequest[]) => void): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getLogs()));
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.logs.length;
    const successful = this.logs.filter((l) => l.success).length;
    const failed = total - successful;
    const avgResponseTime = total > 0 
      ? Math.round(this.logs.reduce((sum, l) => sum + l.responseTime, 0) / total) 
      : 0;

    return { total, successful, failed, avgResponseTime };
  }

  /**
   * Get logs by port
   */
  getLogsByPort(port: string): ApiRequest[] {
    return this.logs.filter((l) => l.port === port);
  }

  /**
   * Get logs by status
   */
  getLogsByStatus(success: boolean): ApiRequest[] {
    return this.logs.filter((l) => l.success === success);
  }
}

export const requestLogger = new RequestLoggerService();

/**
 * Intercept fetch requests to log API calls
 */
export function initializeFetchInterception() {
  const originalFetch = window.fetch;

  window.fetch = function (...args) {
    const [resource, config] = args as [RequestInfo | URL, RequestInit?];
    const startTime = performance.now();
    const url = typeof resource === 'string' ? resource : resource.toString();
    const method = (config?.method?.toUpperCase() || 'GET') as ApiRequest['method'];
    const headers = config?.headers as Record<string, string> | undefined;

    return originalFetch.apply(window, args as Parameters<typeof fetch>)
      .then((response) => {
        const responseTime = Math.round(performance.now() - startTime);
        requestLogger.logRequest(
          method,
          url,
          response.status,
          response.statusText,
          responseTime,
          headers
        );
        return response;
      })
      .catch((error) => {
        const responseTime = Math.round(performance.now() - startTime);
        requestLogger.logRequest(
          method,
          url,
          undefined,
          error.message,
          responseTime,
          headers
        );
        throw error;
      });
  };
}
