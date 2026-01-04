/**
 * Detection Event Service
 * Handles real-time detection events via WebSocket/SSE
 * Connects to Stream Processing Service (port 8082)
 */

export interface DetectionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionEventDTO {
  id: string;
  eventId: string;
  cameraId: string;
  deviceId: string;
  eventType: string;
  objectType: string;
  confidence: number;
  bbox?: DetectionBoundingBox;
  timestamp: number;
  zone?: string;
  metadata?: Record<string, any>;
  status: 'PENDING' | 'PROCESSED' | 'ARCHIVED';
}

export interface DetectionSubscriptionOptions {
  cameraId?: string;
  deviceId?: string;
  eventType?: string;
  minConfidence?: number;
  videoElement?: HTMLVideoElement;
}

type DetectionEventCallback = (event: DetectionEventDTO) => void;
type ErrorCallback = (error: Error) => void;

/**
 * Detection Event Service
 * Provides WebSocket connection to backend for real-time detection events
 */
class DetectionEventService {
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private reconnectTimer: number | null = null;
  private subscribers: Map<string, DetectionEventCallback> = new Map();
  private errorHandlers: Set<ErrorCallback> = new Set();
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private useSSE = false; // Toggle between WebSocket and SSE

  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_STREAM_PROCESSING_URL || 'http://localhost:8082';
  }

  /**
   * Connect to detection event stream
   * Uses WebSocket by default, falls back to SSE if WebSocket fails
   */
  connect(options?: DetectionSubscriptionOptions): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      console.warn('Already connected or connecting');
      return;
    }

    this.isConnecting = true;

    // Demo Mode: If WebSocket URL is not available, use mock data
    if (!this.baseUrl || this.baseUrl === 'http://localhost:8082') {
      console.warn('🎯 DEMO MODE: Using mock detection events');
      this.startMockDetections(options);
      return;
    }

    if (this.useSSE) {
      this.connectSSE(options);
    } else {
      this.connectWebSocket(options);
    }
  }

  /**
   * Connect via WebSocket
   */
  private connectWebSocket(options?: DetectionSubscriptionOptions): void {
    try {
      const wsUrl = this.buildWebSocketUrl(options);
      const token = localStorage.getItem('token');

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✓ Connected to detection event stream (WebSocket)');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Send authentication
        if (token) {
          this.ws?.send(JSON.stringify({ type: 'AUTH', token }));
        }

        // Send subscription filters
        if (options) {
          this.ws?.send(JSON.stringify({ type: 'SUBSCRIBE', filters: options }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'DETECTION_EVENT') {
            const detectionEvent = this.parseDetectionEvent(data.payload);
            this.notifySubscribers(detectionEvent);
          } else if (data.type === 'ERROR') {
            this.handleError(new Error(data.message));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.warn('WebSocket connection closed');
        this.isConnecting = false;
        this.ws = null;
        this.attemptReconnect(options);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      // Fallback to SSE
      this.useSSE = true;
      this.connectSSE(options);
    }
  }

  /**
   * Connect via Server-Sent Events (SSE)
   */
  private connectSSE(options?: DetectionSubscriptionOptions): void {
    try {
      const sseUrl = this.buildSSEUrl(options);
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('✓ Connected to detection event stream (SSE)');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.eventSource.addEventListener('detection', (event) => {
        try {
          const data = JSON.parse(event.data);
          const detectionEvent = this.parseDetectionEvent(data);
          this.notifySubscribers(detectionEvent);
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      });

      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        this.eventSource?.close();
        this.eventSource = null;
        this.isConnecting = false;
        this.attemptReconnect(options);
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.isConnecting = false;
      this.handleError(new Error('Failed to connect to detection stream'));
    }
  }

  /**
   * Build WebSocket URL with query parameters
   */
  private buildWebSocketUrl(options?: DetectionSubscriptionOptions): string {
    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const baseWsUrl = this.baseUrl.replace(/^https?/, wsProtocol);
    const url = new URL('/ws/detections', baseWsUrl);

    if (options?.cameraId) url.searchParams.set('cameraId', options.cameraId);
    if (options?.deviceId) url.searchParams.set('deviceId', options.deviceId);
    if (options?.eventType) url.searchParams.set('eventType', options.eventType);
    if (options?.minConfidence) url.searchParams.set('minConfidence', options.minConfidence.toString());

    return url.toString();
  }

  /**
   * Build SSE URL with query parameters
   */
  private buildSSEUrl(options?: DetectionSubscriptionOptions): string {
    const url = new URL('/api/detections/stream', this.baseUrl);
    const token = localStorage.getItem('token');

    if (token) url.searchParams.set('token', token);
    if (options?.cameraId) url.searchParams.set('cameraId', options.cameraId);
    if (options?.deviceId) url.searchParams.set('deviceId', options.deviceId);
    if (options?.eventType) url.searchParams.set('eventType', options.eventType);
    if (options?.minConfidence) url.searchParams.set('minConfidence', options.minConfidence.toString());

    return url.toString();
  }

  /**
   * Parse backend detection event to frontend DTO
   */
  private parseDetectionEvent(data: any): DetectionEventDTO {
    return {
      id: data.id?.toString() || data.eventId,
      eventId: data.eventId,
      cameraId: data.source?.deviceId || data.cameraId,
      deviceId: data.source?.deviceId || data.deviceId,
      eventType: data.eventType || data.objectType,
      objectType: data.eventType || data.objectType,
      confidence: data.confidence,
      bbox: data.bboxX !== undefined ? {
        x: data.bboxX / 1000, // Normalize to 0-1
        y: data.bboxY / 1000,
        width: data.bboxWidth / 1000,
        height: data.bboxHeight / 1000,
      } : undefined,
      timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
      zone: data.metadata?.zone || data.zone,
      metadata: data.metadata,
      status: data.status || 'PENDING',
    };
  }

  /**
   * Subscribe to detection events
   */
  subscribe(subscriberId: string, callback: DetectionEventCallback): void {
    this.subscribers.set(subscriberId, callback);
  }

  /**
   * Unsubscribe from detection events
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorCallback): void {
    this.errorHandlers.add(handler);
  }

  /**
   * Remove error handler
   */
  offError(handler: ErrorCallback): void {
    this.errorHandlers.delete(handler);
  }

  /**
   * Notify all subscribers of new detection event
   */
  private notifySubscribers(event: DetectionEventDTO): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(options?: DetectionSubscriptionOptions): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.handleError(new Error('Failed to connect after multiple attempts'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect(options);
    }, delay);
  }

  /**
   * Disconnect from detection event stream
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.mockDetectionTimer) {
      clearTimeout(this.mockDetectionTimer);
      this.mockDetectionTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.subscribers.clear();
    this.errorHandlers.clear();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Start mock detection events for demo mode
   */
  private mockDetectionTimer: number | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  private startMockDetections(options?: DetectionSubscriptionOptions): void {
    this.isConnecting = false;
    this.videoElement = options?.videoElement || null;
    
    const minConfidence = options?.minConfidence || 0.6;

    // Pre-defined detection patterns based on common video content
    // These patterns simulate realistic object tracking in typical surveillance footage
    const detectionPatterns = [
      // Pattern 1: Person walking from left to right (center frame)
      { objectType: 'person', x: 0.2, y: 0.4, width: 0.15, height: 0.35, confidence: 0.92 },
      { objectType: 'person', x: 0.35, y: 0.4, width: 0.15, height: 0.35, confidence: 0.94 },
      { objectType: 'person', x: 0.5, y: 0.4, width: 0.15, height: 0.35, confidence: 0.93 },
      { objectType: 'person', x: 0.65, y: 0.4, width: 0.15, height: 0.35, confidence: 0.91 },
      
      // Pattern 2: Car moving through frame
      { objectType: 'car', x: 0.1, y: 0.5, width: 0.25, height: 0.2, confidence: 0.89 },
      { objectType: 'car', x: 0.3, y: 0.5, width: 0.25, height: 0.2, confidence: 0.91 },
      { objectType: 'car', x: 0.5, y: 0.5, width: 0.25, height: 0.2, confidence: 0.93 },
      
      // Pattern 3: Multiple objects - person with backpack
      { objectType: 'person', x: 0.4, y: 0.3, width: 0.12, height: 0.3, confidence: 0.88 },
      { objectType: 'backpack', x: 0.43, y: 0.42, width: 0.08, height: 0.12, confidence: 0.76 },
      
      // Pattern 4: Bicycle rider
      { objectType: 'bicycle', x: 0.3, y: 0.45, width: 0.18, height: 0.25, confidence: 0.87 },
      { objectType: 'person', x: 0.32, y: 0.35, width: 0.14, height: 0.28, confidence: 0.90 },
      
      // Pattern 5: Pet detection
      { objectType: 'dog', x: 0.6, y: 0.65, width: 0.15, height: 0.15, confidence: 0.85 },
      { objectType: 'cat', x: 0.15, y: 0.7, width: 0.12, height: 0.12, confidence: 0.82 },
      
      // Pattern 6: Stationary objects
      { objectType: 'backpack', x: 0.75, y: 0.6, width: 0.1, height: 0.15, confidence: 0.79 },
      { objectType: 'bicycle', x: 0.05, y: 0.55, width: 0.15, height: 0.2, confidence: 0.84 },
    ];

    let patternIndex = 0;

    // Generate mock detection events based on video playback
    const generateMockEvent = () => {
      // If video is available, use its current time to create realistic detection patterns
      const videoTime = this.videoElement?.currentTime || 0;
      const videoDuration = this.videoElement?.duration || 10;
      
      // Rotate through patterns based on video time
      const timeBasedIndex = Math.floor((videoTime / videoDuration) * detectionPatterns.length);
      patternIndex = timeBasedIndex % detectionPatterns.length;
      
      // Get the current pattern
      const pattern = detectionPatterns[patternIndex];
      
      // Add slight random variation to make it more realistic (±5% movement)
      const variation = 0.05;
      const x = Math.max(0, Math.min(0.85, pattern.x + (Math.random() - 0.5) * variation));
      const y = Math.max(0, Math.min(0.85, pattern.y + (Math.random() - 0.5) * variation));
      const width = Math.max(0.05, Math.min(0.3, pattern.width + (Math.random() - 0.5) * variation * 0.5));
      const height = Math.max(0.05, Math.min(0.4, pattern.height + (Math.random() - 0.5) * variation * 0.5));
      
      // Slight confidence variation
      const confidence = Math.max(minConfidence, Math.min(0.99, pattern.confidence + (Math.random() - 0.5) * 0.05));
      
      const mockEvent: DetectionEventDTO = {
        id: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        eventId: `evt-${Date.now()}`,
        cameraId: options?.cameraId || 'demo-camera-01',
        deviceId: options?.deviceId || 'demo-device-01',
        eventType: 'OBJECT_DETECTED',
        objectType: pattern.objectType,
        confidence: confidence,
        bbox: { x, y, width, height },
        timestamp: Date.now(),
        status: 'PROCESSED',
      };

      // Emit to all subscribers
      this.subscribers.forEach((callback) => {
        try {
          callback(mockEvent);
        } catch (err) {
          console.error('Error in detection subscriber:', err);
        }
      });

      // Schedule next event - vary timing based on video playback
      const nextDelay = 800 + Math.random() * 600; // 800-1400ms
      this.mockDetectionTimer = window.setTimeout(generateMockEvent, nextDelay);
    };

    // Start generating events
    generateMockEvent();
    console.log('🎯 Mock detection events started (video-synchronized mode)');
  }
}

// Export singleton instance
export const detectionEventService = new DetectionEventService();

export default detectionEventService;
