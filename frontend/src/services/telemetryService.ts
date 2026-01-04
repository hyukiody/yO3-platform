/**
 * Telemetry WebSocket Service
 * Manages WebSocket connections to telemetry server
 */

import { HealthData, ApiRequestLog, DataFlowEvent } from '../types/glass-box';

const TELEMETRY_WS_BASE = import.meta.env.VITE_TELEMETRY_WS || 'ws://localhost:9093';

type MessageHandler<T> = (data: T) => void;

class WebSocketClient<T> {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private handlers: Set<MessageHandler<T>> = new Set();
  private isConnecting = false;

  constructor(private endpoint: string) {}

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const url = `${TELEMETRY_WS_BASE}${this.endpoint}`;
    
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`✓ Connected to ${this.endpoint}`);
        this.isConnecting = false;
        this.reconnectDelay = 1000; // Reset delay on successful connection
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as T;
          this.handlers.forEach(handler => handler(data));
        } catch (error) {
          console.error(`Error parsing message from ${this.endpoint}:`, error);
        }
      };

      this.ws.onerror = (error) => {
        console.error(`WebSocket error on ${this.endpoint}:`, error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log(`Disconnected from ${this.endpoint}`);
        this.isConnecting = false;
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error(`Failed to connect to ${this.endpoint}:`, error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = false;
  }

  subscribe(handler: MessageHandler<T>): () => void {
    this.handlers.add(handler);
    
    // Auto-connect on first subscription
    if (this.handlers.size === 1) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.handlers.delete(handler);
      
      // Auto-disconnect when no handlers remain
      if (this.handlers.size === 0) {
        this.disconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
      
      // Exponential backoff
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay
      );
    }, this.reconnectDelay);
  }

  getConnectionState(): 'connecting' | 'open' | 'closed' {
    if (this.isConnecting || this.ws?.readyState === WebSocket.CONNECTING) {
      return 'connecting';
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      return 'open';
    }
    return 'closed';
  }
}

class TelemetryService {
  private healthClient = new WebSocketClient<HealthData>('/ws/health');
  private apiMonitorClient = new WebSocketClient<ApiRequestLog>('/ws/api-monitor');
  private dataFlowClient = new WebSocketClient<DataFlowEvent>('/ws/data-flows');

  /**
   * Subscribe to real-time health updates
   */
  subscribeToHealth(handler: MessageHandler<HealthData>): () => void {
    return this.healthClient.subscribe(handler);
  }

  /**
   * Subscribe to API request monitoring
   */
  subscribeToApiMonitor(handler: MessageHandler<ApiRequestLog>): () => void {
    return this.apiMonitorClient.subscribe(handler);
  }

  /**
   * Subscribe to data flow events
   */
  subscribeToDataFlows(handler: MessageHandler<DataFlowEvent>): () => void {
    return this.dataFlowClient.subscribe(handler);
  }

  /**
   * Get connection states for all clients
   */
  getConnectionStates() {
    return {
      health: this.healthClient.getConnectionState(),
      apiMonitor: this.apiMonitorClient.getConnectionState(),
      dataFlow: this.dataFlowClient.getConnectionState(),
    };
  }

  /**
   * Manually disconnect all clients
   */
  disconnectAll(): void {
    this.healthClient.disconnect();
    this.apiMonitorClient.disconnect();
    this.dataFlowClient.disconnect();
  }
}

export const telemetryService = new TelemetryService();
