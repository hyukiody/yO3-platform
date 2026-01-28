import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';
import detectionEventService, { DetectionEventDTO } from '../services/DetectionEventService';

describe('DetectionEventService - End-to-End Integration', () => {
  let mockWebSocket: any;
  let mockEventSource: any;
  let sockets: any[];
  const WS_CONNECTING = 0;
  const WS_OPEN = 1;

  beforeEach(() => {
    // Reset singleton state
    detectionEventService.disconnect();

    // Force non-demo mode so connect() uses WebSocket/SSE paths in tests
    (detectionEventService as any).baseUrl = 'http://example.test:8082';
    (detectionEventService as any).useSSE = false;
    (detectionEventService as any).reconnectAttempts = 0;
    (detectionEventService as any).isConnecting = false;
    
    sockets = [];

    const createMockWebSocket = () => {
      const ws: any = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: WS_CONNECTING,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      };
      sockets.push(ws);
      return ws;
    };

    // Mock EventSource
    mockEventSource = {
      close: vi.fn(),
      readyState: WS_OPEN,
      addEventListener: vi.fn(),
      onopen: null,
      onerror: null,
    };

    global.WebSocket = vi.fn(function(this: any, url: string) {
      const ws = createMockWebSocket();
      mockWebSocket = ws;
      // Copy properties to this for constructor pattern
      Object.assign(this, ws);
      return ws;
    }) as any;
    (global.WebSocket as any).OPEN = WS_OPEN;
    (global.WebSocket as any).CONNECTING = WS_CONNECTING;

    global.EventSource = vi.fn(function(this: any, url: string) {
      // Copy properties to this for constructor pattern
      Object.assign(this, mockEventSource);
      return mockEventSource;
    }) as any;
    (global.EventSource as any).OPEN = WS_OPEN;
  });

  afterEach(() => {
    detectionEventService.disconnect();
    vi.clearAllMocks();
  });

  describe('WebSocket Connection', () => {
    test('should establish WebSocket connection with correct URL', () => {
      // Act
      detectionEventService.connect({ cameraId: 'camera-001' });

      // Assert
      expect(WebSocket).toHaveBeenCalledTimes(1);
      const wsUrl = (WebSocket as any).mock.calls[0][0];
      expect(wsUrl).toContain('/ws/detections');
      expect(wsUrl).toContain('cameraId=camera-001');
    });

    test('should send authentication token on connection', () => {
      // Arrange
      localStorage.setItem('token', 'test-jwt-token');

      // Act
      detectionEventService.connect();
      
      // Get the actual WebSocket instance that was created
      const actualWebSocket = sockets[sockets.length - 1];
      
      // Simulate WebSocket open event
      actualWebSocket.readyState = WS_OPEN;
      actualWebSocket.onopen?.();

      // Assert
      expect(actualWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'AUTH', token: 'test-jwt-token' })
      );
    });

    test('should subscribe with filters', () => {
      // Act
      detectionEventService.connect({
        cameraId: 'camera-001',
        minConfidence: 0.8,
      });

      // Get the actual WebSocket instance
      const actualWebSocket = sockets[sockets.length - 1];

      // Simulate WebSocket open event
      actualWebSocket.readyState = WS_OPEN;
      actualWebSocket.onopen?.();

      // Assert
      const subscribeCall = actualWebSocket.send.mock.calls.find((call: any) => {
        const data = JSON.parse(call[0]);
        return data.type === 'SUBSCRIBE';
      });

      expect(subscribeCall).toBeDefined();
      const subscribeData = JSON.parse(subscribeCall[0]);
      expect(subscribeData.filters.cameraId).toBe('camera-001');
      expect(subscribeData.filters.minConfidence).toBe(0.8);
    });
  });

  describe('Event Reception', () => {
    test('should receive and parse detection events', () => {
      return new Promise<void>((resolve) => {
        // Arrange
        const mockEvent: DetectionEventDTO = {
          id: '1',
          eventId: 'evt-001',
          cameraId: 'camera-001',
          deviceId: 'camera-001',
          eventType: 'person',
          objectType: 'person',
          confidence: 0.95,
          timestamp: Date.now(),
          status: 'PROCESSED',
        };

        // Act
        detectionEventService.connect();
        const actualWebSocket = sockets[sockets.length - 1];
        
        detectionEventService.subscribe('test-subscriber', (event) => {
          // Assert
          expect(event.eventId).toBe('evt-001');
          expect(event.objectType).toBe('person');
          expect(event.confidence).toBe(0.95);
          resolve();
        });

        // Simulate incoming WebSocket message
        actualWebSocket.onmessage?.({
          data: JSON.stringify({
            type: 'DETECTION_EVENT',
            payload: mockEvent,
          }),
        });
      });
    });

    test('should normalize bounding box coordinates', () => {
      return new Promise<void>((resolve) => {
        // Arrange
        const mockBackendEvent = {
          id: 1,
          eventId: 'evt-002',
          eventType: 'car',
          confidence: 0.88,
          bboxX: 150,
          bboxY: 200,
          bboxWidth: 300,
          bboxHeight: 400,
          timestamp: new Date().toISOString(),
          source: { deviceId: 'camera-002' },
          status: 'PROCESSED',
        };

        // Act
        detectionEventService.connect();
        const actualWebSocket = sockets[sockets.length - 1];
        
        detectionEventService.subscribe('test-subscriber', (event) => {
          // Assert
          expect(event.bbox).toBeDefined();
          expect(event.bbox!.x).toBe(0.15); // 150/1000
          expect(event.bbox!.y).toBe(0.2);  // 200/1000
          expect(event.bbox!.width).toBe(0.3);  // 300/1000
          expect(event.bbox!.height).toBe(0.4); // 400/1000
          resolve();
        });

        // Simulate incoming message
        actualWebSocket.onmessage?.({
          data: JSON.stringify({
            type: 'DETECTION_EVENT',
            payload: mockBackendEvent,
          }),
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket errors', () => {
      // Arrange
      const errorHandler = vi.fn();
      detectionEventService.onError(errorHandler);

      // Act
      detectionEventService.connect();
      const actualWebSocket = sockets[sockets.length - 1];

      // Simulate WebSocket error
      actualWebSocket.onerror?.({ message: 'Connection failed' });

      // Assert
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should attempt reconnection on connection close', () => {
      vi.useFakeTimers();

      // Act
      detectionEventService.connect();
      const actualWebSocket = sockets[sockets.length - 1];

      // Simulate WebSocket close
      actualWebSocket.onclose?.();

      // Fast-forward timers to trigger first reconnect (delay = 1000ms * 2^0 = 1000ms)
      vi.advanceTimersByTime(1100);

      // Assert - Should attempt to reconnect
      expect(WebSocket).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    test('should stop reconnection after max attempts', () => {
      vi.useFakeTimers();

      // Act
      detectionEventService.connect();

      // Simulate 5 failed connections
      for (let i = 0; i < 5; i++) {
        // Close current socket, then fast-forward to trigger reconnect attempt
        const currentSocket = sockets[sockets.length - 1];
        currentSocket.onclose?.();
        // Exponential backoff: delay = 1000 * 2^(attempt-1), so 1000, 2000, 4000, 8000, 16000
        vi.advanceTimersByTime(1000 * Math.pow(2, i) + 100);
      }

      // Assert - Should stop after 5 attempts
      expect(WebSocket).toHaveBeenCalledTimes(6); // 1 initial + 5 retries

      vi.useRealTimers();
    });
  });

  describe('Subscription Management', () => {
    test('should manage multiple subscribers', () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      // Act
      detectionEventService.connect();
      const actualWebSocket = sockets[sockets.length - 1];
      
      detectionEventService.subscribe('sub1', subscriber1);
      detectionEventService.subscribe('sub2', subscriber2);

      // Simulate incoming event with complete DetectionEventDTO format
      actualWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'DETECTION_EVENT',
          payload: {
            id: '1',
            eventId: 'evt-003',
            cameraId: 'camera-003',
            deviceId: 'camera-003',
            eventType: 'dog',
            objectType: 'dog',
            confidence: 0.92,
            timestamp: Date.now(),
            status: 'PROCESSED',
          },
        }),
      });

      // Assert
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
    });

    test('should unsubscribe correctly', () => {
      const subscriber = vi.fn();

      // Act
      detectionEventService.connect();
      const actualWebSocket = sockets[sockets.length - 1];
      
      detectionEventService.subscribe('sub1', subscriber);
      detectionEventService.unsubscribe('sub1');

      // Simulate incoming event
      actualWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'DETECTION_EVENT',
          payload: { eventId: 'evt-004' },
        }),
      });

      // Assert
      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe('SSE Fallback', () => {
    test('should fallback to SSE if WebSocket fails', () => {
      // Arrange - Make WebSocket fail
      global.WebSocket = vi.fn(() => {
        throw new Error('WebSocket not supported');
      }) as any;
      (global.WebSocket as any).OPEN = WS_OPEN;

      // Ensure non-demo mode still applies
      (detectionEventService as any).baseUrl = 'http://example.test:8082';

      // Act
      detectionEventService.connect();

      // Assert
      expect(EventSource).toHaveBeenCalledTimes(1);
      const sseUrl = (EventSource as any).mock.calls[0][0];
      expect(sseUrl).toContain('/api/detections/stream');
    });

    test('should receive events via SSE', () => {
      return new Promise<void>((resolve, reject) => {
        // Arrange - Force SSE mode
        global.WebSocket = vi.fn(() => {
          throw new Error('WebSocket not supported');
        }) as any;
        (global.WebSocket as any).OPEN = WS_OPEN;

        // Ensure non-demo mode still applies
        (detectionEventService as any).baseUrl = 'http://example.test:8082';

        const mockEvent = {
          id: '1',
          eventId: 'evt-005',
          cameraId: 'camera-004',
          deviceId: 'camera-004',
          eventType: 'bicycle',
          objectType: 'bicycle',
          confidence: 0.87,
          timestamp: Date.now(),
          status: 'PROCESSED',
        };

        // Subscribe before connecting
        detectionEventService.subscribe('sse-test', (event) => {
          try {
            // Assert
            expect(event.eventId).toBe('evt-005');
            expect(event.objectType).toBe('bicycle');
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        // Act
        detectionEventService.connect();

        // Simulate SSE event
        const detectionListener = mockEventSource.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'detection'
        )?.[1];

        if (detectionListener) {
          detectionListener({
            data: JSON.stringify(mockEvent),
          });
        } else {
          reject(new Error('Detection listener not registered'));
        }
      });
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on disconnect', () => {
      // Act
      detectionEventService.connect();
      
      detectionEventService.subscribe('sub1', vi.fn());
      detectionEventService.subscribe('sub2', vi.fn());
      
      const actualWebSocket = sockets[sockets.length - 1];
      
      detectionEventService.disconnect();

      // Assert
      expect(actualWebSocket.close).toHaveBeenCalled();
      expect(detectionEventService.isConnected()).toBe(false);
    });
  });
});
